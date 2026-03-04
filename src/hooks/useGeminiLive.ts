import { useCallback, useRef, useEffect } from 'react';
import { GeminiLiveClient, type RestoreContext } from '../lib/gemini/client';
import { AudioCapture } from '../lib/audio/capture';
import { AudioPlayback } from '../lib/audio/playback';
import { BrowserSpeechRecognition } from '../lib/audio/speechRecognition';
import { useSession, type VADSensitivityLevel } from '../contexts/SessionContext';
import { useSessionAnalyzer } from './useSessionAnalyzer';
import { waitForMonitorCleanup } from './useMicrophoneMonitor';
import { SYSTEM_PROMPT } from '../constants/systemPrompts';
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
  } = useSession();

  const { analyze } = useSessionAnalyzer();
  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const thinkingRef = useRef<string>('');
  const isInterruptedRef = useRef(false);  // 인터럽트 상태 (오디오 무시용)
  const userSpeechStartTimeRef = useRef<Date | null>(null);  // 사용자 발화 시작 시점
  const aiResponseStartTimeRef = useRef<Date | null>(null);  // AI 응답 시작 시점

  const connect = useCallback(async (options?: ConnectOptions) => {
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

    // 연결 시작 전 스트리밍 상태 리셋
    streamingMessageIdRef.current = null;
    thinkingRef.current = '';

    try {
      // Initialize playback
      playbackRef.current = new AudioPlayback({
        onPlaybackStart: () => {
          setOrbState('speaking');
        },
        onPlaybackEnd: () => {
          setOrbState('listening');
        },
        onVolumeChange: (volume) => {
          setVolume(volume);
        },
      });
      await playbackRef.current.init();

      // Initialize Gemini client
      clientRef.current = new GeminiLiveClient({
        apiKey,
        systemPrompt: SYSTEM_PROMPT,
        vadConfig,
        onAudioData: (audioData) => {
          // 인터럽트 상태면 오디오 무시
          if (isInterruptedRef.current) return;
          playbackRef.current?.playBase64Audio(audioData);
        },
        onTextContent: (text) => {
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
          const thinking = thinkingRef.current;
          thinkingRef.current = '';
          analyzeRef.current(thinking);
        },
        onTurnComplete: () => {
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
                clientRef.current.sendText('[세션 시작] 내담자가 XR 힐링룸에 입장하여 편안한 의자에 착석했습니다. 1단계(맞이)를 시작해주세요.');
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

      // Initialize speech recognition (for displaying user's speech)
      speechRecognitionRef.current = new BrowserSpeechRecognition({
        language: 'ko-KR',
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            // Final transcript - add as user message (발화 시작 시점 타임스탬프 사용)
            const speechStartTime = userSpeechStartTimeRef.current || new Date();
            addMessage('user', transcript, false, speechStartTime);
            setInterimTranscript('');
            userSpeechStartTimeRef.current = null;  // 리셋
            addLog('AUDIO', `User said: ${transcript}`);
          } else {
            // Interim transcript - show in real-time
            setInterimTranscript(transcript);
            // 첫 interim일 때 발화 시작 시점 기록
            if (!userSpeechStartTimeRef.current) {
              userSpeechStartTimeRef.current = new Date();
            }
            // 사용자가 말하기 시작하면 AI 오디오 즉시 정지 + 이후 오디오 무시
            if (playbackRef.current?.playing) {
              isInterruptedRef.current = true;  // 이후 도착하는 오디오 무시
              playbackRef.current.stop();
            }
          }
        },
        onStart: () => {},
        onEnd: () => {},
        onError: (error) => {
          addLog('WARNING', `Speech recognition error: ${error}`);
        },
      });

      speechRecognitionRef.current.start();

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
  ]);

  const disconnect = useCallback(() => {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;

    captureRef.current?.stop();
    captureRef.current = null;

    playbackRef.current?.close();
    playbackRef.current = null;

    clientRef.current?.disconnect();
    clientRef.current = null;

    streamingMessageIdRef.current = null;
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
      speechRecognitionRef.current?.stop();
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
