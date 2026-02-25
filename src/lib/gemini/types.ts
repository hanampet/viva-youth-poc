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
  onAudioData?: (audioData: string) => void;
  onTextContent?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onThinkingComplete?: () => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onSetupComplete?: () => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}
