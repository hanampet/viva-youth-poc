export interface GeminiSetupMessage {
  setup: {
    model: string;
    generationConfig: {
      responseModalities: string[];
      speechConfig?: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: string;
          };
        };
      };
    };
    realtimeInputConfig?: {
      activityHandling: 'NO_INTERRUPTION' | 'START_OF_ACTIVITY_INTERRUPTS';
      automaticActivityDetection?: {
        disabled?: boolean;
        startOfSpeechSensitivity?: 'START_SENSITIVITY_LOW' | 'START_SENSITIVITY_HIGH';
        endOfSpeechSensitivity?: 'END_SENSITIVITY_LOW' | 'END_SENSITIVITY_HIGH';
        prefixPaddingMs?: number;
        silenceDurationMs?: number;
      };
    };
    sessionResumption?: {
      handle?: string;
    };
    outputAudioTranscription?: Record<string, never>;
    systemInstruction?: {
      parts: Array<{ text: string }>;
    };
  };
}

export interface GeminiRealtimeInput {
  realtimeInput: {
    audio: {
      data: string;
      mimeType: string;
    };
  };
}

export interface GeminiClientContent {
  clientContent: {
    turns: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    turnComplete: boolean;
  };
}

export interface GeminiServerContent {
  serverContent?: {
    modelTurn?: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    outputTranscription?: {
      text: string;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  sessionResumptionUpdate?: {
    newHandle: string;
    resumable: boolean;
  };
}

export interface GeminiSetupComplete {
  setupComplete: object;
}

export type GeminiMessage =
  | GeminiSetupMessage
  | GeminiRealtimeInput
  | GeminiClientContent
  | GeminiServerContent
  | GeminiSetupComplete;

export interface GeminiClientOptions {
  apiKey: string;
  model?: string;
  voiceName?: string;
  systemPrompt?: string;
  sessionHandle?: string;  // 세션 복원용 핸들
  onAudioData?: (audioData: string) => void;
  onTextContent?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onThinkingComplete?: () => void;  // 첫 오디오 청크 수신 시 (thinking 완료)
  onTurnComplete?: () => void;
  onInterrupted?: () => void;  // 사용자 인터럽트 감지 시
  onSessionUpdate?: (handle: string) => void;  // 세션 토큰 업데이트 시
  onSetupComplete?: () => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}
