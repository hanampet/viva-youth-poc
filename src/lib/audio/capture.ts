export interface AudioCaptureOptions {
  onAudioData: (base64Audio: string) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
  deviceId?: string;  // 특정 마이크 선택 (빈 문자열이면 시스템 기본값)
}

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private options: AudioCaptureOptions;
  private isRunning = false;

  constructor(options: AudioCaptureOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    try {
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      };

      // 특정 마이크가 선택된 경우 deviceId 설정
      if (this.options.deviceId) {
        audioConstraints.deviceId = { exact: this.options.deviceId };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });

      await this.audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.workletNode.port.onmessage = (event) => {
        const { audioData, volume } = event.data;

        if (audioData) {
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
