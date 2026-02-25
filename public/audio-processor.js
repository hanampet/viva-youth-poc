class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputChannel = input[0];

    // Calculate volume
    let sum = 0;
    for (let i = 0; i < inputChannel.length; i++) {
      sum += inputChannel[i] * inputChannel[i];
    }
    const rms = Math.sqrt(sum / inputChannel.length);
    const volume = Math.min(1, rms * 10);

    // Buffer audio data
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage({
          audioData: this.buffer.slice(),
          volume: volume,
        });
        this.bufferIndex = 0;
      }
    }

    // Send volume updates even when buffer is not full
    if (this.bufferIndex > 0 && this.bufferIndex < this.bufferSize) {
      this.port.postMessage({ volume: volume });
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
