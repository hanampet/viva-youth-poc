import type {
  GeminiClientOptions,
  GeminiSetupMessage,
  GeminiServerContent,
} from './types';

const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const DEFAULT_MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025'; // gemini-2.5-flash-native-audio-preview-09-2025, gemini-2.5-flash-native-audio-preview-12-2025
const DEFAULT_VOICE = 'Zephyr';

export interface RestoreContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  resumePrompt: string;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private options: GeminiClientOptions;
  private isSetupComplete = false;
  private resolveConnect: (() => void) | null = null;
  private pendingRestore: RestoreContext | null = null;
  private hasReceivedAudioThisTurn = false;

  constructor(options: GeminiClientOptions) {
    this.options = options;
  }

  setRestoreContext(context: RestoreContext): void {
    this.pendingRestore = context;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_WS_URL}?key=${this.options.apiKey}`;

      console.log('[Gemini] Connecting to:', url.replace(this.options.apiKey, '***'));
      this.resolveConnect = resolve;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[Gemini] WebSocket connected, sending setup...');
          this.sendSetup();
        };

        this.ws.onmessage = async (event) => {
          // Handle both string and Blob data
          let data: string;
          if (event.data instanceof Blob) {
            data = await event.data.text();
          } else {
            data = event.data;
          }

          this.handleMessage(data);
        };

        this.ws.onerror = (error) => {
          console.error('[Gemini] WebSocket error:', error);
          this.options.onError?.(new Error('WebSocket error'));
          this.options.onConnectionChange?.(false);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[Gemini] WebSocket closed:', event.code, event.reason);
          this.isSetupComplete = false;
          this.options.onConnectionChange?.(false);
        };
      } catch (error) {
        console.error('[Gemini] Connection failed:', error);
        reject(error);
      }
    });
  }

  private sendSetup(): void {
    const vadConfig = this.options.vadConfig;

    const setupMessage: GeminiSetupMessage = {
      setup: {
        model: this.options.model || DEFAULT_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          thinkingConfig: {
            thinkingBudget: 0,
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.options.voiceName || DEFAULT_VOICE,
              },
            },
          },
        },
        // VAD configuration
        ...(vadConfig && {
          realtimeInputConfig: {
            automaticActivityDetection: {
              ...(vadConfig.startOfSpeechSensitivity && vadConfig.startOfSpeechSensitivity !== 'UNSPECIFIED' && {
                startOfSpeechSensitivity: `START_SENSITIVITY_${vadConfig.startOfSpeechSensitivity}`,
              }),
              ...(vadConfig.endOfSpeechSensitivity && vadConfig.endOfSpeechSensitivity !== 'UNSPECIFIED' && {
                endOfSpeechSensitivity: `END_SENSITIVITY_${vadConfig.endOfSpeechSensitivity}`,
              }),
              ...(vadConfig.silenceDurationMs && {
                silenceDurationMs: vadConfig.silenceDurationMs,
              }),
              ...(vadConfig.prefixPaddingMs && {
                prefixPaddingMs: vadConfig.prefixPaddingMs,
              }),
            },
          },
        }),
        // Enable audio transcript output (AI 음성의 텍스트)
        outputAudioTranscription: {},
        // Enable input audio transcription (사용자 음성의 텍스트)
        inputAudioTranscription: {},
        ...(this.options.systemPrompt && {
          systemInstruction: {
            parts: [{ text: this.options.systemPrompt }],
          },
        }),
      },
    };

    console.log('[Gemini] Setup message:', JSON.stringify(setupMessage, null, 2));
    this.send(setupMessage);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // 모든 서버 메시지 로그 (디버깅용)
      console.log('[Gemini] Server message:', JSON.stringify(message).slice(0, 500));

      // Check for setup complete
      if ('setupComplete' in message) {
        console.log('[Gemini] Setup complete!');
        this.isSetupComplete = true;
        this.options.onSetupComplete?.();
        this.options.onConnectionChange?.(true);

        // 컨텍스트 복원이 있으면 실행
        if (this.pendingRestore) {
          console.log('[Gemini] Restoring context with', this.pendingRestore.messages.length, 'messages');
          this.restoreContext(this.pendingRestore);
          this.pendingRestore = null;
        }

        if (this.resolveConnect) {
          this.resolveConnect();
          this.resolveConnect = null;
        }
        return;
      }

      // Handle server content
      const serverContent = message as GeminiServerContent;

      if (serverContent.serverContent) {
        const { modelTurn, outputTranscription, inputTranscription, turnComplete, interrupted } = serverContent.serverContent;

        // Handle interrupted (사용자가 AI를 끊었을 때)
        if (interrupted) {
          this.options.onInterrupted?.();
        }

        // Handle audio data and thinking from modelTurn
        if (modelTurn?.parts) {
          for (const part of modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              // 첫 오디오 청크 수신 시 thinking 완료 알림
              if (!this.hasReceivedAudioThisTurn) {
                console.log('[Gemini] First audio chunk received, calling onThinkingComplete');
                this.hasReceivedAudioThisTurn = true;
                this.options.onThinkingComplete?.();
              }
              this.options.onAudioData?.(part.inlineData.data);
            }
            // Capture thinking text
            if (part.text) {
              console.log('[Gemini] Thinking text received');
              this.options.onThinking?.(part.text);
            }
          }
        }

        // Handle transcript of AI's spoken audio
        if (outputTranscription?.text) {
          this.options.onTextContent?.(outputTranscription.text);
        }

        // Handle transcript of user's spoken audio (사용자 음성 텍스트)
        if (inputTranscription) {
          console.log('[Gemini] inputTranscription:', JSON.stringify(inputTranscription));
        }
        if (inputTranscription?.text) {
          this.options.onInputTranscription?.(inputTranscription.text);
        }

        if (turnComplete) {
          this.hasReceivedAudioThisTurn = false;  // 다음 턴을 위해 리셋
          this.options.onTurnComplete?.();
        }
      }
    } catch (error) {
      console.error('[Gemini] Failed to parse message:', error, data);
    }
  }

  private audioSendCount = 0;

  sendAudio(base64Audio: string): void {
    if (!this.isSetupComplete || !this.ws) {
      console.warn('[Gemini] Cannot send audio - setup:', this.isSetupComplete, 'ws:', !!this.ws);
      return;
    }

    this.audioSendCount++;
    // 100개마다 로그 (너무 많은 로그 방지)
    if (this.audioSendCount % 100 === 0) {
      console.log('[Gemini] Audio chunks sent:', this.audioSendCount);
    }

    const message = {
      realtimeInput: {
        audio: {
          data: base64Audio,
          mimeType: 'audio/pcm;rate=16000',
        },
      },
    };

    this.send(message);
  }

  sendText(text: string): void {
    if (!this.isSetupComplete || !this.ws) return;

    console.log('[Gemini] Sending text:', text);
    const message = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.send(message);
  }

  private restoreContext(context: RestoreContext): void {
    if (!this.isSetupComplete || !this.ws) return;

    // 이전 대화를 Gemini 형식으로 변환
    const turns = context.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 재개 프롬프트 추가
    turns.push({
      role: 'user',
      parts: [{ text: context.resumePrompt }],
    });

    console.log('[Gemini] Restoring context:', turns.length, 'turns');

    const message = {
      clientContent: {
        turns,
        turnComplete: true,
      },
    };

    this.send(message);
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[Gemini] Cannot send, WebSocket not open. State:', this.ws?.readyState);
    }
  }

  disconnect(): void {
    console.log('[Gemini] Disconnecting...');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isSetupComplete = false;
    }
  }

  get connected(): boolean {
    return this.isSetupComplete && this.ws?.readyState === WebSocket.OPEN;
  }
}
