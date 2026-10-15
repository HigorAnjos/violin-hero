import { CustomDropdown } from './custom-dropdown.js';
import { TUNING_PRESETS, DEFAULT_TUNING } from '../audio/tunings.js';
import { GENRES } from '../songs/library/index.js';
import { allSongs, getChart, songMeta, addUserSong, removeUserSong, getParsed, exportUserSongs, importUserSongs } from '../songs/catalog.js';
import { getProgress, resetProgress } from '../songs/progress-store.js';
import { splitTunes, parseABC } from '../songs/abc-parser.js';
import { MAX_LEVEL } from '../songs/song-model.js';
import { searchSession, fetchSessionTune, SESSION_TYPES } from '../songs/session-api.js';
import { parseMidi, describeTracks, midiTrackToParsed } from '../songs/midi-import.js';

/**
 * Song library browser: search, filter, sort, song details and mode launcher,
 * plus online search (The Session) and ABC / MIDI import.
 */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function fmtDur(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const DIFF_ORDER = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];

export class SongBrowser {
  constructor(container) {
    this.container = container;
    this.onPlay = null; // (song, chart, opts) => void

    this.tuningKey = DEFAULT_TUNING;
    this._view = 'library'; // library | mine | online | import
    this._query = '';
    this._genre = 'All';
    this._difficulty = 'All';
    this._sort = 'recommended';
    this._selected = null;
    this._metaCache = new Map();

    this._build();
    this.refresh();
  }

  setTuning(tuningKey) {
    if (!TUNING_PRESETS[tuningKey] || tuningKey === this.tuningKey) return;
    this.tuningKey = tuningKey;
    this._metaCache.clear();
    if (this.tuningDropdown) this.tuningDropdown.value = tuningKey;
    this.refresh();
  }

  _meta(song) {
    const key = `${song.id}|${this.tuningKey}`;
    let m = this._metaCache.get(key);
    if (!m) {
      try {
        m = songMeta(song, this.tuningKey);
      } catch (err) {
        console.warn('Bad song', song.id, err);
        m = null;
      }
      this._metaCache.set(key, m);
    }
    return m;
  }

  // ───────────────────────────── Layout ─────────────────────────────

  _build() {
    const root = el('div', 'sb-root');
    this.root = root;

    // Top bar
    const top = el('div', 'sb-top');
    const brand = el('div', 'sb-brand');
    brand.append(el('div', 'sb-brand-title', 'Song Play'));
    top.appendChild(brand);

    const tabs = el('div', 'sb-tabs');
    this._tabBtns = {};
    for (const [id, label] of [['library', 'Library'], ['mine', 'My Songs'], ['online', 'Find Online'], ['import', 'Import']]) {
      const b = el('button', 'sb-tab', label);
      b.addEventListener('click', () => this.showView(id));
      tabs.appendChild(b);
      this._tabBtns[id] = b;
    }
    top.appendChild(tabs);

    const tuneWrap = el('div', 'sb-tuning');
    tuneWrap.append(el('span', 'sb-label', 'Instrument'));
    const ddWrap = el('div', 'sb-dd');
    this.tuningDropdown = new CustomDropdown(ddWrap, { placeholder: 'Tuning' });
    const families = {};
    for (const [key, preset] of Object.entries(TUNING_PRESETS)) {
      (families[preset.family] = families[preset.family] || []).push({ value: key, label: preset.label });
    }
    this.tuningDropdown.setGroupedItems(Object.entries(families).map(([label, items]) => ({ label, items })));
    this.tuningDropdown.value = this.tuningKey;
    this.tuningDropdown.onChange = (v) => this.setTuning(v);
    tuneWrap.appendChild(ddWrap);
    top.appendChild(tuneWrap);

    root.appendChild(top);

    // Audio input bar (built-in / wired headset / USB interface)
    this.inputSlot = el('div', 'sb-input-slot');
    root.appendChild(this.inputSlot);

    // Body: list + detail
    const body = el('div', 'sb-body');
    this.listPane = el('div', 'sb-list-pane');
    this.detailPane = el('div', 'sb-detail-pane');
    body.append(this.listPane, this.detailPane);
    root.appendChild(body);

    this.container.appendChild(root);
  }

  /**
   * Switch to a section (Library / My Songs / Find Online / Import).
   * Always starts that section fresh: closes any open song and clears the search,
   * since clicking a section tab means the player wants to leave what they were viewing.
   */
  showView(id) {
    this._view = id;
    this._query = '';
    this._selected = null;
    this._onlineAutoRun = true;
    this._onlineQuery = '';
    this._onlineType = '';
    this.root.classList.remove('detail-open');
    this.refresh();
    this.root.scrollIntoView?.({ block: 'start' });
  }

  refresh() {
    for (const [id, b] of Object.entries(this._tabBtns)) b.classList.toggle('active', id === this._view);
    this.listPane.replaceChildren();
    if (this._view === 'library' || this._view === 'mine') this._renderList();
    else if (this._view === 'online') this._renderOnline();
    else this._renderImport();
    this._renderDetail();
  }

  // ───────────────────────────── Library list ─────────────────────────────

  _renderList() {
    const pane = this.listPane;
    const mine = this._view === 'mine';

    const filters = el('div', 'sb-filters');
    const search = el('input', 'sb-search');
    search.type = 'search';
    search.placeholder = mine ? 'Search my songs…' : 'Search songs, composers, origins…';
    search.value = this._query;
    search.addEventListener('input', () => {
      this._query = search.value;
      this._renderCards(cards, mine);
    });
    filters.appendChild(search);

    const row = el('div', 'sb-filter-row');
    const diffWrap = el('div', 'sb-dd sb-dd--small');
    const diffDD = new CustomDropdown(diffWrap, { placeholder: 'Difficulty' });
    diffDD.setItems([{ value: 'All', label: 'All levels' }, ...DIFF_ORDER.map(d => ({ value: d, label: d }))]);
    diffDD.value = this._difficulty;
    diffDD.onChange = (v) => { this._difficulty = v; this._renderCards(cards, mine); };
    const sortWrap = el('div', 'sb-dd sb-dd--small');
    const sortDD = new CustomDropdown(sortWrap, { placeholder: 'Sort' });
    sortDD.setItems([
      { value: 'recommended', label: 'Recommended' },
      { value: 'title', label: 'Title A–Z' },
      { value: 'easy', label: 'Easiest first' },
      { value: 'hard', label: 'Hardest first' },
      { value: 'mastery', label: 'Mastery' },
      { value: 'recent', label: 'Recently played' },
      { value: 'short', label: 'Shortest' },
    ]);
    sortDD.value = this._sort;
    sortDD.onChange = (v) => { this._sort = v; this._renderCards(cards, mine); };
    row.append(diffWrap, sortWrap);
    filters.appendChild(row);

    if (!mine) {
      const chips = el('div', 'sb-chips');
      for (const g of ['All', ...GENRES]) {
        const c = el('button', 'sb-chip', g);
        c.classList.toggle('active', this._genre === g);
        c.addEventListener('click', () => {
          this._genre = g;
          chips.querySelectorAll('.sb-chip').forEach(x => x.classList.toggle('active', x === c));
          this._renderCards(cards, mine);
        });
        chips.appendChild(c);
      }
      filters.appendChild(chips);
    }

    pane.appendChild(filters);
    this._countEl = el('div', 'sb-count');
    pane.appendChild(this._countEl);
    const cards = el('div', 'sb-cards');
    pane.appendChild(cards);
    this._renderCards(cards, mine);
  }

  _filteredSongs(mine) {
    const q = this._query.trim().toLowerCase();
    let songs = allSongs().filter(s => (mine ? s.source === 'user' : s.source === 'builtin'));
    const rows = [];
    for (const s of songs) {
      const m = this._meta(s);
      if (!m) continue;
      if (!mine && this._genre !== 'All' && s.genre !== this._genre) continue;
      if (this._difficulty !== 'All' && m.difficulty.label !== this._difficulty) continue;
      if (q) {
        const hay = `${m.title} ${m.composer} ${s.genre} ${m.key} ${m.rhythm}`.toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) continue;
      }
      rows.push({ song: s, meta: m, progress: getProgress(s.id) });
    }
    const by = {
      recommended: (a, b) => (b.progress.lastPlayed ? 1 : 0) - (a.progress.lastPlayed ? 1 : 0) || a.meta.difficulty.score - b.meta.difficulty.score,
      title: (a, b) => a.meta.title.localeCompare(b.meta.title),
      easy: (a, b) => a.meta.difficulty.score - b.meta.difficulty.score,
      hard: (a, b) => b.meta.difficulty.score - a.meta.difficulty.score,
      mastery: (a, b) => (b.progress.mastery || 0) - (a.progress.mastery || 0),
      recent: (a, b) => (b.progress.lastPlayed || 0) - (a.progress.lastPlayed || 0),
      short: (a, b) => a.meta.duration - b.meta.duration,
    }[this._sort];
    rows.sort(by);
    return rows;
  }

  _renderCards(cards, mine) {
    cards.replaceChildren();
    const rows = this._filteredSongs(mine);
    this._countEl.textContent = `${rows.length} song${rows.length === 1 ? '' : 's'}`;
    if (rows.length === 0) {
      cards.appendChild(el('div', 'sb-empty', mine
        ? 'No songs yet. Use "Find Online" or "Import" to add tunes, or load a MIDI file of any song you own.'
        : 'No songs match these filters.'));
      return;
    }
    const frag = document.createDocumentFragment();
    for (const { song, meta, progress } of rows) {
      const card = el('button', 'sb-card');
      if (this._selected?.id === song.id) card.classList.add('selected');
      card.addEventListener('click', () => {
        this._selected = song;
        cards.querySelectorAll('.sb-card').forEach(c => c.classList.toggle('selected', c === card));
        this._renderDetail();
        this.root.classList.add('detail-open');
      });

      const ring = el('div', 'sb-ring');
      const pct = Math.min(110, progress.mastery || 0);
      ring.style.setProperty('--pct', String(Math.min(100, pct)));
      ring.appendChild(el('span', null, `${pct}%`));
      if (pct >= 100) ring.classList.add('mastered');

      const info = el('div', 'sb-card-info');
      info.append(el('div', 'sb-card-title', meta.title));
      info.append(el('div', 'sb-card-sub', meta.composer || song.genre));
      const tags = el('div', 'sb-card-tags');
      tags.append(el('span', `sb-pill sb-pill--genre`, song.genre));
      tags.append(el('span', 'sb-pill', `${meta.key} · ${meta.meter}`));
      tags.append(el('span', 'sb-pill', fmtDur(meta.duration)));
      info.appendChild(tags);

      const diff = el('div', 'sb-diff');
      const bars = el('div', 'sb-diff-bars');
      const lvl = Math.ceil(meta.difficulty.score / 2);
      for (let i = 1; i <= 5; i++) bars.appendChild(el('span', i <= lvl ? 'on' : ''));
      diff.append(bars, el('div', 'sb-diff-label', meta.difficulty.label));
      const medals = Object.values(progress.medal || {});
      if (medals.length) {
        const best = ['platinum', 'gold', 'silver', 'bronze'].find(m => medals.includes(m));
        diff.appendChild(el('div', `sb-medal-dot sb-medal-dot--${best}`, '●'));
      }

      card.append(ring, info, diff);
      frag.appendChild(card);
    }
    cards.appendChild(frag);
  }

  // ───────────────────────────── Detail / launcher ─────────────────────────────

  _renderDetail() {
    const pane = this.detailPane;
    pane.replaceChildren();
    const song = this._selected;
    if (!song) {
      const hint = el('div', 'sb-detail-empty');
      hint.append(el('div', 'sb-detail-empty-title', 'Choose a song'));
      pane.appendChild(hint);
      return;
    }
    let chart;
    let meta;
    try {
      chart = getChart(song, this.tuningKey);
      meta = this._meta(song);
    } catch (err) {
      pane.appendChild(el('div', 'sb-error', `This song could not be loaded: ${err.message}`));
      return;
    }
    const progress = getProgress(song.id);

    const close = el('button', 'sb-detail-close', '←  Songs');
    close.addEventListener('click', () => this.root.classList.remove('detail-open'));
    pane.appendChild(close);

    pane.append(el('h2', 'sb-detail-title', meta.title));
    pane.append(el('div', 'sb-detail-sub', [meta.composer, song.genre].filter(Boolean).join(' · ')));

    const stats = el('div', 'sb-stats');
    const stat = (label, value) => {
      const s = el('div', 'sb-stat');
      s.append(el('div', 'sb-stat-v', value), el('div', 'sb-stat-l', label));
      stats.appendChild(s);
    };
    stat('Difficulty', `${meta.difficulty.score}/10`);
    stat('Notes', String(meta.notes));
    stat('Length', fmtDur(meta.duration));
    stat('Tempo (bpm)', String(meta.tempo));
    stat('Key', meta.key);
    stat('Positions', meta.maxPosition > 1 ? `1st–${meta.maxPosition}${['', 'st', 'nd', 'rd'][meta.maxPosition] || 'th'}` : '1st');
    pane.appendChild(stats);

    if (chart.transpose) {
      pane.appendChild(el('div', 'sb-note', `Transposed ${chart.transpose > 0 ? 'up' : 'down'} ${Math.abs(chart.transpose / 12)} octave${Math.abs(chart.transpose) > 12 ? 's' : ''} to fit ${TUNING_PRESETS[this.tuningKey].label}.`));
    }

    // Progress
    const prog = el('div', 'sb-progress');
    const mastery = el('div', 'sb-mastery');
    mastery.append(el('div', 'sb-mastery-label', 'Mastery'));
    const bar = el('div', 'sb-mastery-bar');
    const fill = el('div', 'sb-mastery-fill');
    fill.style.width = `${Math.min(100, progress.mastery || 0) / 1.1}%`;
    if ((progress.mastery || 0) > 100) fill.classList.add('over');
    bar.appendChild(fill);
    mastery.append(bar, el('div', 'sb-mastery-val', `${progress.mastery || 0}%`));
    prog.appendChild(mastery);

    // Phrase levels map
    const levels = el('div', 'sb-levels');
    const keys = [];
    for (const p of chart.phrases) {
      const k = p.name.replace(' (repeat)', '');
      const lvl = progress.phraseLevels?.[k] ?? 0;
      const m = progress.phraseMastered?.[k];
      const b = el('div', 'sb-level');
      b.title = `${p.name}: level ${lvl}/${MAX_LEVEL}${m ? ' (mastered)' : ''}`;
      const f = el('div', 'sb-level-fill');
      f.style.height = `${20 + (lvl / MAX_LEVEL) * 80}%`;
      if (m) f.classList.add('mastered');
      b.appendChild(f);
      levels.appendChild(b);
      keys.push(k);
    }
    prog.appendChild(levels);

    const best = el('div', 'sb-best');
    const bs = progress.bestScore || {};
    const scoreTxt = ['easy', 'medium', 'hard', 'master']
      .filter(d => bs[d])
      .map(d => `${d[0].toUpperCase() + d.slice(1)} ${bs[d].toLocaleString()}${progress.medal?.[d] ? ` (${progress.medal[d]})` : ''}`)
      .join(' · ');
    best.textContent = `Plays: ${progress.plays || 0} · Best accuracy: ${progress.bestAccuracy || 0}% · Best streak: ${progress.bestStreak || 0}${scoreTxt ? ` · ${scoreTxt}` : ''}`;
    prog.appendChild(best);
    pane.appendChild(prog);

    // ── Mode launcher ──
    const modes = el('div', 'sb-modes');

    const learn = el('div', 'sb-mode');
    learn.append(el('div', 'sb-mode-title', 'Learn a Song'));
    const learnBtn = el('button', 'sb-btn sb-btn-primary', 'Play');
    learnBtn.addEventListener('click', () => this.onPlay?.(song, chart, { mode: 'learn' }));
    learn.appendChild(learnBtn);
    modes.appendChild(learn);

    const score = el('div', 'sb-mode');
    score.append(el('div', 'sb-mode-title', 'Score Attack'));
    const sbtns = el('div', 'sb-btn-row');
    for (const [d, label] of [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['master', 'Master']]) {
      const b = el('button', 'sb-btn', label);
      if (d === 'master' && !(progress.medal?.hard === 'gold' || progress.medal?.hard === 'platinum')) {
        b.title = 'Tip: earn Gold on Hard first. Master hides the notes as they approach.';
      }
      b.addEventListener('click', () => this.onPlay?.(song, chart, { mode: 'score', difficulty: d }));
      sbtns.appendChild(b);
    }
    score.appendChild(sbtns);
    modes.appendChild(score);

    const riff = el('div', 'sb-mode');
    riff.append(el('div', 'sb-mode-title', 'Riff Repeater'));
    const rgrid = el('div', 'sb-riff-grid');
    const phraseItems = chart.phrases.map((p, i) => ({ value: String(i), label: `${i + 1}. ${p.name}` }));
    const fromWrap = el('div', 'sb-dd sb-dd--small');
    const fromDD = new CustomDropdown(fromWrap, { placeholder: 'From' });
    fromDD.setItems(phraseItems);
    fromDD.value = '0';
    const toWrap = el('div', 'sb-dd sb-dd--small');
    const toDD = new CustomDropdown(toWrap, { placeholder: 'To' });
    toDD.setItems(phraseItems);
    toDD.value = String(Math.min(chart.phrases.length - 1, 1));
    const lvlWrap = el('div', 'sb-dd sb-dd--small');
    const lvlDD = new CustomDropdown(lvlWrap, { placeholder: 'Level' });
    lvlDD.setItems([{ value: 'dynamic', label: 'Dynamic' }, ...Array.from({ length: MAX_LEVEL + 1 }, (_, i) => ({ value: String(i), label: i === MAX_LEVEL ? `Level ${i} (all notes)` : `Level ${i}` }))]);
    lvlDD.value = String(MAX_LEVEL);
    const lab = (t, w) => { const d = el('label', 'sb-field'); d.append(el('span', 'sb-label', t), w); return d; };
    rgrid.append(lab('From', fromWrap), lab('To', toWrap), lab('Level', lvlWrap));
    const speedRow = el('label', 'sb-field sb-field--wide');
    speedRow.append(el('span', 'sb-label', 'Speed'));
    const speed = el('input');
    speed.type = 'range'; speed.min = '25'; speed.max = '125'; speed.step = '5'; speed.value = '70';
    const speedVal = el('span', 'sb-speed-val', '70%');
    speed.addEventListener('input', () => { speedVal.textContent = `${speed.value}%`; });
    speedRow.append(speed, speedVal);
    rgrid.appendChild(speedRow);
    const trainerRow = el('label', 'sb-check');
    const trainer = el('input');
    trainer.type = 'checkbox';
    trainer.checked = true;
    trainerRow.append(trainer, el('span', null, 'Speed Trainer'));
    rgrid.appendChild(trainerRow);
    riff.appendChild(rgrid);
    const riffBtn = el('button', 'sb-btn sb-btn-primary', 'Start loop');
    riffBtn.addEventListener('click', () => {
      let from = Number(fromDD.value || 0);
      let to = Number(toDD.value || 0);
      if (to < from) [from, to] = [to, from];
      const lv = lvlDD.value === 'dynamic' ? 'dynamic' : Number(lvlDD.value);
      this.onPlay?.(song, chart, { mode: 'riff', riff: { from, to, level: lv, speed: Number(speed.value), trainer: trainer.checked } });
    });
    riff.appendChild(riffBtn);
    modes.appendChild(riff);
    pane.appendChild(modes);

    // Footer actions
    const foot = el('div', 'sb-detail-foot');
    const reset = el('button', 'sb-link', 'Reset progress');
    reset.addEventListener('click', () => {
      if (confirm(`Reset all progress for "${meta.title}"?`)) {
        resetProgress(song.id);
        this.refresh();
      }
    });
    foot.appendChild(reset);
    if (song.source === 'user') {
      const del = el('button', 'sb-link sb-link--danger', 'Remove from My Songs');
      del.addEventListener('click', () => {
        if (confirm(`Remove "${meta.title}"?`)) {
          removeUserSong(song.id);
          this._selected = null;
          this.refresh();
        }
      });
      foot.appendChild(del);
    }
    if (song.abc) {
      const view = el('button', 'sb-link', 'View ABC');
      view.addEventListener('click', () => {
        const pre = el('pre', 'sb-abc', song.abc);
        view.replaceWith(pre);
      });
      foot.appendChild(view);
    }
    pane.appendChild(foot);
  }

  /** Programmatically open Riff Repeater for given phrases (from the player). */
  openRiff(song, from, to) {
    const chart = getChart(song, this.tuningKey);
    this.onPlay?.(song, chart, { mode: 'riff', riff: { from, to, level: MAX_LEVEL, speed: 70, trainer: true } });
  }

  // ───────────────────────────── Online (The Session) ─────────────────────────────

  _renderOnline() {
    const pane = this.listPane;
    const box = el('div', 'sb-online');
    box.append(el('div', 'sb-online-title', 'Search The Session'));
    box.append(el('p', 'sb-muted', 'Tens of thousands of traditional Irish, Scottish and other folk tunes, transcribed by the community at thesession.org. Search by name, or leave the box empty to browse the most popular tunes.'));

    const row = el('div', 'sb-online-row');
    const input = el('input', 'sb-search');
    input.type = 'search';
    input.placeholder = 'e.g. Drowsy Maggie, Kesh, Butterfly…';
    input.value = this._onlineQuery || '';
    const typeWrap = el('div', 'sb-dd sb-dd--small');
    const typeDD = new CustomDropdown(typeWrap, { placeholder: 'Any type' });
    typeDD.setItems([{ value: '', label: 'Any type' }, ...SESSION_TYPES.map(t => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))]);
    typeDD.value = this._onlineType || '';
    const go = el('button', 'sb-btn sb-btn-primary', 'Search');
    row.append(input, typeWrap, go);
    box.appendChild(row);

    const results = el('div', 'sb-online-results');
    box.appendChild(results);
    const credit = el('div', 'sb-credit');
    credit.innerHTML = 'Contains information from <a href="https://thesession.org" target="_blank" rel="noopener">The Session</a>, made available under the <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener">Open Database License (ODbL)</a>.';
    box.appendChild(credit);
    pane.appendChild(box);

    const run = async (page = 1) => {
      this._onlineQuery = input.value.trim();
      this._onlineType = typeDD.value;
      results.replaceChildren(el('div', 'sb-muted', 'Searching…'));
      try {
        const res = await searchSession(this._onlineQuery, { type: this._onlineType, page });
        results.replaceChildren();
        results.appendChild(el('div', 'sb-count', `${res.total.toLocaleString()} tunes · page ${res.page} of ${res.pages}`));
        for (const t of res.tunes) {
          const r = el('div', 'sb-online-item');
          r.append(el('div', 'sb-online-name', t.name), el('span', 'sb-pill', t.type));
          const load = el('button', 'sb-btn', 'Open');
          load.addEventListener('click', () => this._openSessionTune(t.id, r));
          r.appendChild(load);
          results.appendChild(r);
        }
        const nav = el('div', 'sb-btn-row');
        if (res.page > 1) { const b = el('button', 'sb-btn', '← Prev'); b.addEventListener('click', () => run(res.page - 1)); nav.appendChild(b); }
        if (res.page < res.pages) { const b = el('button', 'sb-btn', 'Next →'); b.addEventListener('click', () => run(res.page + 1)); nav.appendChild(b); }
        results.appendChild(nav);
      } catch (err) {
        results.replaceChildren(el('div', 'sb-error', `Could not reach The Session (${err.message}). Check your internet connection.`));
      }
    };
    go.addEventListener('click', () => run(1));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(1); });
    if (this._onlineAutoRun !== false) { this._onlineAutoRun = false; run(1); }
  }

  async _openSessionTune(id, rowEl) {
    const panel = el('div', 'sb-online-settings');
    panel.textContent = 'Loading…';
    rowEl.after(panel);
    try {
      const tune = await fetchSessionTune(id);
      panel.replaceChildren();
      panel.appendChild(el('div', 'sb-muted', `${tune.settings.length} setting${tune.settings.length === 1 ? '' : 's'}. Each one is a different transcription:`));
      tune.settings.slice(0, 12).forEach((s, i) => {
        const r = el('div', 'sb-online-setting');
        let info = '';
        try {
          const p = parseABC(s.abc);
          const c = getChart({ id: `session-${id}-${s.settingId}`, abc: s.abc }, this.tuningKey);
          info = `${p.key.label} · ${c.notes.length} notes · ${c.difficulty.label}`;
        } catch {
          info = 'unparseable';
        }
        r.append(el('span', null, `Setting ${i + 1}`), el('span', 'sb-muted', info));
        const add = el('button', 'sb-btn sb-btn-primary', 'Add to My Songs');
        add.addEventListener('click', () => {
          const song = addUserSong({ title: tune.name, abc: s.abc, origin: `The Session #${tune.id}` });
          this._selected = song;
          this._view = 'mine';
          this.refresh();
          this.root.classList.add('detail-open');
        });
        r.appendChild(add);
        panel.appendChild(r);
      });
      const link = el('a', 'sb-link', 'View on thesession.org ↗');
      link.href = tune.url;
      link.target = '_blank';
      link.rel = 'noopener';
      panel.appendChild(link);
    } catch (err) {
      panel.textContent = `Failed to load tune: ${err.message}`;
    }
  }

  // ───────────────────────────── Import ─────────────────────────────

  _renderImport() {
    const pane = this.listPane;
    const box = el('div', 'sb-import');
    box.append(el('div', 'sb-online-title', 'Import songs'));
    box.append(el('p', 'sb-muted', 'Bring your own music. Load a MIDI file (any song you own: rock, pop, film, games…) and pick the melody track. Or paste or load ABC notation from sites like abcnotation.com. Imported songs stay in this browser under My Songs.'));

    // File picker
    const fileRow = el('div', 'sb-file-row');
    const file = el('input');
    file.type = 'file';
    file.accept = '.mid,.midi,.abc,.txt,audio/midi,audio/x-midi';
    file.id = 'sb-file-input';
    const fileLabel = el('label', 'sb-btn sb-btn-primary', 'Choose MIDI / ABC file…');
    fileLabel.htmlFor = 'sb-file-input';
    fileRow.append(fileLabel, file);
    box.appendChild(fileRow);
    const fileOut = el('div', 'sb-import-out');
    box.appendChild(fileOut);

    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      fileOut.replaceChildren();
      try {
        if (/\.(mid|midi)$/i.test(f.name)) {
          const buf = await f.arrayBuffer();
          const midi = parseMidi(buf);
          const { tracks, suggested } = describeTracks(midi);
          if (tracks.length === 0) throw new Error('No melodic tracks found');
          fileOut.appendChild(el('div', 'sb-muted', 'Pick the track to play (the likely melody is highlighted):'));
          const baseTitle = f.name.replace(/\.(mid|midi)$/i, '');
          for (const t of tracks) {
            const r = el('div', 'sb-online-setting');
            if (t.index === suggested) r.classList.add('suggested');
            r.append(el('span', null, t.name), el('span', 'sb-muted', `${t.family || 'Instrument'} · ${t.count} notes`));
            const add = el('button', 'sb-btn sb-btn-primary', 'Add');
            add.addEventListener('click', () => {
              const parsed = midiTrackToParsed(midi, t.index, `${baseTitle}${tracks.length > 1 ? ` (${t.name})` : ''}`);
              const song = addUserSong({ title: parsed.title, parsed, origin: 'MIDI import' });
              this._selected = song;
              this._view = 'mine';
              this.refresh();
              this.root.classList.add('detail-open');
            });
            r.appendChild(add);
            fileOut.appendChild(r);
          }
        } else {
          const text = await f.text();
          this._importAbcText(text, fileOut);
        }
      } catch (err) {
        fileOut.appendChild(el('div', 'sb-error', `Import failed: ${err.message}`));
      }
      file.value = '';
    });

    // Paste ABC
    box.appendChild(el('div', 'sb-label sb-label--block', 'Paste ABC notation'));
    const ta = el('textarea', 'sb-abc-input');
    ta.placeholder = 'X:1\nT:My Tune\nM:4/4\nL:1/8\nQ:1/4=100\nK:D\n|:DEFG A2 FA|...';
    ta.rows = 9;
    box.appendChild(ta);
    const pasteOut = el('div', 'sb-import-out');
    const addBtn = el('button', 'sb-btn sb-btn-primary', 'Add tune(s)');
    addBtn.addEventListener('click', () => this._importAbcText(ta.value, pasteOut));
    box.append(addBtn, pasteOut);

    // Backup & restore (the whole My Songs library + scores, not a single tune)
    box.appendChild(el('div', 'sb-label sb-label--block', 'Backup your library'));
    box.appendChild(el('p', 'sb-muted', 'My Songs lives only in this browser. Export it to a file to keep a copy or move it to another device, and restore from that file later — restoring is safe to repeat, it won’t create duplicates.'));

    const backupRow = el('div', 'sb-file-row');
    const exportBtn = el('button', 'sb-btn', 'Export My Songs…');
    exportBtn.addEventListener('click', () => this._exportUserSongs());
    const restoreFile = el('input');
    restoreFile.type = 'file';
    restoreFile.accept = 'application/json,.json';
    restoreFile.id = 'sb-backup-input';
    const restoreLabel = el('label', 'sb-btn', 'Restore from file…');
    restoreLabel.htmlFor = 'sb-backup-input';
    backupRow.append(exportBtn, restoreLabel, restoreFile);
    box.appendChild(backupRow);
    const backupOut = el('div', 'sb-import-out');
    box.appendChild(backupOut);

    restoreFile.addEventListener('change', async () => {
      const f = restoreFile.files?.[0];
      if (!f) return;
      backupOut.replaceChildren();
      try {
        const data = JSON.parse(await f.text());
        const count = importUserSongs(data);
        this._metaCache.clear();
        backupOut.appendChild(el('div', 'sb-ok', `Restored ${count} song${count === 1 ? '' : 's'} to My Songs.`));
      } catch (err) {
        backupOut.appendChild(el('div', 'sb-error', `Restore failed: ${err.message}`));
      }
      restoreFile.value = '';
    });

    pane.appendChild(box);
  }

  _exportUserSongs() {
    const blob = new Blob([JSON.stringify(exportUserSongs(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = `violin-hero-my-songs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  _importAbcText(text, out) {
    out.replaceChildren();
    const tunes = splitTunes(text);
    if (tunes.length === 0) {
      out.appendChild(el('div', 'sb-error', 'No ABC tunes found. A tune needs at least a K: (key) line.'));
      return;
    }
    let added = 0;
    let last = null;
    for (const abc of tunes) {
      try {
        const p = parseABC(abc);
        if (p.notes.length < 2) throw new Error('no notes');
        last = addUserSong({ title: p.title, abc, origin: 'ABC import' });
        added++;
      } catch (err) {
        out.appendChild(el('div', 'sb-error', `Skipped a tune: ${err.message}`));
      }
    }
    if (added) {
      out.appendChild(el('div', 'sb-ok', `Added ${added} tune${added === 1 ? '' : 's'} to My Songs.`));
      this._selected = last;
      this._view = 'mine';
      this.refresh();
      this.root.classList.add('detail-open');
    }
  }

  /** Song lookup by id (for re-entry from the player). */
  findSong(id) {
    return allSongs().find(s => s.id === id) || null;
  }

  /** Re-render after progress changes. */
  updateProgress() {
    if (this._view === 'library' || this._view === 'mine') this.refresh();
    else this._renderDetail();
  }

  static parsedFor(song) {
    return getParsed(song);
  }
}
