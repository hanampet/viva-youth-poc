import { useCallback, useRef, useEffect } from 'react';
import { GeminiLiveClient, type RestoreContext } from '../lib/gemini/client';
import { AudioCapture } from '../lib/audio/capture';
import { AudioPlayback } from '../lib/audio/playback';
import { useSession, type VADSensitivityLevel } from '../contexts/SessionContext';
import { useSessionAnalyzer } from './useSessionAnalyzer';
import { waitForMonitorCleanup } from './useMicrophoneMonitor';
import { SCENARIOS } from '../constants/systemPrompts';
import type { VADConfig } from '../lib/gemini/types';

function getVADConfig(level: VADSensitivityLevel): VADConfig {
  // low: 소음에 강함 (시작 감지만 둔감, 종료는 빠르게)
  // high: 민감 (빠른 반응, 짧은 멈춤도 발화 종료)
  if (level === 'low') {
    return {
      startOfSpeechSensitivity: 'LOW',        // 소음에 안 반응
      endOfSpeechSensitivity: 'UNSPECIFIED',  // 종료는 기본값
      silenceDurationMs: 500,                  // 0.5초 무음 후 응답
    };
  }

  if (level === 'high') {
    return {
      startOfSpeechSensitivity: 'HIGH',
      endOfSpeechSensitivity: 'HIGH',
      silenceDurationMs: 200,
    };
  }

  // default: 서버 기본값 사용
  return {};
}

export interface ConnectOptions {
  restoreContext?: RestoreContext;
}

export function useGeminiLive() {
  const {
    setConnectionStatus,
    setOrbState,
    setVolume,
    setMicrophoneVolume,
    addMessage,
    updateMessageById,
    setInterimTranscript,
    addLog,
    connectionStatus,
    vadSensitivity,
    selectedMicrophoneId,
    scenario,
  } = useSession();

  const { analyze } = useSessionAnalyzer();
  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const thinkingRef = useRef<string>('');
  const isInterruptedRef = useRef(false);  // 인터럽트 상태 (오디오 무시용)
  const userSpeechStartTimeRef = useRef<Date | null>(null);  // 사용자 발화 시작 시점
  const aiResponseStartTimeRef = useRef<Date | null>(null);  // AI 응답 시작 시점
  const pendingUserTranscriptRef = useRef<string>('');  // 아직 확정되지 않은 사용자 텍스트
  const aiResponseTextRef = useRef<string>('');  // AI 응답 텍스트 누적 (로그용)

  const connect = useCallback(async (options?: ConnectOptions) => {
    // 이미 연결 중이거나 연결된 상태면 무시
    if (clientRef.current) {
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      addLog('ERROR', 'Gemini API key not found. Set VITE_GEMINI_API_KEY in .env');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    const connectStartTime = performance.now();
    addLog('SYSTEM', options?.restoreContext
      ? 'Reconnecting with context restoration...'
      : 'Connecting to Gemini Live API...');

    // VAD 설정 로그
    const vadConfig = getVADConfig(vadSensitivity);
    const silenceStr = vadConfig.silenceDurationMs ? `${vadConfig.silenceDurationMs}ms` : 'default';
    addLog('SYSTEM', `VAD: ${vadSensitivity} (silence: ${silenceStr})`);
    addLog('SYSTEM', `Scenario: ${SCENARIOS[scenario].name}`);

    // 연결 시작 전 스트리밍 상태 리셋
    streamingMessageIdRef.current = null;
    thinkingRef.current = '';

    try {
      // Initialize playback
      playbackRef.current = new AudioPlayback({
        onPlaybackStart: () => {
          setOrbState('speaking');
          addLog('GEMINI', 'AI speaking started');
        },
        onPlaybackEnd: () => {
          setOrbState('listening');
          addLog('GEMINI', 'AI speaking ended');
        },
        onVolumeChange: (volume) => {
          setVolume(volume);
        },
      });
      await playbackRef.current.init();

      // Initialize Gemini client
      clientRef.current = new GeminiLiveClient({
        apiKey,
        systemPrompt: SCENARIOS[scenario].prompt,
        vadConfig,
        onAudioData: (audioData) => {
          // 인터럽트 상태면 오디오 무시
          if (isInterruptedRef.current) {
            return;
          }
          playbackRef.current?.playBase64Audio(audioData);
        },
        onTextContent: (text) => {
          // AI 응답 텍스트 누적 (로그용)
          aiResponseTextRef.current += text;

          if (!streamingMessageIdRef.current) {
            // 새 스트리밍 시작 - 메시지 생성하고 ID 저장 (AI 응답 시작 시점 타임스탬프 사용)
            const responseStartTime = aiResponseStartTimeRef.current || new Date();
            const id = addMessage('assistant', text, true, responseStartTime);
            streamingMessageIdRef.current = id;
          } else {
            // 기존 메시지에 텍스트 추가 (ID로 찾아서 업데이트)
            updateMessageById(streamingMessageIdRef.current, text);
          }
        },
        onThinking: (thinking) => {
          thinkingRef.current += thinking;
        },
        onThinkingComplete: () => {
          // Thinking 완료 시점 (첫 오디오 청크 수신) = AI 응답 시작 시점
          aiResponseStartTimeRef.current = new Date();

          // 새로운 AI 응답이므로 인터럽트 플래그 리셋 (새 오디오 재생 허용)
          isInterruptedRef.current = false;

          // 사용자 발화 텍스트 확정 (AI가 응답을 시작했으므로 사용자 발화 완료)
          if (pendingUserTranscriptRef.current.trim()) {
            const speechStartTime = userSpeechStartTimeRef.current || new Date();
            addMessage('user', pendingUserTranscriptRef.current.trim(), false, speechStartTime);
            addLog('AUDIO', `User said: ${pendingUserTranscriptRef.current.trim()}`);
          }
          pendingUserTranscriptRef.current = '';
          userSpeechStartTimeRef.current = null;
          setInterimTranscript('');

          // Thinking 내용 저장 (onTurnComplete에서 분석에 사용)
          // thinkingRef는 리셋하지 않음 - onTurnComplete에서 사용 후 리셋
          console.log('[Thinking]', thinkingRef.current || '(empty)');
        },
        onTurnComplete: () => {
          // AI 응답 완료 로그 (완성된 문장)
          const aiResponse = aiResponseTextRef.current.trim();
          if (aiResponse) {
            addLog('GEMINI', `AI: ${aiResponse}`);
          }

          // Session analyzer - AI 응답 완료 후 분석 (thinking + AI 응답 포함)
          const thinking = thinkingRef.current;
          thinkingRef.current = '';  // 리셋
          console.log('[TurnComplete] Analyzing with AI response:', aiResponse.slice(0, 100));
          analyzeRef.current(thinking, aiResponse);

          aiResponseTextRef.current = '';  // 리셋
          streamingMessageIdRef.current = null;
          aiResponseStartTimeRef.current = null;  // AI 응답 시작 시점 리셋
          isInterruptedRef.current = false;  // 인터럽트 상태 리셋
        },
        onInterrupted: () => {
          // 사용자 인터럽트 감지 - AI 응답 중단됨
          isInterruptedRef.current = true;  // 이후 오디오 무시
          // 현재 스트리밍 중인 메시지에 "..." 추가하고 완료 처리
          if (streamingMessageIdRef.current) {
            updateMessageById(streamingMessageIdRef.current, '...');
            streamingMessageIdRef.current = null;
            addLog('GEMINI', 'AI interrupted by user');
          }
        },
        onSetupComplete: () => {
          const setupCompleteTime = performance.now();
          addLog('GEMINI', `Setup complete (${((setupCompleteTime - connectStartTime) / 1000).toFixed(2)}s)`);

          // AI가 먼저 말하기 시작하도록 트리거 (컨텍스트 복원이 아닌 경우에만)
          if (!options?.restoreContext) {
            setTimeout(() => {
              if (clientRef.current?.connected) {
                clientRef.current.sendText(SCENARIOS[scenario].startMessage);
              }
            }, 100);
          }
        },
        onConnectionChange: (connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
          if (connected) {
            addLog('SYSTEM', 'Connected to Gemini Live API');
            setOrbState('listening');
          } else {
            // 연결 끊김 시 스트리밍 상태 리셋
            streamingMessageIdRef.current = null;
            thinkingRef.current = '';
            setOrbState('idle');
          }
        },
        onInputTranscription: (text) => {
          // Gemini가 인식한 사용자 음성 텍스트 (청크 단위로 옴 - 누적 필요)
          // 텍스트 누적 (청크 단위로 오므로 이어붙이기)
          pendingUserTranscriptRef.current += text;
          setInterimTranscript(pendingUserTranscriptRef.current);

          // 첫 텍스트일 때 발화 시작 시점 기록
          if (!userSpeechStartTimeRef.current) {
            userSpeechStartTimeRef.current = new Date();
          }

          // 사용자가 말하기 시작하면 AI 오디오 정지 (하지만 다음 응답은 재생되어야 함)
          if (playbackRef.current?.playing) {
            playbackRef.current.stop();
            // 주의: isInterruptedRef는 현재 턴의 남은 오디오만 무시하기 위함
            // onThinkingComplete에서 리셋됨
            isInterruptedRef.current = true;
          }
        },
        onError: (error) => {
          addLog('ERROR', `Gemini error: ${error.message}`);
          setConnectionStatus('error');
        },
      });

      // 컨텍스트 복원이 필요하면 설정
      if (options?.restoreContext) {
        clientRef.current.setRestoreContext(options.restoreContext);
      }

      await clientRef.current.connect();

      // 마이크 모니터링이 완전히 종료될 때까지 대기
      await waitForMonitorCleanup();

      // Initialize audio capture
      captureRef.current = new AudioCapture({
        onAudioData: (base64Audio) => {
          clientRef.current?.sendAudio(base64Audio);
        },
        onVolumeChange: (volume) => {
          // 마이크 입력 볼륨은 항상 업데이트 (AI 출력과 분리)
          setMicrophoneVolume(volume);
          // AI가 말하지 않을 때만 메인 볼륨 업데이트
          if (!playbackRef.current?.playing) {
            setVolume(volume);
          }
        },
        onError: (error) => {
          addLog('ERROR', `Audio capture error: ${error.message}`);
        },
        deviceId: selectedMicrophoneId || undefined,
      });

      // 선택된 마이크 로그
      if (selectedMicrophoneId) {
        addLog('AUDIO', `Using selected microphone: ${selectedMicrophoneId.slice(0, 8)}...`);
      }

      await captureRef.current.start();
      const micStartTime = performance.now();
      addLog('AUDIO', `Microphone started (total: ${((micStartTime - connectStartTime) / 1000).toFixed(2)}s)`);
      addLog('AUDIO', 'Using Gemini input transcription (same microphone stream)');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addLog('ERROR', `Connection failed: ${message}`);
      setConnectionStatus('error');
    }
  }, [
    setConnectionStatus,
    setOrbState,
    setVolume,
    setMicrophoneVolume,
    addMessage,
    updateMessageById,
    setInterimTranscript,
    addLog,
    vadSensitivity,
    selectedMicrophoneId,
    scenario,
  ]);

  const disconnect = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;

    playbackRef.current?.close();
    playbackRef.current = null;

    clientRef.current?.disconnect();
    clientRef.current = null;

    // 모든 상태 리셋
    streamingMessageIdRef.current = null;
    thinkingRef.current = '';
    isInterruptedRef.current = false;
    userSpeechStartTimeRef.current = null;
    aiResponseStartTimeRef.current = null;
    pendingUserTranscriptRef.current = '';
    aiResponseTextRef.current = '';

    setInterimTranscript('');
    setConnectionStatus('disconnected');
    setOrbState('idle');
    setVolume(0);
  }, [setConnectionStatus, setOrbState, setVolume, setInterimTranscript]);

  const sendText = useCallback((text: string) => {
    if (clientRef.current?.connected) {
      addMessage('user', text);
      clientRef.current.sendText(text);
      addLog('GEMINI', `Sent text: ${text}`);
    }
  }, [addMessage, addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      captureRef.current?.stop();
      playbackRef.current?.close();
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    sendText,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}
