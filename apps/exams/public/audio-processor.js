/**
 * AudioWorkletProcessor for capturing and processing microphone audio
 * Converts Float32 audio to PCM16 format for transcription
 * Buffers audio to match PyAudio's chunk size of 1024 samples
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer to accumulate samples before sending (matching PyAudio chunk=1024)
    this.buffer = [];
    this.targetBufferSize = 1024;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const inputChannel = input[0];

      if (inputChannel && inputChannel.length > 0) {
        // Add samples to buffer
        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer.push(inputChannel[i]);
        }

        // When we have enough samples, convert and send
        while (this.buffer.length >= this.targetBufferSize) {
          // Extract exactly targetBufferSize samples
          const samplesToSend = this.buffer.splice(0, this.targetBufferSize);

          // Convert Float32Array to Int16Array (PCM16)
          const int16Data = new Int16Array(samplesToSend.length);

          for (let i = 0; i < samplesToSend.length; i++) {
            // Clamp and convert to 16-bit integer
            const s = Math.max(-1, Math.min(1, samplesToSend[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send the audio data to the main thread
          this.port.postMessage(int16Data.buffer, [int16Data.buffer]);
        }
      }
    }

    // Keep the processor alive
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
