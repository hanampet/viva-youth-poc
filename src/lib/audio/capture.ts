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
  private audioBuffer: string[] = []; // muted 동안 음성 버퍼

  constructor(options: AudioCaptureOptions) {
    this.options = options;
  }

  mute(): void {
    this.isMuted = true;
    this.audioBuffer = []; // 버퍼 초기화
  }

  unmute(): void {
    // 버퍼에 쌓인 음성을 실시간처럼 스트리밍 전송 (barge-in 감지를 위해)
    const bufferLength = this.audioBuffer.length;
    if (bufferLength > 0) {
      console.log(`[AudioCapture] Streaming ${bufferLength} buffered chunks...`);
      const buffer = [...this.audioBuffer];
      this.audioBuffer = [];

      // 청크 간격: AudioWorklet이 약 100ms마다 청크를 보내므로 비슷하게 맞춤
      // 단, 너무 느리면 지연이 커지므로 20ms 간격으로 빠르게 전송
      let index = 0;
      const sendNext = () => {
        if (index < buffer.length) {
          this.options.onAudioData(buffer[index]);
          index++;
          setTimeout(sendNext, 20); // 20ms 간격
        } else {
          console.log(`[AudioCapture] Buffer streaming complete: ${bufferLength} chunks`);
        }
      };
      sendNext();
    }
    this.isMuted = false;
  }

  clearBuffer(): void {
    this.audioBuffer = [];
  }

  get muted(): boolean {
    return this.isMuted;
  }

  get bufferSize(): number {
    return this.audioBuffer.length;
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

        if (audioData) {
          const base64 = this.float32ToBase64PCM(audioData);
          if (this.isMuted) {
            // muted 상태: 버퍼에 저장
            this.audioBuffer.push(base64);
          } else {
            // unmuted 상태: 즉시 전송
            this.options.onAudioData(base64);
          }
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
