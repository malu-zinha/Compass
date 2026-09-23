/* global AudioWorkletProcessor, registerProcessor, sampleRate */
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;   // sampleRate é global no AudioWorkletGlobalScope
    this.position = 0;
    this.buffer = [];
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (; this.position < channel.length; this.position += this.step) {
      this.buffer.push(channel[Math.floor(this.position)]);
    }
    this.position -= channel.length;
    if (this.buffer.length >= 1600) {                 // 100 ms a 16 kHz
      const pcm = new Int16Array(this.buffer.length);
      for (let i = 0; i < this.buffer.length; i += 1) {
        const s = Math.max(-1, Math.min(1, this.buffer[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
      this.buffer = [];
    }
    return true;
  }
}
registerProcessor('pcm-worklet', PcmWorklet);
