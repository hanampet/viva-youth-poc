export interface SpeechRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  language?: string;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

export class BrowserSpeechRecognition {
  private recognition: SpeechRecognition | null = null;
  private options: SpeechRecognitionOptions;
  private isRunning = false;
  private shouldRestart = false;

  constructor(options: SpeechRecognitionOptions) {
    this.options = options;
  }

  start(): boolean {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.error('Speech Recognition not supported');
      this.options.onError?.('Speech Recognition not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.options.language || 'ko-KR';

    this.recognition.onstart = () => {
      console.log('[STT] Started');
      this.isRunning = true;
      this.options.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.options.onResult(finalTranscript, true);
      } else if (interimTranscript) {
        this.options.onResult(interimTranscript, false);
      }
    };

    this.recognition.onend = () => {
      console.log('[STT] Ended');
      this.isRunning = false;

      // Auto-restart if should continue
      if (this.shouldRestart) {
        console.log('[STT] Restarting...');
        setTimeout(() => {
          if (this.shouldRestart) {
            this.recognition?.start();
          }
        }, 100);
      } else {
        this.options.onEnd?.();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[STT] Error:', event.error);
      // Don't report "no-speech" as error, just restart
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.options.onError?.(event.error);
      }
    };

    this.shouldRestart = true;
    this.recognition.start();
    return true;
  }

  stop(): void {
    this.shouldRestart = false;
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.isRunning = false;
  }

  get running(): boolean {
    return this.isRunning;
  }
}
