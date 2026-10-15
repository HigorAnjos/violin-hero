// AudioWorkletProcessor running YIN pitch detection on the audio rendering
// thread. Self-contained: AudioWorklet modules can't import other modules
// reliably across browsers, so the YIN + RMS logic is duplicated here from
// pitch-detector.js rather than shared.

const RING_SIZE = 2048;     // samples of history kept for each analysis window
const HOP_SIZE = 512;       // samples between analyses (~11ms at 48kHz)
const YIN_THRESHOLD = 0.15; // same confidence threshold as the main-thread detector

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._ring = new Float32Array(RING_SIZE);
    this._writePos = 0;
    this._filled = 0;
    this._sinceAnalysis = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    for (let i = 0; i < channel.length; i++) {
      this._ring[this._writePos] = channel[i];
      this._writePos = (this._writePos + 1) % RING_SIZE;
      if (this._filled < RING_SIZE) this._filled++;
      this._sinceAnalysis++;
    }

    if (this._sinceAnalysis >= HOP_SIZE && this._filled >= RING_SIZE) {
      this._sinceAnalysis = 0;
      this._analyse();
    }
    return true;
  }

  _analyse() {
    // Unwrap the ring buffer into linear, oldest-first order for the YIN pass.
    const data = new Float32Array(RING_SIZE);
    for (let i = 0; i < RING_SIZE; i++) {
      data[i] = this._ring[(this._writePos + i) % RING_SIZE];
    }

    // `sampleRate` and `currentTime` are globals in AudioWorkletGlobalScope.
    const result = this._yin(data, sampleRate);
    this.port.postMessage({
      freq: result.freq,
      clarity: result.clarity,
      rms: result.rms,
      time: currentTime,
    });
  }

  /** Same algorithm as PitchDetector.detect(), returning rms even on a null freq. */
  _yin(data, sr) {
    const tauMax = Math.min(Math.floor(data.length / 2), Math.ceil(sr / 50));
    const W = Math.min(data.length - tauMax, Math.max(1024, tauMax));
    const offset = data.length - W - tauMax;
    const halfLen = tauMax;

    let energy = 0;
    for (let i = offset; i < offset + W + tauMax; i++) energy += data[i] * data[i];
    const rms = Math.sqrt(energy / (W + tauMax));
    if (energy / (W + tauMax) < 1e-7) return { freq: null, clarity: 0, rms };

    const yinBuffer = new Float32Array(halfLen);
    yinBuffer[0] = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) {
        const diff = data[offset + i] - data[offset + i + tau];
        sum += diff * diff;
      }
      yinBuffer[tau] = sum;
    }

    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    let tauEstimate = -1;
    for (let tau = 2; tau < halfLen; tau++) {
      if (yinBuffer[tau] < YIN_THRESHOLD) {
        while (tau + 1 < halfLen && yinBuffer[tau + 1] < yinBuffer[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }
    if (tauEstimate === -1) return { freq: null, clarity: 0, rms };

    const clarity = 1 - yinBuffer[tauEstimate];

    const t = tauEstimate;
    let betterTau;
    if (t > 0 && t < halfLen - 1) {
      const s0 = yinBuffer[t - 1];
      const s1 = yinBuffer[t];
      const s2 = yinBuffer[t + 1];
      const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
      betterTau = t + (isFinite(adjustment) ? adjustment : 0);
    } else {
      betterTau = t;
    }

    const freq = sr / betterTau;
    if (freq < 50 || freq > 5000) return { freq: null, clarity, rms };
    return { freq, clarity, rms };
  }
}

registerProcessor('pitch-processor', PitchProcessor);
