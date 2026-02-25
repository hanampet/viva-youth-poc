export interface AudioCaptureOptions {
  onAudioData: (base64Audio: string) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private options: AudioCaptureOptions;
  private isRunning = false;
  private isMuted = false;

  constructor(options: AudioCaptureOptions) {
    this.options = options;
  }

  mute(): void {
    this.isMuted = true;
  }

  unmute(): void {
    this.isMuted = false;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  async start(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });

      await this.audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.workletNode.port.onmessage = (event) => {
        const { audioData, volume } = event.data;

        // muted 상태에서는 Gemini에 오디오 전송 안 함
        if (audioData && !this.isMuted) {
          const base64 = this.float32ToBase64PCM(audioData);
          this.options.onAudioData(base64);
        }

        if (volume !== undefined) {
          this.options.onVolumeChange?.(volume);
        }
      };

      source.connect(this.workletNode);
      this.isRunning = true;
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('Audio capture failed'));
      throw error;
    }
  }

  private float32ToBase64PCM(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isRunning = false;
  }

  get running(): boolean {
    return this.isRunning;
  }
}
