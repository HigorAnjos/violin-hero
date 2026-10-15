import { AudioEngine } from './audio/audio-engine.js';
import { DeviceManager } from './audio/device-manager.js';
import { PitchTracker } from './audio/pitch-tracker.js';
import { MetronomeEngine } from './audio/metronome-engine.js';
import { MixerPanel } from './ui/mixer.js';
import { LevelMeter } from './ui/meters.js';
import { PitchDisplay } from './ui/pitch-display.js';
import { TuningPanel } from './ui/tuning-panel.js';
import { Fingerboard } from './ui/fingerboard.js';
import { ScalePanel } from './ui/scale-panel.js';
import { ScaleTrainer } from './ui/scale-trainer.js';
import { generateScaleSequence } from './audio/scale-sequence.js';
import { MetronomePanel } from './ui/metronome-panel.js';
import { SongBrowser } from './ui/song-browser.js';
import { SongPlayer } from './ui/song-player.js';
import { InputPicker, classifyInput } from './ui/input-picker.js';
import { initLiveUpdates, getVersionInfo } from './native/live-update.js';
import { initPwa } from './pwa/register.js';

// --- Live updates (Android app): confirm this bundle booted, then check for a newer one ---

function showUpdateBanner(info) {
  document.querySelector('.app-update')?.remove();
  const bar = document.createElement('div');
  bar.className = 'app-update';
  const text = document.createElement('span');
  if (info.needsApk) {
    text.textContent = `Version ${info.version} needs a newer app install. Download the latest APK from GitHub.`;
    bar.appendChild(text);
  } else {
    text.textContent = info.customText || `Update ${info.version} downloaded.`;
    const now = document.createElement('button');
    now.textContent = info.actionLabel || 'Restart now';
    now.addEventListener('click', () => info.apply?.());
    bar.append(text, now);
  }
  const later = document.createElement('button');
  later.className = 'secondary';
  later.textContent = info.needsApk ? 'OK' : 'Later';
  later.addEventListener('click', () => bar.remove());
  bar.appendChild(later);
  document.body.appendChild(bar);
}

initLiveUpdates({ onReady: showUpdateBanner });
initPwa({
  notify: ({ text, action, onAction }) => showUpdateBanner({ version: '', customText: text, actionLabel: action, apply: onAction }),
});
getVersionInfo().then(({ bundle, native }) => {
  const el = document.getElementById('app-version');
  if (el) el.textContent = native === 'web' ? `v${bundle}` : `v${bundle} · app ${native}`;
});

const engine = new AudioEngine();
const deviceManager = new DeviceManager();
const pitchTracker = new PitchTracker();

const pitchSection = document.getElementById('pitch-section');
const tuningSection = document.getElementById('tuning-section');
const scaleSection = document.getElementById('scale-section');
const trainerSection = document.getElementById('trainer-section');
const metronomeSection = document.getElementById('metronome-section');
const fingerboardSection = document.getElementById('fingerboard-section');
const mixerSection = document.getElementById('mixer-section');

// Build UI
const pitchDisplay = new PitchDisplay(pitchSection);
const tuningPanel = new TuningPanel(tuningSection);
const scalePanel = new ScalePanel(scaleSection);
const scaleTrainer = new ScaleTrainer(trainerSection);
const metronomePanel = new MetronomePanel(metronomeSection);
const fingerboard = new Fingerboard(fingerboardSection);
const mixer = new MixerPanel(mixerSection);

tuningPanel.onTuningChange = (tuningKey) => {
  fingerboard.setTuning(tuningKey);
  songBrowser.setTuning(tuningKey);
};

// --- Song Play tab (Rocksmith-style) ---

const songBrowserSection = document.getElementById('song-browser-section');
const songPlayerSection = document.getElementById('song-player-section');
const songBrowser = new SongBrowser(songBrowserSection);
const songPlayer = new SongPlayer(songPlayerSection, { getCtx: () => engine.ctx });
let activeTab = 'workstation';
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* not supported or denied */ }
}

function releaseWakeLock() {
  wakeLock?.release?.();
  wakeLock = null;
}

function showSongPlayer(show) {
  songBrowserSection.classList.toggle('hidden', show);
  songPlayerSection.classList.toggle('hidden', !show);
  document.body.classList.toggle('playing-song', show);
}

// --- Audio input picker (built-in mic, wired headset, USB interface) ---

const inputPicker = new InputPicker(songBrowser.inputSlot);
let currentInputDeviceId = null;
let knownInputIds = new Set();

function primaryInputChannel() {
  return engine.inputs.keys().next().value;
}

function toast(text) {
  const t = document.createElement('div');
  t.className = 'app-toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
}

function streamDeviceId(stream) {
  return stream?.getAudioTracks?.()[0]?.getSettings?.().deviceId || null;
}

/** Switch the primary input channel to a device (undefined = system default). */
async function switchPrimaryInput(deviceId) {
  const ch = primaryInputChannel();
  if (ch == null) return false;
  try {
    const stream = await deviceManager.getInputStream(deviceId);
    engine.connectInputStream(ch, stream);
    micConnected = true;
    currentInputDeviceId = deviceId || streamDeviceId(stream);
    mixer.setInputDevice(ch, currentInputDeviceId);
    inputPicker.setCurrent(currentInputDeviceId);
    inputPicker.setChannelCount(engine.getInputChannelCount(ch));
    updateMicButton();
    return true;
  } catch (err) {
    console.warn('Failed to open input:', err.message);
    toast('Could not open that input');
    return false;
  }
}

inputPicker.onDeviceChange = (id) => { unlockAudio(); switchPrimaryInput(id); };
inputPicker.onChannelMode = (mode) => {
  const ch = primaryInputChannel();
  if (ch != null) engine.setInputChannelMode(ch, mode);
};
inputPicker.onGainChange = (v) => {
  const ch = primaryInputChannel();
  if (ch != null) engine.setInputGain(ch, v);
};

/** React to devices being plugged in / unplugged (headset jack, USB-C/OTG). */
async function handleDevicesChanged(devs) {
  mixer.updateDevices(devs);
  const inputs = devs.inputs.filter(d => d.deviceId);
  const added = inputs.filter(d => !knownInputIds.has(d.deviceId) && d.deviceId !== 'default');
  const hadKnown = knownInputIds.size > 0;
  knownInputIds = new Set(inputs.map(d => d.deviceId));
  inputPicker.setDevices(inputs, currentInputDeviceId);

  const external = added.find(d => ['usb', 'wired'].includes(classifyInput(d)));
  if (hadKnown && external) {
    if (await switchPrimaryInput(external.deviceId)) toast(`Switched input to ${external.label || 'external device'}`);
    return;
  }
  // Current device unplugged → fall back to the system default
  if (currentInputDeviceId && !knownInputIds.has(currentInputDeviceId)) {
    if (await switchPrimaryInput(undefined)) toast('Input unplugged, using the default microphone');
  }
}

songBrowser.onPlay = (song, chart, opts) => {
  unlockAudio();
  showSongPlayer(true);
  requestWakeLock();
  // Let layout settle so the canvas measures its real size
  requestAnimationFrame(() => songPlayer.start(song, chart, opts));
};

songPlayer.onExit = () => {
  showSongPlayer(false);
  releaseWakeLock();
  songBrowser.updateProgress();
};

songPlayer.onRiffRequest = (song, from, to) => {
  songBrowser.openRiff(song, from, to);
};

function switchTab(tab) {
  if (tab === activeTab) return;
  if (activeTab === 'songplay' && songPlayer.active) songPlayer.pause();
  activeTab = tab;
  for (const btn of document.querySelectorAll('.app-tab')) {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
  }
  for (const panel of document.querySelectorAll('[data-tab-panel]')) {
    panel.classList.toggle('hidden', panel.dataset.tabPanel !== tab);
  }
  document.body.classList.toggle('tab-songplay', tab === 'songplay');
  try { localStorage.setItem('vaw.activeTab', tab); } catch { /* ignore */ }
}

for (const btn of document.querySelectorAll('.app-tab')) {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
}
try {
  const saved = localStorage.getItem('vaw.activeTab');
  if (saved === 'songplay') switchTab('songplay');
} catch { /* ignore */ }

scalePanel.onScaleChange = (scaleData) => fingerboard.setScale(scaleData);

// --- Scale Trainer wiring ---

scaleTrainer.onStart = () => {
  const scaleKey = scalePanel.scaleKey;
  const rootPitchClass = scalePanel.rootPitchClass;
  const tuningKey = tuningPanel.currentTuning;

  if (!scaleKey) return; // no scale selected

  const sequence = generateScaleSequence(tuningKey, rootPitchClass, scaleKey, {
    octaves: scaleTrainer.octaves,
    direction: scaleTrainer.direction,
  });

  if (sequence.length === 0) return;

  fingerboard.clearTrainerState();
  scaleTrainer.beginSession(sequence);
};

scaleTrainer.onTargetChange = (target) => {
  fingerboard.setTrainerTarget(target.stringIndex, target.positionIndex);
};

scaleTrainer.onHit = (target) => {
  fingerboard.markTrainerHit(target.stringIndex, target.positionIndex);
};

scaleTrainer.onStop = () => {
  fingerboard.clearTrainerState();
};

// --- Metronome wiring (lazy engine creation) ---

let metronomeEngine = null;

metronomePanel.onStart = () => {
  if (!metronomeEngine && engine.ctx) {
    metronomeEngine = new MetronomeEngine(engine.ctx);
    metronomeEngine.onBeat = (beatIndex) => {
      metronomePanel.flashBeat(beatIndex);
    };
  }
  if (metronomeEngine) {
    metronomeEngine.bpm = metronomePanel.bpm;
    metronomeEngine.beatsPerMeasure = metronomePanel.beats;
    metronomeEngine.start();
  }
};

metronomePanel.onStop = () => {
  metronomeEngine?.stop();
};

metronomePanel.onBpmChange = (bpm) => {
  if (metronomeEngine) metronomeEngine.bpm = bpm;
};

metronomePanel.onTimeSigChange = (beats) => {
  if (metronomeEngine) metronomeEngine.beatsPerMeasure = beats;
};

metronomePanel.onVolumeChange = (vol) => {
  if (metronomeEngine) metronomeEngine.setVolume(vol);
};

/** @type {Map<number, LevelMeter>} */
const inputMeters = new Map();
/** @type {Map<number, LevelMeter>} */
const outputMeters = new Map();

let animFrameId = null;
let engineReady = false;

/** Route the pitch worklet's messages into the tracker (no-op if unsupported). */
function wirePitchWorklet() {
  if (engine.pitchWorkletSupported) {
    engine.pitchWorkletNode.port.onmessage = (e) => pitchTracker.ingest(e.data, performance.now());
  }
}

async function ensureEngine() {
  if (engineReady) return;
  await engine.init();
  wirePitchWorklet();
  engineReady = true;
  startRenderLoop();
}

// --- Input management ---

async function addInput(deviceId) {
  await ensureEngine();
  // Always create channel + strip, even if stream fails
  const channelId = engine.createInput();
  const strip = mixer.addInputStrip(channelId, deviceId);
  inputMeters.set(channelId, new LevelMeter(strip.meterCanvas));

  // Try to connect audio stream
  if (deviceId) {
    try {
      const stream = await deviceManager.getInputStream(deviceId);
      engine.connectInputStream(channelId, stream);
    } catch (err) {
      console.warn('Input stream unavailable:', err.message);
    }
  }
  return channelId;
}

function removeInput(channelId) {
  if (engine.inputs.size <= 1) return; // prevent removing last
  engine.removeInput(channelId);
  mixer.removeInputStrip(channelId);
  inputMeters.delete(channelId);
}

async function switchInputDevice(channelId, deviceId) {
  try {
    const stream = await deviceManager.getInputStream(deviceId);
    engine.switchInputDevice(channelId, stream);
    if (channelId === primaryInputChannel()) {
      currentInputDeviceId = deviceId;
      inputPicker.setCurrent(deviceId);
      inputPicker.setChannelCount(engine.getInputChannelCount(channelId));
    }
  } catch (err) {
    console.error('Failed to switch input device:', err);
  }
}

// --- Output management ---

async function addOutput(deviceId) {
  try {
    await ensureEngine();
    const channelId = await engine.addOutput(deviceId);
    if (channelId === -1) return; // cap reached
    const strip = mixer.addOutputStrip(channelId, deviceId);
    outputMeters.set(channelId, new LevelMeter(strip.meterCanvas));
    return channelId;
  } catch (err) {
    console.error('Failed to add output:', err);
  }
}

function removeOutput(channelId) {
  if (engine.outputs.size <= 1) return; // prevent removing last
  engine.removeOutput(channelId);
  mixer.removeOutputStrip(channelId);
  outputMeters.delete(channelId);
}

async function switchOutputDevice(channelId, deviceId) {
  try {
    await engine.switchOutputDevice(channelId, deviceId);
  } catch (err) {
    console.error('Failed to switch output device:', err);
  }
}

// --- Pitch debug overlay (?debug=pitch) — for calibrating the tracker's thresholds ---

const pitchDebugEnabled = new URLSearchParams(location.search).get('debug') === 'pitch';
let pitchDebugEl = null;

function updatePitchDebug(reading) {
  if (!pitchDebugEnabled) return;
  if (!pitchDebugEl) {
    pitchDebugEl = document.createElement('div');
    pitchDebugEl.id = 'pitch-debug';
    pitchDebugEl.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;'
      + 'background:rgba(0,0,0,0.75);color:#9fe8a4;font:12px/1.4 monospace;'
      + 'padding:6px 10px;border-radius:4px;white-space:pre;pointer-events:none;';
    document.body.appendChild(pitchDebugEl);
  }
  const rmsDb = reading.rms > 0 ? 20 * Math.log10(reading.rms) : -100;
  pitchDebugEl.textContent =
    `source:  ${engine.pitchWorkletSupported ? 'worklet' : 'rAF fallback'}\n`
    + `freq:    ${reading.freq != null ? reading.freq.toFixed(1) + ' Hz' : '—'}\n`
    + `clarity: ${reading.clarity.toFixed(3)}\n`
    + `rms:     ${rmsDb.toFixed(1)} dBFS\n`
    + `onsetId: ${reading.onsetId}`;
}

// --- Render loop ---

function startRenderLoop() {
  if (animFrameId) return;

  let pitchFrame = 0;
  function renderLoop() {
    const onWorkstation = activeTab === 'workstation';
    const songActive = activeTab === 'songplay' && songPlayer.active;

    if (onWorkstation) {
      // Draw all input meters
      for (const [channelId, meter] of inputMeters) {
        const level = engine.getInputLevel(channelId);
        meter.draw(level.rmsDb, level.peakDb);
      }

      // Draw all output meters
      for (const [channelId, meter] of outputMeters) {
        const level = engine.getOutputLevel(channelId);
        meter.draw(level.rmsDb, level.peakDb);
      }
    }

    if (activeTab === 'songplay' && !songActive && pitchFrame % 3 === 0) {
      const ch = primaryInputChannel();
      if (ch != null) inputPicker.updateLevel(engine.getInputLevel(ch).rmsDb);
    }

    // Pitch detection. With the worklet, detection already ran on the audio
    // thread — just read its last result (every frame; it's a cheap getter).
    // Without it, fall back to running the detector here on the AnalyserNode
    // buffer (every frame while a song is playing, otherwise every other frame).
    pitchFrame++;
    const usingWorklet = engine.pitchWorkletSupported;
    if (usingWorklet ? (songActive || onWorkstation) : (songActive || (onWorkstation && pitchFrame % 2 === 0))) {
      let reading;
      if (usingWorklet) {
        reading = pitchTracker.latest;
        // A stale worklet message (thread stalled/glitched) must not look like
        // a held note — the song-player watchdog relies on freq going null.
        if (pitchTracker.isStale()) reading = { ...reading, freq: null };
      } else {
        const { data, sampleRate } = engine.getPitchData();
        reading = pitchTracker.update(data, sampleRate);
      }
      if (onWorkstation) {
        pitchDisplay.update(reading.freq);
        tuningPanel.update(reading.freq);
        fingerboard.update(reading.freq);
        if (scaleTrainer.active) scaleTrainer.update(reading.freq);
      }
      if (songActive) songPlayer.update(reading);
      updatePitchDebug(reading);
    }

    // Latency display (every frame — outputLatency updates dynamically)
    if (onWorkstation) {
      mixer.updateLatency(
        engine.getLatency(),
        engine.getBridgeLatency(),
        engine.getLatencyBreakdown()
      );
    }

    animFrameId = requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

// --- Wire mixer callbacks ---

mixer.onAddInput = () => addInput();
mixer.onRemoveInput = (channelId) => removeInput(channelId);
mixer.onAddOutput = () => addOutput();
mixer.onRemoveOutput = (channelId) => removeOutput(channelId);

mixer.onInputDeviceChange = (channelId, deviceId) => switchInputDevice(channelId, deviceId);
mixer.onOutputDeviceChange = (channelId, deviceId) => switchOutputDevice(channelId, deviceId);

mixer.onInputGainChange = (channelId, val) => engine.setInputGain(channelId, val);
mixer.onOutputGainChange = (channelId, val) => engine.setOutputGain(channelId, val);

mixer.onInputMuteToggle = (channelId) => {
  const muted = engine.toggleInputMute(channelId);
  mixer.setInputMuted(channelId, muted);
};
mixer.onOutputMuteToggle = (channelId) => {
  const muted = engine.toggleOutputMute(channelId);
  mixer.setOutputMuted(channelId, muted);
};

mixer.onBufferSizeChange = async (samples) => {
  // Preserve metronome running state
  const wasPlaying = metronomeEngine?._playing;
  if (metronomeEngine) {
    metronomeEngine.stop();
    metronomeEngine = null;
  }

  const newCtx = await engine.reinitWithBufferSize(samples);
  wirePitchWorklet();

  // Recreate metronome engine with new context
  if (newCtx) {
    metronomeEngine = new MetronomeEngine(newCtx);
    metronomeEngine.onBeat = (beatIndex) => {
      metronomePanel.flashBeat(beatIndex);
    };
    if (wasPlaying) {
      metronomeEngine.bpm = metronomePanel.bpm;
      metronomeEngine.beatsPerMeasure = metronomePanel.beats;
      metronomeEngine.start();
    }
  }
};

// --- Mobile / autoplay handling ---

const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;
const micBtn = document.getElementById('mic-btn');
let micConnected = false;

/** Resume the AudioContext on any user gesture (required on mobile browsers). */
function unlockAudio() {
  if (engine.ctx && engine.ctx.state !== 'running') {
    engine.ctx.resume().catch(() => {});
  }
  updateMicButton();
}
for (const ev of ['pointerdown', 'touchend', 'keydown']) {
  window.addEventListener(ev, unlockAudio, { passive: true });
}

function updateMicButton() {
  const needsAudio = engine.ctx && engine.ctx.state !== 'running';
  const show = !micConnected || needsAudio;
  micBtn.classList.toggle('hidden', !show);
  micBtn.textContent = !micConnected ? 'Enable microphone' : 'Tap to start audio';
}

micBtn.addEventListener('click', async () => {
  unlockAudio();
  if (!micConnected) await connectDefaultMic();
  updateMicButton();
});

/** Connect the default microphone to the first input channel. */
async function connectDefaultMic() {
  try {
    const stream = await deviceManager.getInputStream();
    let channelId = engine.inputs.keys().next().value;
    if (channelId == null) channelId = await addInput();
    engine.connectInputStream(channelId, stream);
    micConnected = true;
    currentInputDeviceId = streamDeviceId(stream);
    try {
      const devices = await deviceManager.enumerate();
      mixer.updateDevices(devices);
      knownInputIds = new Set(devices.inputs.map(d => d.deviceId).filter(Boolean));
      inputPicker.setDevices(devices.inputs.filter(d => d.deviceId), currentInputDeviceId);
      mixer.setInputDevice(channelId, currentInputDeviceId);
    } catch { /* ignore */ }
  } catch (err) {
    console.warn('Microphone unavailable:', err.message);
    micBtn.textContent = 'Microphone blocked: check permissions';
  }
}

// --- Boot ---

async function boot() {
  // Always init engine and create default strips, even if permission fails
  await ensureEngine();

  // Try to get mic permission and enumerate devices
  let devices = { inputs: [], outputs: [] };
  try {
    await deviceManager.requestPermission();
    devices = await deviceManager.enumerate();
  } catch (err) {
    console.warn('Mic permission denied or unavailable:', err.message);
    // Still try to enumerate (labels may be hidden but IDs work)
    try { devices = await deviceManager.enumerate(); } catch (_) {}
  }

  mixer.updateDevices(devices);
  deviceManager.listenForChanges();
  deviceManager.onDevicesChanged = (devs) => handleDevicesChanged(devs);
  knownInputIds = new Set(devices.inputs.map(d => d.deviceId).filter(Boolean));

  // Auto-add one input + one output
  const firstInputId = devices.inputs.length > 0
    ? devices.inputs[0].deviceId
    : undefined;
  const firstOutputId = devices.outputs.length > 0
    ? devices.outputs[0].deviceId
    : undefined;

  // These individually catch their own errors, so one failing won't block the other
  await addInput(firstInputId);
  micConnected = [...engine.inputs.values()].some(ch => ch.stream);
  if (!micConnected && devices.inputs.length > 0) await connectDefaultMic();

  // Prefer an external wired/USB input if one is already plugged in
  const firstCh = engine.inputs.get(primaryInputChannel());
  currentInputDeviceId = streamDeviceId(firstCh?.stream) || firstInputId || null;
  const ext = devices.inputs.find(d => ['usb', 'wired'].includes(classifyInput(d)));
  if (ext && ext.deviceId !== currentInputDeviceId) await switchPrimaryInput(ext.deviceId);
  inputPicker.setDevices(devices.inputs.filter(d => d.deviceId), currentInputDeviceId);
  inputPicker.setChannelCount(engine.getInputChannelCount(primaryInputChannel()));
  const outId = await addOutput(firstOutputId);

  // On phones/tablets the speaker sits next to the mic: monitoring the input
  // through it causes feedback, so start with the output monitor muted.
  if (isTouchDevice && outId != null && outId !== -1) {
    const muted = engine.toggleOutputMute(outId);
    mixer.setOutputMuted(outId, muted);
  }
  updateMicButton();
  engine.ctx?.addEventListener?.('statechange', updateMicButton);
}

boot();

// Debug/test hook (dev server only)
if (import.meta.env?.DEV) {
  window.__vaw = { engine, songBrowser, songPlayer, inputPicker };
}
