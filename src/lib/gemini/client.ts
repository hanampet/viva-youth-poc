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

      this.resolveConnect = resolve;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
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

        this.ws.onclose = () => {
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
            thinkingBudget: -1,
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

    this.send(setupMessage);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Check for setup complete
      if ('setupComplete' in message) {
        console.log('[Gemini] Setup complete, pendingRestore:', !!this.pendingRestore);
        this.isSetupComplete = true;
        this.options.onSetupComplete?.();
        this.options.onConnectionChange?.(true);

        // 컨텍스트 복원이 있으면 실행
        if (this.pendingRestore) {
          console.log('[Gemini] Calling restoreContext...');
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
                this.hasReceivedAudioThisTurn = true;
                this.options.onThinkingComplete?.();
              }
              this.options.onAudioData?.(part.inlineData.data);
            }
            // Capture thinking text
            if (part.text) {
              this.options.onThinking?.(part.text);
            }
          }
        }

        // Handle transcript of AI's spoken audio
        if (outputTranscription?.text) {
          this.options.onTextContent?.(outputTranscription.text);
        }

        // Handle transcript of user's spoken audio (사용자 음성 텍스트)
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

  sendAudio(base64Audio: string): void {
    if (!this.isSetupComplete || !this.ws) {
      return;
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

  private restoreContext(_context: RestoreContext): void {
    if (!this.isSetupComplete || !this.ws) {
      console.warn('[Gemini] restoreContext: not ready', { isSetupComplete: this.isSetupComplete, ws: !!this.ws });
      return;
    }

    // 짧은 메시지 (긴 프롬프트는 빈 응답 반환)
    console.log('[Gemini] Sending short resume trigger');
    this.sendText('영상 다 봤어요. 마무리 인사해주세요.');
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
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
