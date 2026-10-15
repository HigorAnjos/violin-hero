import { PitchDetector } from './pitch-detector.js';

// Tunable constants — violin pitch tracking
const MIN_CLARITY = 0.85;          // reject YIN detections less periodic than this
const MIN_FREQ = 180;              // Hz — violin range floor, with margin below open G
const MAX_FREQ = 1500;             // Hz — violin range ceiling, with margin above high positions
const NOISE_GATE_DB = -50;         // dBFS RMS floor below which a reading is treated as silence
const MEDIAN_WINDOW = 5;           // frames of fractional-MIDI history used for the median filter
const OCTAVE_JUMP_CENTS = 1200;    // one octave, used to spot detector octave errors
const OCTAVE_JUMP_TOLERANCE = 50;  // +/- cents around OCTAVE_JUMP_CENTS still counted as a jump
const OCTAVE_CORRECT_FRAMES = 2;   // frames an octave jump is corrected before being accepted as real
const ONSET_RMS_RISE_DB = 6;       // dB above the recent RMS floor that counts as a new attack
const ONSET_RMS_WINDOW_MS = 80;    // window used to track that RMS floor (covers a bow change)
const ONSET_PITCH_JUMP_CENTS = 80; // pitch change that, if it holds, counts as a new attack
const ONSET_PITCH_JUMP_FRAMES = 2; // consecutive frames the new pitch must hold to confirm it
const SILENT_RMS_DB = -100;        // placeholder RMS fed to the onset tracker on a null detection

function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Wraps PitchDetector with confidence gating, median smoothing, octave-error
 * correction and onset (new-attack) detection, so callers get a stable,
 * debounced reading instead of the raw per-frame YIN output.
 */
export class PitchTracker {
  constructor() {
    this._detector = new PitchDetector();
    this._midiHistory = [];
    this._octaveJumpStreak = 0;
    this._pitchJumpStreak = 0;
    this._lastOutputMidi = null;
    this._rmsHistory = []; // [{t, db}] within ONSET_RMS_WINDOW_MS
    this._aboveOnset = false;
    this._onsetId = 0;
    this._lastProcessTime = 0;
    this._latest = { freq: null, clarity: 0, rms: 0, onsetId: 0 };
  }

  /** Most recently processed reading, from whichever source last fed this tracker. */
  get latest() {
    return this._latest;
  }

  /**
   * True once more than maxAgeMs has passed since a reading was processed —
   * used on the worklet path, where messages arrive asynchronously, to tell
   * a genuinely stale reading apart from a held note.
   */
  isStale(nowMs = performance.now(), maxAgeMs = 100) {
    return nowMs - this._lastProcessTime > maxAgeMs;
  }

  /**
   * Main-thread path: run the detector synchronously on an AnalyserNode buffer.
   * @param {Float32Array} data
   * @param {number} sampleRate
   * @param {number} [nowMs]
   */
  update(data, sampleRate, nowMs = performance.now()) {
    return this._process(this._detector.detect(data, sampleRate), nowMs);
  }

  /**
   * Worklet path: consume a { freq, clarity, rms } message posted by
   * pitch-worklet.js. The render loop never calls this directly — it only
   * reads `.latest` — this runs from the worklet's port.onmessage handler.
   */
  ingest(raw, nowMs = performance.now()) {
    return this._process(raw, nowMs);
  }

  /**
   * @returns {{freq:number|null, clarity:number, rms:number, onsetId:number}}
   *   freq is null when the reading was rejected by a confidence gate; onsetId
   *   still advances in that case (silence-to-attack is the main onset case).
   */
  _process(raw, nowMs) {
    const freq = raw?.freq ?? null;
    const clarity = raw?.clarity ?? 0;
    const rms = raw?.rms ?? 0;
    const rmsDb = freq != null ? 20 * Math.log10(Math.max(rms, 1e-10)) : SILENT_RMS_DB;

    this._lastProcessTime = nowMs;

    // Onset tracking must see every frame, including rejected ones — the most
    // common onset is silence followed by an attack, which gating would hide.
    this._trackOnset(rmsDb, nowMs);

    const accepted = freq != null
      && clarity >= MIN_CLARITY
      && freq >= MIN_FREQ && freq <= MAX_FREQ
      && rmsDb >= NOISE_GATE_DB;

    if (!accepted) {
      this._midiHistory.length = 0;
      this._octaveJumpStreak = 0;
      this._pitchJumpStreak = 0;
      this._lastOutputMidi = null;
      this._latest = { freq: null, clarity, rms, onsetId: this._onsetId };
      return this._latest;
    }

    const outputMidi = this._resolvePitch(freq);
    this._latest = { freq: midiToFreq(outputMidi), clarity, rms, onsetId: this._onsetId };
    return this._latest;
  }

  _trackOnset(rmsDb, nowMs) {
    this._rmsHistory.push({ t: nowMs, db: rmsDb });
    while (this._rmsHistory.length > 1 && nowMs - this._rmsHistory[0].t > ONSET_RMS_WINDOW_MS) {
      this._rmsHistory.shift();
    }
    const floor = Math.min(...this._rmsHistory.map(e => e.db));
    const rising = rmsDb - floor >= ONSET_RMS_RISE_DB;
    if (rising && !this._aboveOnset) {
      this._onsetId++;
      this._aboveOnset = true;
    } else if (!rising) {
      this._aboveOnset = false;
    }
  }

  _resolvePitch(freq) {
    const midi = this._resolveOctave(freqToMidi(freq));

    if (this._lastOutputMidi != null && Math.abs((midi - this._lastOutputMidi) * 100) >= ONSET_PITCH_JUMP_CENTS) {
      this._pitchJumpStreak++;
    } else {
      this._pitchJumpStreak = 0;
    }
    if (this._pitchJumpStreak >= ONSET_PITCH_JUMP_FRAMES) {
      // The new pitch held for long enough to be a real attack, not a blip.
      this._onsetId++;
      this._midiHistory.length = 0; // drop the old note so the median doesn't blend the two
      this._pitchJumpStreak = 0;
    }

    this._midiHistory.push(midi);
    if (this._midiHistory.length > MEDIAN_WINDOW) this._midiHistory.shift();
    const outputMidi = median(this._midiHistory);
    this._lastOutputMidi = outputMidi;
    return outputMidi;
  }

  /** Snap a short octave-error blip back to the recent pitch; accept a sustained jump as real. */
  _resolveOctave(midi) {
    if (this._midiHistory.length === 0) return midi;
    const ref = median(this._midiHistory);
    const diffCents = (midi - ref) * 100;
    const isJump = Math.abs(Math.abs(diffCents) - OCTAVE_JUMP_CENTS) <= OCTAVE_JUMP_TOLERANCE;
    if (!isJump) {
      this._octaveJumpStreak = 0;
      return midi;
    }
    this._octaveJumpStreak++;
    if (this._octaveJumpStreak <= OCTAVE_CORRECT_FRAMES) {
      const octaves = Math.round((midi - ref) / 12);
      return midi - octaves * 12;
    }
    // Sustained jump: treat it as a real note change rather than a detector error.
    this._midiHistory.length = 0;
    this._octaveJumpStreak = 0;
    return midi;
  }
}
