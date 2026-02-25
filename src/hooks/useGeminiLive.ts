import { useCallback, useRef, useEffect } from 'react';
import { GeminiLiveClient, type RestoreContext } from '../lib/gemini/client';
import { AudioCapture } from '../lib/audio/capture';
import { AudioPlayback } from '../lib/audio/playback';
import { BrowserSpeechRecognition } from '../lib/audio/speechRecognition';
import { useSession } from '../contexts/SessionContext';
import { useSessionAnalyzer } from './useSessionAnalyzer';
import { SYSTEM_PROMPT } from '../constants/systemPrompts';

export interface ConnectOptions {
  restoreContext?: RestoreContext;
  sessionHandle?: string;  // 세션 복원용 핸들
}

export function useGeminiLive() {
  const {
    setConnectionStatus,
    setOrbState,
    setVolume,
    addMessage,
    updateMessageById,
    setInterimTranscript,
    addLog,
    connectionStatus,
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
  const sessionHandleRef = useRef<string | null>(null);  // 세션 토큰 저장

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

    // 연결 시작 전 스트리밍 상태 리셋
    streamingMessageIdRef.current = null;
    thinkingRef.current = '';

    try {
      // Initialize playback
      playbackRef.current = new AudioPlayback({
        onPlaybackStart: () => {
          setOrbState('speaking');
          addLog('AUDIO', 'AI speaking...');
        },
        onPlaybackEnd: () => {
          setOrbState('listening');
          addLog('AUDIO', 'AI finished speaking');
        },
        onVolumeChange: (volume) => {
          setVolume(volume);
        },
      });
      await playbackRef.current.init();

      // Initialize Gemini client with NO_INTERRUPTION mode
      clientRef.current = new GeminiLiveClient({
        apiKey,
        systemPrompt: SYSTEM_PROMPT,
        sessionHandle: options?.sessionHandle,  // 세션 복원용
        onAudioData: (audioData) => {
          playbackRef.current?.playBase64Audio(audioData);
        },
        onTextContent: (text) => {
          if (!streamingMessageIdRef.current) {
            // 새 스트리밍 시작 - 메시지 생성하고 ID 저장
            const id = addMessage('assistant', text, true);
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
          // Thinking 완료 시점 (첫 오디오 청크 수신)에 분석 시작
          const thinking = thinkingRef.current;
          thinkingRef.current = '';
          analyzeRef.current(thinking);
        },
        onTurnComplete: () => {
          streamingMessageIdRef.current = null;
          addLog('GEMINI', 'Turn complete');
        },
        onInterrupted: () => {
          // 사용자 인터럽트 감지 - AI 응답 중단됨
          // 현재 스트리밍 중인 메시지에 "..." 추가하고 완료 처리
          if (streamingMessageIdRef.current) {
            updateMessageById(streamingMessageIdRef.current, '...');
            streamingMessageIdRef.current = null;
            addLog('GEMINI', 'AI interrupted by user');
          }
        },
        onSessionUpdate: (handle) => {
          // 세션 토큰 저장 (재연결 시 사용)
          sessionHandleRef.current = handle;
          console.log('[Session] Handle updated:', handle.slice(0, 20) + '...');
        },
        onSetupComplete: () => {
          const setupCompleteTime = performance.now();
          addLog('GEMINI', `Setup complete (${((setupCompleteTime - connectStartTime) / 1000).toFixed(2)}s)`);

          // AI가 먼저 말하기 시작하도록 트리거 (컨텍스트 복원이 아닌 경우에만)
          if (!options?.restoreContext && !options?.sessionHandle) {
            setTimeout(() => {
              if (clientRef.current?.connected) {
                clientRef.current.sendText('[세션 시작] 내담자가 XR 힐링룸에 입장하여 편안한 의자에 착석했습니다. 1단계(맞이)를 시작해주세요.');
                addLog('SYSTEM', 'AI 대화 시작 트리거');
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

      // Initialize audio capture (항상 Gemini에 전송 - NO_INTERRUPTION 모드)
      captureRef.current = new AudioCapture({
        onAudioData: (base64Audio) => {
          clientRef.current?.sendAudio(base64Audio);
        },
        onVolumeChange: (volume) => {
          if (!playbackRef.current?.playing) {
            setVolume(volume);
          }
        },
        onError: (error) => {
          addLog('ERROR', `Audio capture error: ${error.message}`);
        },
      });

      await captureRef.current.start();
      const micStartTime = performance.now();
      addLog('AUDIO', `Microphone started (total: ${((micStartTime - connectStartTime) / 1000).toFixed(2)}s)`);

      // Initialize speech recognition (for displaying user's speech)
      speechRecognitionRef.current = new BrowserSpeechRecognition({
        language: 'ko-KR',
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            // Final transcript - add as user message
            addMessage('user', transcript);
            setInterimTranscript('');
            addLog('AUDIO', `User said: ${transcript}`);

            // 사용자 발화 시 AI 오디오 정지 (텍스트는 계속 완성됨)
            if (playbackRef.current?.playing) {
              playbackRef.current.stop();
              addLog('AUDIO', 'AI audio stopped (user spoke)');
            }
          } else {
            // Interim transcript - show in real-time
            setInterimTranscript(transcript);
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
    addMessage,
    updateMessageById,
    setInterimTranscript,
    addLog,
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

  // 현재 세션 핸들 가져오기 (재연결 시 사용)
  const getSessionHandle = useCallback(() => {
    return sessionHandleRef.current;
  }, []);

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
    getSessionHandle,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
  };
}
