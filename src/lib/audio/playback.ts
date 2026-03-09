export interface AudioPlaybackOptions {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private options: AudioPlaybackOptions;
  private isPlaying = false;
  private scheduledEndTime = 0;
  private volumeCheckInterval: number | null = null;
  private pendingBuffers: Float32Array[] = [];
  private bufferThreshold = 9; // Start playing after this many chunks
  private hasStartedPlaying = false;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor(options: AudioPlaybackOptions = {}) {
    this.options = options;
  }

  async init(): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  async playBase64Audio(base64Audio: string): Promise<void> {
    if (!this.audioContext || !this.analyser || !this.gainNode) {
      await this.init();
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    const float32Data = this.base64ToFloat32(base64Audio);
    if (!float32Data) return;

    // Add to pending buffers
    this.pendingBuffers.push(float32Data);

    // Start playing after buffering enough data
    if (!this.hasStartedPlaying && this.pendingBuffers.length >= this.bufferThreshold) {
      this.hasStartedPlaying = true;
      this.flushPendingBuffers();
    } else if (this.hasStartedPlaying) {
      // Already playing, schedule immediately
      this.scheduleBuffer(float32Data);
      this.pendingBuffers = [];
    }
  }

  private flushPendingBuffers(): void {
    // Combine all pending buffers into one for smoother playback
    const totalLength = this.pendingBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of this.pendingBuffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }
    this.pendingBuffers = [];
    this.scheduleBuffer(combined);
  }

  private base64ToFloat32(base64: string): Float32Array | null {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      return float32Array;
    } catch (error) {
      console.error('Failed to decode audio:', error);
      return null;
    }
  }

  private scheduleBuffer(float32Data: Float32Array): void {
    if (!this.audioContext || !this.gainNode) return;

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.copyToChannel(new Float32Array(float32Data), 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    // Track active source for stopping
    this.activeSources.push(source);

    // Schedule playback at the end of previous audio
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.scheduledEndTime);

    source.start(startTime);
    this.scheduledEndTime = startTime + audioBuffer.duration;

    // Track playback state
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.options.onPlaybackStart?.();
      this.startVolumeMonitor();
    }

    // Check when playback ends
    source.onended = () => {
      // Remove from active sources
      const idx = this.activeSources.indexOf(source);
      if (idx > -1) this.activeSources.splice(idx, 1);

      // Skip if already stopped
      if (!this.isPlaying) return;

      if (this.audioContext && this.audioContext.currentTime >= this.scheduledEndTime - 0.05) {
        // Give a small buffer before declaring end
        setTimeout(() => {
          // Double-check isPlaying to prevent duplicate calls
          if (!this.isPlaying) return;

          if (this.audioContext && this.audioContext.currentTime >= this.scheduledEndTime - 0.05) {
            this.isPlaying = false;
            this.hasStartedPlaying = false;
            this.stopVolumeMonitor();
            this.options.onPlaybackEnd?.();
          }
        }, 100);
      }
    };
  }

  private startVolumeMonitor(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.volumeCheckInterval = window.setInterval(() => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedVolume = average / 255;

      this.options.onVolumeChange?.(normalizedVolume);
    }, 50);
  }

  private stopVolumeMonitor(): void {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
    this.options.onVolumeChange?.(0);
  }

  stop(): void {
    // 모든 활성 오디오 소스 즉시 정지
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // 이미 정지된 경우 무시
      }
    }
    this.activeSources = [];
    this.scheduledEndTime = 0;
    this.pendingBuffers = [];
    this.isPlaying = false;
    this.hasStartedPlaying = false;
    this.stopVolumeMonitor();
    this.options.onPlaybackEnd?.();
  }

  close(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
      this.gainNode = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}
