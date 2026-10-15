import { SongSynth } from '../audio/song-synth.js';
import { midiToNoteName, midiToFrequency } from '../audio/note-utils.js';
import { TUNING_PRESETS } from '../audio/tunings.js';
import { MAX_LEVEL, positionName } from '../songs/song-model.js';
import { getProgress, saveProgress, getSettings, saveSettings } from '../songs/progress-store.js';

/**
 * Rocksmith-style song player for bowed strings.
 *
 * Modes:
 *  - learn  : "Learn a Song" — dynamic difficulty per phrase, mastery, Master Mode fade
 *  - score  : "Score Attack" — fixed difficulty, multiplier, streaks, 3 strikes
 *  - riff   : "Riff Repeater" — loop chosen phrases, set speed + level, speed trainer
 *
 * The highway is a pseudo-3D projection: columns are semitone positions
 * along the fingerboard ("frets"), rows are strings, depth is time.
 */

const STRING_COLORS = {
  // GDAE: neon palette from the violin-hero-design-system (violet/magenta/cyan/yellow),
  // which reads well against the canvas's existing dark navy gradient.
  G: '#9d5cff', D: '#ff2bd6', A: '#00e5ff', E: '#ffe14d',
  C: '#5fae6a', B: '#9b7fcf', 'F#': '#c97aa8', 'C#': '#5fb0a8', F: '#c97aa8',
};
const FALLBACK_COLORS = ['#d9894a', '#5b93d6', '#d8b04a', '#cf5c5c', '#9b7fcf', '#5fae6a'];
const FONT = "Georgia, 'Palatino Linotype', Palatino, serif";

const LOOKAHEAD = 2.6;    // seconds of real time visible on the highway
const EARLY = 0.16;       // hit window before the note (real seconds)
const LATE = 0.14;        // hit window after the note start / sustain
const SCORE_DIFFS = {
  easy: { label: 'Easy', level: 1, strikes: 5 },
  medium: { label: 'Medium', level: 3, strikes: 4 },
  hard: { label: 'Hard', level: MAX_LEVEL, strikes: 3 },
  master: { label: 'Master', level: MAX_LEVEL, strikes: 3, fade: true },
};

function stringColor(stringDef, idx) {
  return STRING_COLORS[stringDef?.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function fmtTime(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function levelKeyOf(phrase) {
  return phrase.name.replace(' (repeat)', '');
}

export class SongPlayer {
  /**
   * @param {HTMLElement} container
   * @param {{ getCtx: () => AudioContext|null, getLevelDb?: () => number }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.deps = deps;
    this.onExit = null;
    this.onRiffRequest = null;

    this.settings = getSettings();
    this._state = 'idle'; // idle | tuning | playing | paused | results
    this._freq = null;
    this._freqTime = 0;
    this._raf = null;
    this._particles = [];
    this._popups = [];
    this._synth = null;
    this._cam = 0;

    this._build();
    this._onKey = (e) => this._handleKey(e);
    this._onVisibility = () => { if (document.hidden && this._state === 'playing') this.pause(); };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  get active() {
    return this._state === 'playing' || this._state === 'tuning' || this._state === 'paused';
  }

  // ───────────────────────────── DOM ─────────────────────────────

  _build() {
    const root = el('div', 'sp-root');
    this.root = root;

    // HUD
    const hud = el('div', 'sp-hud');
    const left = el('div', 'sp-hud-left');
    this.hudTitle = el('div', 'sp-title');
    this.hudSub = el('div', 'sp-sub');
    left.append(this.hudTitle, this.hudSub);

    const stats = el('div', 'sp-hud-stats');
    const mk = (label) => {
      const box = el('div', 'sp-stat');
      const v = el('div', 'sp-stat-value', '0');
      box.append(v, el('div', 'sp-stat-label', label));
      stats.appendChild(box);
      return { box, v };
    };
    this.stScore = mk('Score');
    this.stMult = mk('Multiplier');
    this.stStreak = mk('Streak');
    this.stAcc = mk('Accuracy');
    this.stStrikes = mk('Strikes');
    hud.append(left, stats);

    // Phrase timeline
    this.timeline = el('canvas', 'sp-timeline');

    // Highway
    const stage = el('div', 'sp-stage');
    this.canvas = el('canvas', 'sp-canvas');
    stage.appendChild(this.canvas);
    this.stage = stage;

    // Overlays
    this.overlay = el('div', 'sp-overlay hidden');
    stage.appendChild(this.overlay);

    // Controls
    const controls = el('div', 'sp-controls');
    this.btnPause = el('button', 'sp-btn sp-btn-primary', 'Pause');
    this.btnPause.addEventListener('click', () => (this._state === 'paused' ? this.resume() : this.pause()));
    this.btnRestart = el('button', 'sp-btn', 'Restart');
    this.btnRestart.addEventListener('click', () => this.restart());
    this.btnExit = el('button', 'sp-btn sp-exit', 'Library');
    this.btnExit.addEventListener('click', () => this.exit());

    const speedWrap = el('label', 'sp-speed');
    speedWrap.append(el('span', null, 'Speed'));
    this.speedInput = el('input');
    this.speedInput.type = 'range';
    this.speedInput.min = '25';
    this.speedInput.max = '125';
    this.speedInput.step = '5';
    this.speedInput.value = '100';
    this.speedVal = el('span', 'sp-speed-val', '100%');
    this.speedInput.addEventListener('input', () => this._setSpeed(Number(this.speedInput.value) / 100));
    speedWrap.append(this.speedInput, this.speedVal);

    controls.append(this.btnPause, this.btnRestart, speedWrap, this.btnExit);

    root.append(hud, this.timeline, stage, controls);
    this.container.appendChild(root);

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(stage);
    this._ro.observe(this.timeline);
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.stage.getBoundingClientRect();
    this._w = Math.max(200, r.width);
    this._h = Math.max(160, r.height);
    this.canvas.width = Math.round(this._w * dpr);
    this.canvas.height = Math.round(this._h * dpr);
    this.canvas.style.width = this._w + 'px';
    this.canvas.style.height = this._h + 'px';
    this._dpr = dpr;

    const tr = this.timeline.getBoundingClientRect();
    this.timeline.width = Math.round(Math.max(100, tr.width) * dpr);
    this.timeline.height = Math.round(Math.max(10, tr.height) * dpr);
  }

  // ───────────────────────────── Session ─────────────────────────────

  /**
   * @param {object} song   library entry {id,title,composer,...}
   * @param {object} chart  from buildChart
   * @param {object} opts   { mode:'learn'|'score'|'riff', difficulty, riff:{from,to,level,speed,trainer} }
   */
  start(song, chart, opts) {
    this.song = song;
    this.chart = chart;
    this.opts = { mode: 'learn', difficulty: 'hard', ...opts };
    this.settings = getSettings();
    this.progress = getProgress(song.id);
    this.preset = TUNING_PRESETS[chart.tuningKey];

    this.beatSec = 60 / chart.tempo;
    this.notes = chart.notes.map((n, i) => ({
      ...n,
      i,
      sec: n.start * this.beatSec,
      durSec: n.dur * this.beatSec,
    }));
    this.phrases = chart.phrases.map(p => ({
      ...p,
      sec: p.start * this.beatSec,
      endSec: p.end * this.beatSec,
    }));
    this.endSec = chart.totalBeats * this.beatSec;
    {
      const m = chart.meter;
      const compound = m.num % 3 === 0 && m.num > 3;
      this._clickSec = (compound ? 3 * (4 / m.den) : 4 / m.den) * this.beatSec;
      const barSec = m.num * (4 / m.den) * this.beatSec;
      const clicksPerBar = Math.round(barSec / this._clickSec);
      this._countInSec = clicksPerBar >= 3 ? barSec : barSec * 2;
    }
    this._barStartSecs = new Set(chart.bars.map(b => Math.round(b.start * this.beatSec * 1000)));

    const mode = this.opts.mode;
    let speed = 1;
    if (mode === 'riff') speed = (this.opts.riff?.speed ?? 100) / 100;
    this.speedInput.value = String(Math.round(speed * 100));
    this.speedVal.textContent = `${Math.round(speed * 100)}%`;
    this.speed = speed;

    this.title = song.title || chart.title;
    this.hudTitle.textContent = this.title;
    const modeLabel = mode === 'learn' ? 'Learn a Song'
      : mode === 'score' ? `Score Attack · ${SCORE_DIFFS[this.opts.difficulty].label}`
      : 'Riff Repeater';
    this.hudSub.textContent = `${modeLabel} · ${chart.key.label} · ${chart.meter.text} · ${Math.round(chart.tempo)} bpm`;
    this.stMult.box.style.display = mode === 'score' ? '' : 'none';
    this.stStrikes.box.style.display = mode === 'score' ? '' : 'none';
    this.stScore.box.style.display = mode === 'learn' ? 'none' : '';

    document.addEventListener('keydown', this._onKey);
    this._resize();

    // Ensure audio is running (mobile autoplay policies)
    const ctx = this.deps.getCtx();
    ctx?.resume?.();

    this._resetRun();
    this._pausedAt = null;
    this._anchorSong = 0;
    if (this.settings.tuningCheck && mode !== 'riff') {
      this._showTuningCheck();
    } else {
      this._beginPlay();
    }
    this._loop();
  }

  _resetRun() {
    const mode = this.opts.mode;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.multiplier = 1;
    this.hits = 0;
    this.misses = 0;
    this.perfects = 0;
    this.strikes = 0;
    this.consecMiss = 0;
    this.failed = false;
    this._particles = [];
    this._popups = [];
    this._lastHitMidi = null;
    this._lastHitOnsetId = null;

    for (const n of this.notes) {
      n.state = 'pending';
      n.frames = 0;
      n.firstMatch = null;
      n.cents = null;
      n.holdFrames = 0;
      n.hitOnsetId = null;
    }
    for (const p of this.phrases) {
      p.level = null;
      p.evaluated = false;
      p.hits = 0;
      p.total = 0;
      p.faded = false;
    }

    // Range
    if (mode === 'riff') {
      const r = this.opts.riff;
      this.rangeStart = this.phrases[r.from].sec;
      this.rangeEnd = this.phrases[r.to].endSec;
      this.loopCount = 0;
      this.loopStats = [];
    } else {
      this.rangeStart = 0;
      this.rangeEnd = this.endSec;
    }

    this._levelByKey = {};
    for (let i = 0; i < this.phrases.length; i++) {
      const k = levelKeyOf(this.phrases[i]);
      if (!(k in this._levelByKey)) this._levelByKey[k] = this.progress.phraseLevels[k] ?? 0;
    }
  }

  _levelFor(p) {
    const mode = this.opts.mode;
    if (mode === 'score') return SCORE_DIFFS[this.opts.difficulty].level;
    if (mode === 'riff') {
      const lv = this.opts.riff.level;
      return lv === 'dynamic' ? this._levelByKey[levelKeyOf(this.phrases[p])] : lv;
    }
    return this._levelByKey[levelKeyOf(this.phrases[p])];
  }

  _isMasterFade(p) {
    const mode = this.opts.mode;
    if (mode === 'score') return !!SCORE_DIFFS[this.opts.difficulty].fade;
    if (mode === 'learn' && this.settings.masterMode) {
      return !!this.progress.phraseMastered[levelKeyOf(this.phrases[p])];
    }
    return false;
  }

  _beginPlay() {
    this._hideOverlay();
    this._resetRun();
    const ctx = this.deps.getCtx();
    if (ctx && !this._synth) this._synth = new SongSynth(ctx);
    else if (ctx && this._synth && this._synth.ctx !== ctx) {
      this._synth.dispose();
      this._synth = new SongSynth(ctx);
    }
    this._applyVolumes();
    this._seek(this.rangeStart - this._countInSec);
    this._state = 'playing';
    this.btnPause.textContent = 'Pause';
    this.btnPause.disabled = false;
  }

  _applyVolumes() {
    if (!this._synth) return;
    const s = this.settings;
    this._synth.setVolumes({
      guide: s.guide ? s.guideVolume : 0,
      backing: s.backing ? s.backingVolume : 0,
      click: s.click ? s.clickVolume : 0,
    });
  }

  _now() {
    const ctx = this.deps.getCtx();
    if (ctx && ctx.state === 'running') return ctx.currentTime;
    return performance.now() / 1000;
  }

  _clockIsCtx() {
    const ctx = this.deps.getCtx();
    return !!(ctx && ctx.state === 'running');
  }

  _seek(songSec) {
    this._anchorSong = songSec;
    this._anchorClock = this._now();
    this._anchorIsCtx = this._clockIsCtx();
    this._scheduledUntil = songSec;
    this._synth?.stopAll();
    this._nextBeat = Math.ceil(songSec / this._clickSec - 1e-6);
  }

  get songSec() {
    if (this._state === 'paused' || this._state !== 'playing') return this._pausedAt ?? this._anchorSong ?? 0;
    // Re-anchor if the clock source changed (e.g. AudioContext resumed)
    if (this._anchorIsCtx !== this._clockIsCtx()) {
      const cur = this._anchorSong;
      this._seek(cur);
    }
    return this._anchorSong + (this._now() - this._anchorClock) * this.speed;
  }

  _setSpeed(speed) {
    const cur = this.songSec;
    this.speed = speed;
    this.speedVal.textContent = `${Math.round(speed * 100)}%`;
    if (this._state === 'playing') this._seek(cur);
  }

  pause() {
    if (this._state !== 'playing') return;
    this._pausedAt = this.songSec;
    this._state = 'paused';
    this._synth?.stopAll();
    this.btnPause.textContent = 'Resume';
    this._showPauseMenu();
  }

  resume() {
    if (this._state !== 'paused') return;
    this._hideOverlay();
    const at = this._pausedAt - 2 * this.beatSec; // short rewind for re-entry
    this._state = 'playing';
    this._pausedAt = null;
    this._seek(Math.max(this.rangeStart - this._countInSec, at));
    // Rewound notes that were never judged stay pending
    this.btnPause.textContent = 'Pause';
  }

  restart() {
    if (!this.chart) return;
    this._pausedAt = null;
    this._beginPlay();
  }

  exit() {
    this.stop();
    this.onExit?.();
  }

  stop() {
    this._state = 'idle';
    this._synth?.stopAll();
    this._hideOverlay();
    document.removeEventListener('keydown', this._onKey);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _handleKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (this._state === 'playing') this.pause();
      else if (this._state === 'paused') this.resume();
    } else if (e.key === 'Escape') {
      if (this._state === 'playing') this.pause();
      else this.exit();
    } else if (e.key === 'r' || e.key === 'R') {
      this.restart();
    }
  }

  /**
   * Called by the app's render loop with the latest PitchTracker reading
   * ({ freq, clarity, rms, onsetId }), or null from the watchdog when pitch
   * data has gone stale.
   */
  update(reading) {
    this._freq = reading?.freq ?? null;
    this._freqTime = performance.now();
    if (this._state === 'tuning') this._updateTuning(this._freq);
    else if (this._state === 'playing') this._judge(reading);
  }

  // ───────────────────────────── Judging ─────────────────────────────

  _evalSec() {
    return this.songSec - (this.settings.latencyMs / 1000) * this.speed;
  }

  _visible(n) {
    const p = this.phrases[n.phrase];
    const lvl = p.level ?? this._levelFor(n.phrase);
    return n.minLevel <= lvl;
  }

  _judge(reading) {
    const t = this._evalSec();
    const early = EARLY * this.speed;
    const late = LATE * this.speed;
    const tol = this.settings.tolerance;

    const freq = reading?.freq ?? null;
    const onsetId = reading?.onsetId ?? null;

    let midiF = null;
    if (freq) midiF = 69 + 12 * Math.log2(freq / 440);

    for (const n of this.notes) {
      if (n.state !== 'pending') continue;
      if (n.sec < this.rangeStart - 1e-6 || n.sec >= this.rangeEnd - 1e-6) continue;
      if (n.sec - early > t) break; // notes are time-ordered
      if (!this._visible(n)) continue;

      const windowEnd = n.sec + Math.max(Math.min(n.durSec, 0.6 * this.speed), 0.12 * this.speed) + late;
      if (t > windowEnd) {
        this._registerMiss(n);
        continue;
      }
      if (midiF == null) continue;
      const cents = (midiF - n.midi) * 100;
      if (Math.abs(cents) <= tol) {
        // Same pitch as the last note we hit: require a newer onset (a fresh
        // bow attack) rather than letting one held note satisfy several notes.
        if (this._lastHitMidi === n.midi && onsetId != null && onsetId <= this._lastHitOnsetId) {
          continue;
        }
        if (n.firstMatch == null) n.firstMatch = t;
        n.frames++;
        n.cents = n.cents == null ? cents : n.cents * 0.6 + cents * 0.4;
        const need = n.durSec / this.speed < 0.18 ? 1 : 2;
        if (n.frames >= need) this._registerHit(n, onsetId);
        break; // one detection satisfies one note
      }
    }

    // Sustain tracking for already-hit notes (for glow only)
    for (const n of this.notes) {
      if (n.state !== 'hit') continue;
      if (n.sec + n.durSec < t) continue;
      if (n.sec - early > t) break;
      n.holding = midiF != null && Math.abs((midiF - n.midi) * 100) <= tol;
    }

    this._evaluatePhrases(t);
  }

  _registerHit(n, onsetId) {
    n.state = 'hit';
    n.hitOnsetId = onsetId;
    this._lastHitMidi = n.midi;
    this._lastHitOnsetId = onsetId;
    const errReal = (n.firstMatch - n.sec) / this.speed;
    const perfect = Math.abs(errReal) < 0.08 && Math.abs(n.cents ?? 0) < 20;
    n.grade = perfect ? 'perfect' : 'good';
    this.hits++;
    if (perfect) this.perfects++;
    this.streak++;
    this.consecMiss = 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.multiplier = Math.min(4, 1 + Math.floor(this.streak / 10));
    this.score += (perfect ? 150 : 100) * this.multiplier;
    const p = this.phrases[n.phrase];
    p.hits++;
    p.total++;

    const pos = this._notePos(n, 0);
    this._burst(pos.x, pos.y, this._colorOf(n.string), perfect ? 22 : 12);
    let label = perfect ? 'Perfect' : (errReal < 0 ? 'Early' : 'Late');
    if (!perfect && Math.abs(n.cents ?? 0) >= 20 && Math.abs(errReal) < 0.08) label = (n.cents > 0 ? 'Sharp' : 'Flat');
    this._popup(pos.x, pos.y - 30, label, perfect ? '#9fd8a4' : '#f0d58a');
    if (this.streak > 0 && this.streak % 25 === 0) this._popup(this._w / 2, this._h * 0.3, `${this.streak} note streak!`, '#f5f0e8', 1.6);
  }

  _registerMiss(n) {
    n.state = 'miss';
    this.misses++;
    this.streak = 0;
    this.multiplier = 1;
    this.consecMiss++;
    const p = this.phrases[n.phrase];
    p.total++;
    const pos = this._notePos(n, 0);
    this._popup(pos.x, pos.y - 30, 'Miss', '#e48a8a');

    if (this.opts.mode === 'score' && this.consecMiss >= 3) {
      this.consecMiss = 0;
      this.strikes++;
      this._popup(this._w / 2, this._h * 0.35, `STRIKE ${this.strikes}`, '#e06b6b', 2);
      if (this.strikes >= SCORE_DIFFS[this.opts.difficulty].strikes) {
        this.failed = true;
        this._finish();
      }
    }
  }

  _evaluatePhrases(t) {
    const mode = this.opts.mode;
    for (let i = 0; i < this.phrases.length; i++) {
      const p = this.phrases[i];
      // Lock the phrase's level as it enters the highway
      if (p.level == null && p.sec - LOOKAHEAD * this.speed <= this.songSec) {
        p.level = this._levelFor(i);
        p.faded = this._isMasterFade(i);
      }
      if (p.evaluated || t < p.endSec + LATE * this.speed + 0.05) continue;
      if (p.sec < this.rangeStart - 1e-6 || p.endSec > this.rangeEnd + 1e-6) { p.evaluated = true; continue; }
      p.evaluated = true;
      if (p.total === 0) continue;
      const acc = p.hits / p.total;
      p.acc = acc;
      if (mode === 'learn' || (mode === 'riff' && this.opts.riff.level === 'dynamic')) {
        const key = levelKeyOf(p);
        const lvl = this._levelByKey[key];
        if (acc >= 0.85 && lvl < MAX_LEVEL) {
          this._levelByKey[key] = lvl + 1;
          this._popup(this._w / 2, this._h * 0.22, 'LEVEL UP', '#a9c8ee', 1.8);
        } else if (acc >= 0.9 && lvl === MAX_LEVEL) {
          const mastered = this.progress.phraseMastered[key];
          if (!mastered) {
            this.progress.phraseMastered[key] = true;
            this._popup(this._w / 2, this._h * 0.22, 'PHRASE MASTERED', '#c9b6ec', 2);
          } else if (p.faded) {
            this.progress.phraseMasterCleared = this.progress.phraseMasterCleared || {};
            this.progress.phraseMasterCleared[key] = true;
          }
        } else if (acc < 0.4 && lvl > 0) {
          this._levelByKey[key] = lvl - 1;
          this._popup(this._w / 2, this._h * 0.22, 'Level down', '#e8b98a', 1.4);
        }
      }
    }
  }

  // ───────────────────────────── Audio scheduling ─────────────────────────────

  _schedule() {
    if (!this._synth || !this._clockIsCtx() || this._state !== 'playing') return;
    const ahead = 0.3 * this.speed;
    const from = this._scheduledUntil;
    const to = this.songSec + ahead;
    if (to <= from) return;
    const toCtx = (sec) => this._anchorClock + (sec - this._anchorSong) / this.speed;
    const ctxNow = this._now();

    // Click on each beat unit (count-in always clicks)
    const clickSec = this._clickSec;
    while (this._nextBeat * clickSec < to) {
      const sec = this._nextBeat * clickSec;
      if (sec >= from - 1e-6 && sec <= this.rangeEnd + 1e-6) {
        const isCountIn = sec < this.rangeStart - 1e-6;
        if (this.settings.click || isCountIn) {
          const accent = isCountIn ? false : this._barStartSecs.has(Math.round(sec * 1000));
          const t = toCtx(sec);
          if (t >= ctxNow - 0.01) {
            this._synth.click(t, accent, isCountIn && !this.settings.click ? this.settings.clickVolume : null);
          }
        }
      }
      this._nextBeat++;
    }

    // Guide melody (visible notes only)
    for (const n of this.notes) {
      if (n.sec < from || n.sec >= to) continue;
      if (n.sec < this.rangeStart - 1e-6 || n.sec >= this.rangeEnd - 1e-6) continue;
      if (!this._visible(n)) continue;
      const t = toCtx(n.sec);
      if (t >= ctxNow - 0.01) this._synth.note(n.midi, t, n.durSec / this.speed);
    }

    // Backing chords / drone
    const chords = this.chart.chords;
    if (chords.length > 0) {
      for (let i = 0; i < chords.length; i++) {
        const c = chords[i];
        const sec = c.start * this.beatSec;
        if (sec < from || sec >= to) continue;
        if (sec < this.rangeStart - 1e-6 || sec >= this.rangeEnd - 1e-6) continue;
        const nextSec = (chords[i + 1]?.start ?? this.chart.totalBeats) * this.beatSec;
        const t = toCtx(sec);
        if (t >= ctxNow - 0.01) this._synth.chord(c.symbol, t, Math.min(nextSec, this.rangeEnd) / this.speed - sec / this.speed);
      }
    } else {
      // Drone re-struck each bar
      for (const b of this.chart.bars) {
        const sec = b.start * this.beatSec;
        if (sec < from || sec >= to) continue;
        if (sec < this.rangeStart - 1e-6 || sec >= this.rangeEnd - 1e-6) continue;
        const t = toCtx(sec);
        if (t >= ctxNow - 0.01) this._synth.drone(this.chart.key.tonicPc, t, b.dur * this.beatSec / this.speed);
      }
    }

    this._scheduledUntil = to;
  }

  // ───────────────────────────── Main loop ─────────────────────────────

  _loop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      if (this._state === 'playing') {
        // Judge even when no fresh pitch arrives (for misses)
        if (performance.now() - this._freqTime > 100) this._judge(null);
        this._schedule();
        this._checkEnd();
      }
      this._render();
      this._renderTimeline();
      this._updateHud();
    };
    tick();
  }

  _checkEnd() {
    const t = this.songSec;
    if (this.opts.mode === 'riff') {
      if (t >= this.rangeEnd + 0.4 * this.speed) this._riffLoop();
      return;
    }
    if (t >= this.endSec + 1.2 * this.speed) this._finish();
  }

  _riffLoop() {
    const r = this.opts.riff;
    let total = 0;
    let hits = 0;
    for (const n of this.notes) {
      if (n.sec < this.rangeStart - 1e-6 || n.sec >= this.rangeEnd - 1e-6) continue;
      if (n.state === 'hit') hits++;
      if (n.state === 'hit' || n.state === 'miss') total++;
    }
    const acc = total ? hits / total : 0;
    this.loopCount++;
    this.loopStats.push({ acc, speed: this.speed });

    if (r.trainer && acc >= 0.9 && this.speed < 1) {
      const next = Math.min(1, Math.round((this.speed + 0.05) * 100) / 100);
      this.speed = next;
      this.speedInput.value = String(Math.round(next * 100));
      this.speedVal.textContent = `${Math.round(next * 100)}%`;
      this._popup(this._w / 2, this._h * 0.25, `Speed up → ${Math.round(next * 100)}%`, '#a9c8ee', 1.8);
    }
    this._popup(this._w / 2, this._h * 0.4, `Loop ${this.loopCount}: ${Math.round(acc * 100)}%`, '#f5f0e8', 1.6);

    for (const n of this.notes) {
      if (n.sec < this.rangeStart - 1e-6 || n.sec >= this.rangeEnd - 1e-6) continue;
      n.state = 'pending';
      n.frames = 0;
      n.firstMatch = null;
      n.cents = null;
      n.hitOnsetId = null;
    }
    for (const p of this.phrases) {
      p.evaluated = false;
      p.hits = 0;
      p.total = 0;
      p.level = null;
    }
    this._lastHitMidi = null;
    this._lastHitOnsetId = null;
    this._saveDynamicLevels();
    this._seek(this.rangeStart - 2 * this.beatSec);
  }

  _saveDynamicLevels() {
    if (this.opts.mode === 'learn' || (this.opts.mode === 'riff' && this.opts.riff.level === 'dynamic')) {
      this.progress.phraseLevels = { ...this.progress.phraseLevels, ...this._levelByKey };
      this._recomputeMastery();
      saveProgress(this.song.id, this.progress);
    }
  }

  _recomputeMastery() {
    const keys = Object.keys(this._levelByKey);
    if (keys.length === 0) return;
    let sum = 0;
    for (const k of keys) {
      const lvl = this._levelByKey[k] ?? 0;
      let pct = (lvl / MAX_LEVEL) * 100;
      if (this.progress.phraseMastered[k]) pct = 100;
      if (this.progress.phraseMasterCleared?.[k]) pct = 110;
      sum += pct;
    }
    this.progress.mastery = Math.round(sum / keys.length);
  }

  _finish() {
    if (this._state === 'results') return;
    this._pausedAt = this.songSec;
    this._state = 'results';
    this.btnPause.disabled = true;
    this._synth?.stopAll();

    const judged = this.hits + this.misses;
    const acc = judged ? this.hits / judged : 0;
    const pr = this.progress;
    pr.plays = (pr.plays || 0) + 1;
    pr.lastPlayed = Date.now();
    pr.bestAccuracy = Math.max(pr.bestAccuracy || 0, Math.round(acc * 100));
    pr.bestStreak = Math.max(pr.bestStreak || 0, this.bestStreak);

    let medal = null;
    let newBest = false;
    if (this.opts.mode === 'score') {
      const d = this.opts.difficulty;
      if (!this.failed) {
        medal = acc >= 0.98 ? 'platinum' : acc >= 0.9 ? 'gold' : acc >= 0.75 ? 'silver' : acc >= 0.5 ? 'bronze' : null;
      }
      if ((pr.bestScore[d] || 0) < this.score) { pr.bestScore[d] = this.score; newBest = true; }
      const rank = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
      if (medal && (rank[medal] > (rank[pr.medal[d]] || 0))) pr.medal[d] = medal;
    }
    if (this.opts.mode === 'learn') {
      this.progress.phraseLevels = { ...this.progress.phraseLevels, ...this._levelByKey };
      this._recomputeMastery();
    }
    saveProgress(this.song.id, pr);
    this._showResults({ acc, medal, newBest });
  }

  // ───────────────────────────── Rendering ─────────────────────────────

  _colorOf(stringIdx) {
    return stringColor(this.preset?.strings[stringIdx], stringIdx);
  }

  _geometry() {
    const W = this._w;
    const H = this._h;
    const nStr = this.preset ? this.preset.strings.length : 4;
    const compact = H < 360;
    const nearTop = H * (compact ? 0.56 : 0.6);
    const nearBottom = H * (compact ? 0.86 : 0.86);
    const rowH = (nearBottom - nearTop) / Math.max(1, nStr - 1 || 1);
    const floorY = nearBottom + rowH * 0.55;
    const vp = { x: W / 2, y: H * 0.04 };
    const span = W < 520 ? 7 : 9; // visible semitone columns
    const left = Math.max(26, W * 0.08);
    const colW = (W - left - Math.max(12, W * 0.08)) / span;
    const k = (1 / 0.1 - 1) / (LOOKAHEAD * this.speed);
    return { W, H, nStr, nearTop, nearBottom, rowH, floorY, vp, span, left, colW, k };
  }

  _project(wx, wy, d, g) {
    const f = 1 / (1 + Math.max(-0.4 / g.k, d) * g.k);
    return { x: g.vp.x + (wx - g.vp.x) * f, y: g.vp.y + (wy - g.vp.y) * f, f };
  }

  _rowY(s, g) {
    // lowest string on top (Rocksmith-style view down onto the instrument)
    return g.nearTop + s * g.rowH;
  }

  _colX(offset, g) {
    return g.left + (offset - this._cam + 0.5) * g.colW;
  }

  _notePos(n, d) {
    const g = this._geometry();
    return this._project(this._colX(n.offset, g), this._rowY(n.string, g), d, g);
  }

  _render() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx || !this._w) return;
    const dpr = this._dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = this._geometry();
    const { W, H } = g;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#111a2e');
    bg.addColorStop(0.6, '#1a2744');
    bg.addColorStop(1, '#1e3a6e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (!this.chart) return;
    const now = this.songSec;
    const t = this._state === 'playing' ? this._evalSec() : now;
    const lookSong = LOOKAHEAD * this.speed;

    // Camera follows upcoming notes (anchor)
    let lo = Infinity;
    let hi = -Infinity;
    let base = null;
    for (const n of this.notes) {
      if (n.sec + n.durSec < now - 0.2) continue;
      if (n.sec > now + lookSong * 0.8) break;
      if (!this._visible(n)) continue;
      if (base === null && n.offset > 0) base = n.base;
      if (n.offset > 0) { lo = Math.min(lo, n.offset); hi = Math.max(hi, n.offset); }
    }
    let targetCam = this._cam;
    if (lo !== Infinity) {
      if (lo - 1 < this._cam) targetCam = Math.max(0, lo - 1);
      if (hi + 1 > this._cam + g.span) targetCam = Math.max(0, hi + 1 - g.span);
      if (hi <= g.span - 1) targetCam = 0;
    }
    this._cam += (targetCam - this._cam) * 0.08;
    this._anchorBase = base ?? this._anchorBase ?? 0;

    const dOf = (sec) => sec - now; // distance in song seconds

    // Floor
    const firstCol = Math.floor(this._cam);
    const lastCol = Math.ceil(this._cam + g.span);
    const nearL = this._project(this._colX(firstCol - 0.5, g), g.floorY, 0, g);
    const nearR = this._project(this._colX(lastCol + 0.5, g), g.floorY, 0, g);
    const farL = this._project(this._colX(firstCol - 0.5, g), g.floorY, lookSong, g);
    const farR = this._project(this._colX(lastCol + 0.5, g), g.floorY, lookSong, g);
    const floorGrad = ctx.createLinearGradient(0, farL.y, 0, nearL.y);
    floorGrad.addColorStop(0, 'rgba(236,229,216,0)');
    floorGrad.addColorStop(1, 'rgba(236,229,216,0.07)');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.closePath();
    ctx.fill();

    // Anchor zone (current hand position)
    const ab = this._anchorBase;
    {
      const a0 = this._project(this._colX(ab + 0.5, g), g.floorY, 0, g);
      const a1 = this._project(this._colX(ab + 8.5, g), g.floorY, 0, g);
      const a2 = this._project(this._colX(ab + 8.5, g), g.floorY, lookSong * 0.6, g);
      const a3 = this._project(this._colX(ab + 0.5, g), g.floorY, lookSong * 0.6, g);
      const ag = ctx.createLinearGradient(0, a3.y, 0, a0.y);
      ag.addColorStop(0, 'rgba(196,154,42,0)');
      ag.addColorStop(1, 'rgba(196,154,42,0.14)');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(a3.x, a3.y);
      ctx.closePath();
      ctx.fill();
    }

    // Column ("fret") lines
    for (let c = firstCol; c <= lastCol + 1; c++) {
      const a = this._project(this._colX(c - 0.5, g), g.floorY, 0, g);
      const b = this._project(this._colX(c - 0.5, g), g.floorY, lookSong, g);
      const tape = c - ab === 2 || c - ab === 4 || c - ab === 5 || c - ab === 7;
      ctx.strokeStyle = tape ? 'rgba(236,229,216,0.25)' : 'rgba(236,229,216,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Beat & bar lines
    const firstBeat = Math.floor(now / this.beatSec);
    const lastBeat = Math.ceil((now + lookSong) / this.beatSec);
    const bars = this.chart.bars;
    const barStarts = new Set(bars.map(b => Math.round(b.start * 1000)));
    for (let b = firstBeat; b <= lastBeat; b++) {
      const sec = b * this.beatSec;
      const d = dOf(sec);
      if (d < -0.05 || d > lookSong) continue;
      const isBar = barStarts.has(Math.round(b * 1000));
      const l = this._project(this._colX(firstCol - 0.5, g), g.floorY, d, g);
      const r = this._project(this._colX(lastCol + 0.5, g), g.floorY, d, g);
      ctx.strokeStyle = isBar ? 'rgba(236,229,216,0.38)' : 'rgba(236,229,216,0.12)';
      ctx.lineWidth = isBar ? 2 * l.f + 0.5 : 1;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
    }

    // Phrase name markers on the floor
    ctx.textAlign = 'left';
    for (const p of this.phrases) {
      const d = dOf(p.sec);
      if (d < 0 || d > lookSong) continue;
      const pos = this._project(this._colX(lastCol + 0.6, g), g.floorY, d, g);
      ctx.fillStyle = 'rgba(236,229,216,0.65)';
      ctx.font = `600 ${Math.max(9, 14 * pos.f)}px ${FONT}`;
      ctx.fillText(p.name, Math.min(W - 60, pos.x + 4), pos.y - 4);
    }

    // Near-plane strings
    const nStr = g.nStr;
    for (let s = 0; s < nStr; s++) {
      const y = this._rowY(s, g);
      const l = this._project(this._colX(firstCol - 0.5, g), y, 0, g);
      const r = this._project(this._colX(lastCol + 0.5, g), y, 0, g);
      ctx.strokeStyle = this._colorOf(s);
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.5 + (nStr - s) * 0.5;
      ctx.beginPath();
      ctx.moveTo(l.x, y);
      ctx.lineTo(r.x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // label
      ctx.fillStyle = this._colorOf(s);
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(this.preset.strings[s].name, 6, y + 4);
    }

    // Column numbers under the strings
    ctx.textAlign = 'center';
    ctx.font = `600 11px ${FONT}`;
    for (let c = Math.max(0, firstCol); c <= lastCol; c++) {
      const x = this._colX(c, g);
      const rel = c - ab;
      ctx.fillStyle = rel >= 1 && rel <= 8 ? 'rgba(232,206,140,0.9)' : 'rgba(236,229,216,0.4)';
      ctx.fillText(String(c), x, g.floorY + 14);
    }
    ctx.fillStyle = 'rgba(232,206,140,0.9)';
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${positionName(this._positionOfBase(ab))} position`, 10, 38);

    // Notes (far → near)
    const visibleNotes = [];
    for (const n of this.notes) {
      if (n.sec + n.durSec < now - 0.4 * this.speed) continue;
      if (n.sec > now + lookSong) break;
      if (n.sec < this.rangeStart - 1e-6 || n.sec >= this.rangeEnd - 1e-6) continue;
      if (!this._visible(n)) continue;
      visibleNotes.push(n);
    }
    for (let i = visibleNotes.length - 1; i >= 0; i--) {
      this._drawNote(ctx, visibleNotes[i], now, g, lookSong);
    }

    // Pitch cursor
    this._drawPitchCursor(ctx, g, t);

    // Particles + popups
    this._drawFx(ctx);

    // Count-in
    if (this._state === 'playing' && now < this.rangeStart) {
      const beatsLeft = Math.ceil((this.rangeStart - now) / this._clickSec - 1e-6);
      if (beatsLeft > 0) {
        ctx.fillStyle = 'rgba(245,240,232,0.92)';
        ctx.font = `700 ${Math.min(96, H * 0.22)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(beatsLeft), W / 2, H * 0.4);
      }
    }

    // Phrase label + time
    const cur = this.phrases.find(p => now >= p.sec && now < p.endSec);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(236,229,216,0.85)';
    ctx.font = `600 13px ${FONT}`;
    if (cur) {
      const lvl = cur.level ?? this._levelFor(this.phrases.indexOf(cur));
      const lvTxt = this.opts.mode === 'learn' || (this.opts.mode === 'riff' && this.opts.riff.level === 'dynamic')
        ? ` · Level ${lvl}/${MAX_LEVEL}` : '';
      ctx.fillText(`${cur.name}${lvTxt}${cur.faded ? ' · MASTER MODE' : ''}`, 10, 20);
    }
    ctx.textAlign = 'right';
    ctx.fillText(`${fmtTime(Math.max(0, now) / this.speed)} / ${fmtTime(this.endSec / this.speed)}`, W - 10, 20);
  }

  _positionOfBase(b) {
    const BASE_POSITION = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10];
    return BASE_POSITION[Math.max(0, Math.min(BASE_POSITION.length - 1, Math.round(b)))];
  }

  _drawNote(ctx, n, now, g, lookSong) {
    const d0 = n.sec - now;
    const d1 = n.sec + n.durSec - now;
    const color = this._colorOf(n.string);
    const y = this._rowY(n.string, g);
    const isOpen = n.offset === 0;
    const firstCol = Math.floor(this._cam);
    const lastCol = Math.ceil(this._cam + g.span);

    // Master mode fade: notes vanish as they approach
    let alpha = 1;
    const p = this.phrases[n.phrase];
    if (p.faded) alpha = Math.max(0, Math.min(1, (d0 / lookSong - 0.35) / 0.25));
    if (n.state === 'miss') alpha *= 0.35;
    if (alpha <= 0.01 && n.state !== 'hit') return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Sustain tail
    if (n.durSec > 0.3 * this.beatSec * 2 || n.durSec / this.speed > 0.35) {
      const a = Math.max(0, d0);
      const b = Math.min(lookSong, d1);
      if (b > a) {
        const xc = isOpen ? null : this._colX(n.offset, g);
        const w = isOpen ? null : g.colW * 0.22;
        const pa = isOpen ? null : this._project(xc - w, y, a, g);
        const pb = isOpen ? null : this._project(xc + w, y, a, g);
        const pc = isOpen ? null : this._project(xc + w, y, b, g);
        const pd = isOpen ? null : this._project(xc - w, y, b, g);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * (n.state === 'hit' ? (n.holding ? 0.85 : 0.45) : 0.4);
        if (!isOpen) {
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.lineTo(pc.x, pc.y); ctx.lineTo(pd.x, pd.y);
          ctx.closePath();
          ctx.fill();
        } else {
          const l0 = this._project(this._colX(firstCol, g), y, a, g);
          const r0 = this._project(this._colX(lastCol, g), y, a, g);
          const l1 = this._project(this._colX(firstCol, g), y, b, g);
          const r1 = this._project(this._colX(lastCol, g), y, b, g);
          ctx.globalAlpha = alpha * 0.18;
          ctx.beginPath();
          ctx.moveTo(l0.x, l0.y); ctx.lineTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.lineTo(l1.x, l1.y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
      }
    }

    if (n.state === 'hit') { ctx.restore(); return; }
    if (d0 < -0.02 && n.state !== 'miss') {
      // passed the strike line, still pending (within late window) — draw at line
    }
    const d = Math.max(0, d0);

    if (isOpen) {
      // Open string: a bar across the visible columns (Rocksmith style)
      const l = this._project(this._colX(firstCol + 0.1, g), y, d, g);
      const r = this._project(this._colX(lastCol - 0.1, g), y, d, g);
      const h = g.rowH * 0.32 * l.f + 3;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.85;
      this._roundRect(ctx, l.x, l.y - h / 2, r.x - l.x, h, h / 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#1a2744';
      ctx.font = `700 ${Math.max(9, 18 * l.f)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('0', (l.x + r.x) / 2, l.y + 6 * l.f);
      if (this.settings.showNoteNames && l.f > 0.35) {
        const nn = midiToNoteName(n.midi);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `600 ${Math.max(8, 12 * l.f)}px ${FONT}`;
        ctx.fillText(`${nn.name}${nn.octave}`, (l.x + r.x) / 2 + 40 * l.f, l.y - h);
      }
      ctx.restore();
      return;
    }

    const c = this._project(this._colX(n.offset, g), y, d, g);
    const floor = this._project(this._colX(n.offset, g), g.floorY, d, g);
    const w = g.colW * 0.78 * c.f;
    const h = Math.min(g.rowH * 0.8, g.colW * 0.6) * c.f + 4;

    // stem to the floor
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = Math.max(1, 3 * c.f);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(floor.x, floor.y);
    ctx.stroke();
    // floor shadow
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.25;
    ctx.beginPath();
    ctx.ellipse(floor.x, floor.y, w * 0.45, 3 * c.f + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    // gem
    const grad = ctx.createLinearGradient(0, c.y - h / 2, 0, c.y + h / 2);
    grad.addColorStop(0, '#f5f0e8');
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    this._roundRect(ctx, c.x - w / 2, c.y - h / 2, w, h, Math.min(8, h / 3));
    ctx.fill();
    ctx.strokeStyle = n.state === 'miss' ? '#e06b6b' : 'rgba(245,240,232,0.9)';
    ctx.lineWidth = Math.max(1, 2 * c.f);
    ctx.stroke();

    // finger number
    ctx.fillStyle = '#1a2744';
    ctx.font = `700 ${Math.max(9, h * 0.62)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(n.finger), c.x, c.y + h * 0.22);

    if (this.settings.showNoteNames && c.f > 0.3) {
      const nn = midiToNoteName(n.midi);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `600 ${Math.max(8, 12 * c.f)}px ${FONT}`;
      ctx.fillText(`${nn.name}${nn.octave}`, c.x, c.y - h / 2 - 4 * c.f);
    }
    ctx.restore();
  }

  _drawPitchCursor(ctx, g, t) {
    const fresh = this._freq && performance.now() - this._freqTime < 150;
    if (!fresh) return;
    const midiF = 69 + 12 * Math.log2(this._freq / 440);

    // Target: earliest pending visible note near now
    let target = null;
    for (const n of this.notes) {
      if (n.state !== 'pending' || !this._visible(n)) continue;
      if (n.sec + n.durSec < t - 0.2) continue;
      target = n;
      break;
    }
    let s;
    if (target && Math.abs(target.sec - t) < 1.2 * this.speed) s = target.string;
    else {
      // nearest string where the pitch is playable low
      s = 0;
      const open = this.chart.openMidis;
      for (let i = open.length - 1; i >= 0; i--) if (midiF >= open[i] - 0.5) { s = i; break; }
    }
    const off = midiF - this.chart.openMidis[s];
    if (off < -1 || off > 20) return;
    const x = this._colX(off, g);
    const y = this._rowY(s, g);
    let col = '#c9d3e6';
    let label = '';
    if (target && target.string === s) {
      const cents = (midiF - target.midi) * 100;
      if (Math.abs(cents) <= this.settings.tolerance) col = '#8fd19a';
      else col = '#e8b25f';
      if (Math.abs(cents) < 150) label = `${cents > 0 ? '+' : ''}${Math.round(cents)}¢`;
    }
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (label) {
      ctx.fillStyle = col;
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 26);
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1.5 + Math.random() * 4;
      this._particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, color });
    }
  }

  _popup(x, y, text, color, scale = 1) {
    this._popups.push({ x, y, text, color, life: 1, scale });
  }

  _drawFx(ctx) {
    for (const p of this._particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.03;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    this._particles = this._particles.filter(p => p.life > 0);
    ctx.textAlign = 'center';
    for (const p of this._popups) {
      p.y -= 0.6; p.life -= 0.018;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.fillStyle = p.color;
      ctx.font = `800 ${Math.round(15 * p.scale)}px ${FONT}`;
      ctx.fillText(p.text, p.x, p.y);
    }
    this._popups = this._popups.filter(p => p.life > 0).slice(-14);
    ctx.globalAlpha = 1;
  }

  _renderTimeline() {
    const c = this.timeline;
    const ctx = c.getContext('2d');
    if (!ctx || !this.chart) return;
    const dpr = this._dpr || 1;
    const W = c.width / dpr;
    const H = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#e2dace';
    ctx.fillRect(0, 0, W, H);
    const total = this.endSec || 1;
    for (let i = 0; i < this.phrases.length; i++) {
      const p = this.phrases[i];
      const x0 = (p.sec / total) * W;
      const x1 = (p.endSec / total) * W;
      const lvl = p.level ?? this._levelFor(i);
      const key = levelKeyOf(p);
      const mastered = this.opts.mode === 'learn' && this.progress.phraseMastered[key];
      const inRange = p.sec >= this.rangeStart - 1e-6 && p.endSec <= this.rangeEnd + 1e-6;
      const hFrac = 0.25 + 0.75 * (lvl / MAX_LEVEL);
      ctx.fillStyle = !inRange ? 'rgba(90,106,136,0.25)'
        : mastered ? '#6b4c9a'
        : p.evaluated && p.acc != null ? (p.acc >= 0.85 ? '#228b22' : p.acc >= 0.5 ? '#c49a2a' : '#b83a3a')
        : '#5a6a88';
      ctx.fillRect(x0 + 1, H - H * hFrac, Math.max(1, x1 - x0 - 2), H * hFrac);
    }
    const x = (Math.max(0, this.songSec) / total) * W;
    ctx.fillStyle = '#1a2744';
    ctx.fillRect(x - 1, 0, 2, H);
  }

  _updateHud() {
    if (!this.chart || this._state === 'idle') return;
    const judged = (this.hits || 0) + (this.misses || 0);
    this.stScore.v.textContent = (this.score || 0).toLocaleString();
    this.stMult.v.textContent = `×${this.multiplier || 1}`;
    this.stStreak.v.textContent = String(this.streak || 0);
    this.stAcc.v.textContent = judged ? `${Math.round((this.hits / judged) * 100)}%` : '—';
    const maxS = this.opts.mode === 'score' ? SCORE_DIFFS[this.opts.difficulty].strikes : 0;
    this.stStrikes.v.textContent = maxS ? `${'✕'.repeat(this.strikes || 0)}${'·'.repeat(Math.max(0, maxS - (this.strikes || 0)))}` : '';
  }

  // ───────────────────────────── Overlays ─────────────────────────────

  _hideOverlay() {
    this.overlay.classList.add('hidden');
    this.overlay.replaceChildren();
  }

  _showOverlay(...children) {
    this.overlay.replaceChildren(...children);
    this.overlay.classList.remove('hidden');
  }

  _showTuningCheck() {
    this._state = 'tuning';
    const box = el('div', 'sp-card');
    box.append(el('h3', null, 'Tune Up'));
    box.append(el('p', 'sp-muted', `Play each open string. This song is arranged for ${this.preset.label}.`));
    const list = el('div', 'sp-tune-list');
    this._tuneRows = this.preset.strings.map((s, i) => {
      const row = el('div', 'sp-tune-row');
      const name = el('span', 'sp-tune-name', `${s.name}${s.octave}`);
      name.style.color = this._colorOf(i);
      const meter = el('div', 'sp-tune-meter');
      const needle = el('div', 'sp-tune-needle');
      meter.appendChild(needle);
      const val = el('span', 'sp-tune-val', '—');
      row.append(name, meter, val);
      list.appendChild(row);
      return { row, needle, val, freq: s.frequency, okFrames: 0, done: false };
    });
    box.appendChild(list);
    const btns = el('div', 'sp-card-btns');
    const go = el('button', 'sp-btn sp-btn-primary', 'Start song');
    go.addEventListener('click', () => this._beginPlay());
    const skip = el('button', 'sp-btn', 'Always skip tuning');
    skip.addEventListener('click', () => {
      this.settings.tuningCheck = false;
      saveSettings(this.settings);
      this._beginPlay();
    });
    btns.append(go, skip);
    box.appendChild(btns);
    this._showOverlay(box);
  }

  _updateTuning(freq) {
    if (!this._tuneRows) return;
    for (const r of this._tuneRows) {
      if (!freq) continue;
      const cents = 1200 * Math.log2(freq / r.freq);
      if (Math.abs(cents) > 80) continue;
      const clamped = Math.max(-50, Math.min(50, cents));
      r.needle.style.left = `${50 + clamped}%`;
      r.val.textContent = `${cents > 0 ? '+' : ''}${Math.round(cents)}¢`;
      if (Math.abs(cents) < 8) r.okFrames++;
      else r.okFrames = Math.max(0, r.okFrames - 1);
      if (r.okFrames > 12 && !r.done) {
        r.done = true;
        r.row.classList.add('ok');
        r.val.textContent = '✓ in tune';
      }
    }
    if (this._tuneRows.every(r => r.done)) {
      this._tuneRows = null;
      setTimeout(() => { if (this._state === 'tuning') this._beginPlay(); }, 600);
    }
  }

  _showPauseMenu() {
    const box = el('div', 'sp-card');
    box.append(el('h3', null, 'Paused'));
    const btns = el('div', 'sp-card-btns sp-card-btns--col');
    const resume = el('button', 'sp-btn sp-btn-primary', 'Resume');
    resume.addEventListener('click', () => this.resume());
    const restart = el('button', 'sp-btn', 'Restart');
    restart.addEventListener('click', () => this.restart());
    const riff = el('button', 'sp-btn', 'Riff Repeater this phrase');
    riff.addEventListener('click', () => {
      const now = this._pausedAt ?? 0;
      let idx = this.phrases.findIndex(p => now >= p.sec && now < p.endSec);
      if (idx < 0) idx = 0;
      this.stop();
      this.onRiffRequest?.(this.song, idx, idx);
    });
    const exit = el('button', 'sp-btn', 'Back to library');
    exit.addEventListener('click', () => this.exit());
    btns.append(resume, restart, riff, exit);
    box.appendChild(btns);

    const lat = el('label', 'sp-setting');
    lat.append(el('span', null, 'Latency offset'));
    const li = el('input');
    li.type = 'range'; li.min = '0'; li.max = '300'; li.step = '10';
    li.value = String(this.settings.latencyMs);
    const lv = el('span', null, `${this.settings.latencyMs} ms`);
    li.addEventListener('input', () => {
      this.settings.latencyMs = Number(li.value);
      lv.textContent = `${li.value} ms`;
      saveSettings(this.settings);
    });
    lat.append(li, lv);

    const tol = el('label', 'sp-setting');
    tol.append(el('span', null, 'Pitch tolerance'));
    const ti = el('input');
    ti.type = 'range'; ti.min = '10'; ti.max = '60'; ti.step = '5';
    ti.value = String(this.settings.tolerance);
    const tv = el('span', null, `±${this.settings.tolerance}¢`);
    ti.addEventListener('input', () => {
      this.settings.tolerance = Number(ti.value);
      tv.textContent = `±${ti.value}¢`;
      saveSettings(this.settings);
    });
    tol.append(ti, tv);
    box.append(lat, tol);
    this._showOverlay(box);
  }

  _showResults({ acc, medal, newBest }) {
    const box = el('div', 'sp-card sp-results');
    const title = this.failed ? 'Song Failed' : 'Song Complete';
    box.append(el('h3', null, title));
    box.append(el('div', 'sp-muted', this.title));

    const grid = el('div', 'sp-res-grid');
    const add = (label, value) => {
      const c = el('div', 'sp-res-item');
      c.append(el('div', 'sp-res-value', value), el('div', 'sp-res-label', label));
      grid.appendChild(c);
    };
    add('Accuracy', `${Math.round(acc * 100)}%`);
    add('Notes hit', `${this.hits}/${this.hits + this.misses}`);
    add('Best streak', String(this.bestStreak));
    add('Perfect', String(this.perfects));
    if (this.opts.mode === 'score') add('Score', this.score.toLocaleString());
    if (this.opts.mode === 'learn') add('Mastery', `${this.progress.mastery}%`);
    box.appendChild(grid);

    if (medal) {
      const m = el('div', `sp-medal sp-medal--${medal}`, `${medal.toUpperCase()} MEDAL`);
      box.appendChild(m);
    }
    if (newBest) box.appendChild(el('div', 'sp-newbest', 'New high score!'));

    // Phrase breakdown
    const ph = el('div', 'sp-res-phrases');
    let worst = null;
    this.phrases.forEach((p, i) => {
      if (p.total === 0) return;
      const a = p.hits / p.total;
      if (!worst || a < worst.a) worst = { i, a };
      const bar = el('div', 'sp-res-phrase');
      bar.title = `${p.name}: ${Math.round(a * 100)}%`;
      const fill = el('div', 'sp-res-phrase-fill');
      fill.style.height = `${Math.max(6, a * 100)}%`;
      fill.style.background = a >= 0.85 ? 'var(--green)' : a >= 0.5 ? 'var(--yellow)' : 'var(--red)';
      bar.appendChild(fill);
      ph.appendChild(bar);
    });
    box.appendChild(ph);

    const btns = el('div', 'sp-card-btns');
    const again = el('button', 'sp-btn sp-btn-primary', 'Play again');
    again.addEventListener('click', () => this.restart());
    btns.appendChild(again);
    if (worst && worst.a < 0.9) {
      const riff = el('button', 'sp-btn', `Practice "${this.phrases[worst.i].name}"`);
      riff.addEventListener('click', () => {
        this.stop();
        this.onRiffRequest?.(this.song, worst.i, worst.i);
      });
      btns.appendChild(riff);
    }
    const back = el('button', 'sp-btn', 'Library');
    back.addEventListener('click', () => this.exit());
    btns.appendChild(back);
    box.appendChild(btns);
    this._showOverlay(box);
  }

  /** Preview frequency of a note for UI (used by browser). */
  static noteFreq(midi) {
    return midiToFrequency(midi);
  }
}
