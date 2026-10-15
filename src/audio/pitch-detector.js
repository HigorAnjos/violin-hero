/**
 * YIN pitch detection algorithm.
 * Reference: de Cheveigné & Kawahara (2002)
 */

const YIN_THRESHOLD = 0.15;

export class PitchDetector {
  constructor() {
    this._yinBuffer = null;
  }

  /**
   * Detect pitch from float time-domain audio data.
   * Returns { freq, clarity, rms } in Hz/0-1/linear, or null if no periodicity
   * was found at all (the caller's PitchTracker applies the real confidence gates).
   */
  detect(data, sampleRate) {
    // Analyse only the most recent samples: an integration window of ~1024
    // samples plus enough lag range for ~50 Hz. Keeps latency low and the
    // O(W·τ) cost small enough for phones.
    const tauMax = Math.min(Math.floor(data.length / 2), Math.ceil(sampleRate / 50));
    const W = Math.min(data.length - tauMax, Math.max(1024, tauMax));
    const offset = data.length - W - tauMax;
    const halfLen = tauMax;

    // Reuse buffer
    if (!this._yinBuffer || this._yinBuffer.length !== halfLen) {
      this._yinBuffer = new Float32Array(halfLen);
    }
    const yinBuffer = this._yinBuffer;

    // Quick exit on near-total silence only; PitchTracker owns the real dBFS gate.
    let energy = 0;
    for (let i = offset; i < offset + W + tauMax; i++) energy += data[i] * data[i];
    const rms = Math.sqrt(energy / (W + tauMax));
    if (energy / (W + tauMax) < 1e-7) return null;

    // Step 1: Squared difference function
    yinBuffer[0] = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) {
        const diff = data[offset + i] - data[offset + i + tau];
        sum += diff * diff;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // Step 3: Absolute threshold - find first dip below threshold
    let tauEstimate = -1;
    for (let tau = 2; tau < halfLen; tau++) {
      if (yinBuffer[tau] < YIN_THRESHOLD) {
        // Walk to the local minimum
        while (tau + 1 < halfLen && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return null;

    // Confidence: 1 - the normalized difference at the dip, before interpolation.
    const clarity = 1 - yinBuffer[tauEstimate];

    // Step 4: Parabolic interpolation for sub-sample accuracy
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

    const frequency = sampleRate / betterTau;

    // Sanity check: violin range roughly G3 (196Hz) to E7 (2637Hz),
    // but allow wider for harmonics and other instruments
    if (frequency < 50 || frequency > 5000) return null;

    return { freq: frequency, clarity, rms };
  }
}
