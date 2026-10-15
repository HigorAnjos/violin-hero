let nextId = 1;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.mixBus = null;
    this.pitchAnalyser = null;
    this.pitchWorkletNode = null;
    this.pitchWorkletSupported = false;
    this.bridgeNode = null; // MediaStreamDestination for secondary outputs

    /** @type {Map<number, InputChannel>} */
    this.inputs = new Map();
    /** @type {Map<number, OutputChannel>} */
    this.outputs = new Map();
  }

  async init() {
    this.ctx = new AudioContext({
      latencyHint: 'interactive',
    });

    // Mix bus — all inputs merge here
    this.mixBus = this.ctx.createGain();

    // Pitch analyser on the mixed signal
    this.pitchAnalyser = this.ctx.createAnalyser();
    this.pitchAnalyser.fftSize = 4096;
    this.pitchAnalyser.smoothingTimeConstant = 0;
    this.mixBus.connect(this.pitchAnalyser);

    // Bridge for secondary outputs (MediaStream that can be fed to other AudioContexts)
    this.bridgeNode = this.ctx.createMediaStreamDestination();
    this.mixBus.connect(this.bridgeNode);

    await this._initPitchWorklet();

    return this.ctx;
  }

  /**
   * Run pitch detection off the main thread via an AudioWorklet. Falls back
   * silently (pitchWorkletSupported stays false) if the browser lacks
   * AudioWorklet support or module loading fails — callers then keep using
   * getPitchData() + PitchTracker.update() on the rAF loop instead.
   */
  async _initPitchWorklet() {
    this.pitchWorkletNode = null;
    this.pitchWorkletSupported = false;
    if (!this.ctx.audioWorklet) return;
    try {
      await this.ctx.audioWorklet.addModule(new URL('./pitch-worklet.js', import.meta.url));
      const node = new AudioWorkletNode(this.ctx, 'pitch-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
        channelCountMode: 'explicit',
      });
      this.mixBus.connect(node);
      this.pitchWorkletNode = node;
      this.pitchWorkletSupported = true;
    } catch (err) {
      console.warn('Pitch worklet unavailable, falling back to AnalyserNode pitch detection:', err);
      this.pitchWorkletNode = null;
      this.pitchWorkletSupported = false;
    }
  }

  // --- Input channels ---

  /**
   * Create an input channel (no stream yet). Returns channelId.
   * Call connectInputStream() to attach audio.
   */
  createInput() {
    const id = nextId++;
    const gain = this.ctx.createGain();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    gain.connect(analyser);
    gain.connect(this.mixBus);

    this.inputs.set(id, {
      id,
      stream: null,
      source: null,
      gain,
      analyser,
      muted: false,
      gainValue: 1.0,
    });
    return id;
  }

  /**
   * Attach a MediaStream to an existing input channel.
   */
  connectInputStream(channelId, stream) {
    const ch = this.inputs.get(channelId);
    if (!ch) return;

    // Disconnect old source if any
    if (ch.source) {
      ch.source.disconnect();
    }
    if (ch.stream) {
      ch.stream.getTracks().forEach(t => t.stop());
    }

    const source = this.ctx.createMediaStreamSource(stream);
    ch.source = source;
    ch.stream = stream;
    this._routeSource(ch, ch.gain);
  }

  /**
   * Connect a channel's source to its gain, honouring the channel mode.
   * USB audio interfaces often deliver the instrument on one side of a
   * stereo pair; picking that side avoids a -6 dB mono downmix.
   */
  _routeSource(ch, gain) {
    if (!ch.source) return;
    try { ch.source.disconnect(); } catch { /* not connected */ }
    if (ch.splitter) { try { ch.splitter.disconnect(); } catch { /* ignore */ } }
    ch.splitter = null;
    const mode = ch.channelMode || 'mix';
    if (mode === 'left' || mode === 'right') {
      const splitter = this.ctx.createChannelSplitter(2);
      ch.source.connect(splitter);
      splitter.connect(gain, mode === 'left' ? 0 : 1);
      ch.splitter = splitter;
    } else {
      ch.source.connect(gain);
    }
  }

  /** @param {'mix'|'left'|'right'} mode */
  setInputChannelMode(channelId, mode) {
    const ch = this.inputs.get(channelId);
    if (!ch) return;
    ch.channelMode = mode;
    this._routeSource(ch, ch.gain);
  }

  /** Channel count of the current stream (1 = mono, 2 = stereo). */
  getInputChannelCount(channelId) {
    const track = this.inputs.get(channelId)?.stream?.getAudioTracks?.()[0];
    return track?.getSettings?.().channelCount || 1;
  }

  /**
   * Remove an input channel. Stops its stream and disconnects nodes.
   */
  removeInput(channelId) {
    const ch = this.inputs.get(channelId);
    if (!ch) return;
    ch.source?.disconnect();
    ch.splitter?.disconnect();
    ch.gain.disconnect();
    ch.stream?.getTracks().forEach(t => t.stop());
    this.inputs.delete(channelId);
  }

  /**
   * Switch the device for an existing input channel.
   * Delegates to connectInputStream.
   */
  switchInputDevice(channelId, stream) {
    this.connectInputStream(channelId, stream);
  }

  setInputGain(channelId, value) {
    const ch = this.inputs.get(channelId);
    if (!ch) return;
    ch.gainValue = value;
    if (!ch.muted) {
      ch.gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    }
  }

  toggleInputMute(channelId) {
    const ch = this.inputs.get(channelId);
    if (!ch) return false;
    ch.muted = !ch.muted;
    const value = ch.muted ? 0 : ch.gainValue;
    ch.gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    return ch.muted;
  }

  getInputLevel(channelId) {
    const ch = this.inputs.get(channelId);
    if (!ch) return { rms: 0, peak: 0, rmsDb: -100, peakDb: -100 };
    return this._getLevel(ch.analyser);
  }

  // --- Output channels ---

  /**
   * Add an output channel.
   * The first output uses the primary AudioContext (zero bridge latency).
   * Additional outputs each get their own AudioContext with setSinkId.
   * @param {string} deviceId
   * @returns {Promise<number>} channelId
   */
  async addOutput(deviceId) {
    const id = nextId++;
    const isPrimary = this.outputs.size === 0;

    if (isPrimary) {
      // Primary output: route mixBus directly to ctx.destination
      this.mixBus.connect(this.ctx.destination);
      if (this.ctx.setSinkId && deviceId) {
        await this.ctx.setSinkId(deviceId);
      }

      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      this.mixBus.connect(analyser);

      this.outputs.set(id, {
        id,
        deviceId,
        primary: true,
        ctx: this.ctx,
        gain: null, // primary uses mixBus level
        analyser,
        outputGain: this.ctx.createGain(),
        muted: false,
        gainValue: 1.0,
      });

      // Wire output gain for primary (between mixBus and destination)
      // Rewire: mixBus -> outputGain -> destination, mixBus -> analyser
      this.mixBus.disconnect(this.ctx.destination);
      const outGain = this.outputs.get(id).outputGain;
      this.mixBus.connect(outGain);
      outGain.connect(this.ctx.destination);
      // Analyser taps after gain
      outGain.connect(analyser);
      // Disconnect the direct mixBus->analyser we set up above
      this.mixBus.disconnect(analyser);
    } else {
      // Secondary output: separate AudioContext
      if (this.outputs.size >= 4) return -1; // cap at 4 outputs

      const outCtx = new AudioContext({
        latencyHint: 'interactive',
      });
      if (outCtx.setSinkId && deviceId) {
        await outCtx.setSinkId(deviceId);
      }

      const bridgeSource = outCtx.createMediaStreamSource(this.bridgeNode.stream);
      const outGain = outCtx.createGain();
      const analyser = outCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      bridgeSource.connect(outGain);
      outGain.connect(analyser);
      outGain.connect(outCtx.destination);

      this.outputs.set(id, {
        id,
        deviceId,
        primary: false,
        ctx: outCtx,
        bridgeSource,
        gain: outGain,
        analyser,
        outputGain: outGain,
        muted: false,
        gainValue: 1.0,
      });
    }
    return id;
  }

  /**
   * Remove an output channel.
   */
  removeOutput(channelId) {
    const ch = this.outputs.get(channelId);
    if (!ch) return;

    if (ch.primary) {
      // Disconnect primary routing
      ch.outputGain.disconnect();
      this.mixBus.disconnect(ch.outputGain);
      this.mixBus.disconnect(ch.analyser);
    } else {
      ch.bridgeSource.disconnect();
      ch.outputGain.disconnect();
      ch.ctx.close();
    }
    this.outputs.delete(channelId);
  }

  /**
   * Switch the device for an existing output channel.
   */
  async switchOutputDevice(channelId, deviceId) {
    const ch = this.outputs.get(channelId);
    if (!ch) return;
    ch.deviceId = deviceId;
    if (ch.ctx.setSinkId) {
      await ch.ctx.setSinkId(deviceId);
    }
  }

  setOutputGain(channelId, value) {
    const ch = this.outputs.get(channelId);
    if (!ch) return;
    ch.gainValue = value;
    if (!ch.muted) {
      ch.outputGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    }
  }

  toggleOutputMute(channelId) {
    const ch = this.outputs.get(channelId);
    if (!ch) return false;
    ch.muted = !ch.muted;
    const value = ch.muted ? 0 : ch.gainValue;
    ch.outputGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    return ch.muted;
  }

  getOutputLevel(channelId) {
    const ch = this.outputs.get(channelId);
    if (!ch) return { rms: 0, peak: 0, rmsDb: -100, peakDb: -100 };
    return this._getLevel(ch.analyser);
  }

  // --- Shared ---

  _getLevel(analyser) {
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      sum += data[i] * data[i];
      if (abs > peak) peak = abs;
    }
    const rms = Math.sqrt(sum / data.length);

    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;

    return { rms, peak, rmsDb, peakDb };
  }

  getPitchData() {
    const bufferLength = this.pitchAnalyser.fftSize;
    const data = new Float32Array(bufferLength);
    this.pitchAnalyser.getFloatTimeDomainData(data);
    return { data, sampleRate: this.ctx.sampleRate };
  }

  getLatency() {
    const base = this.ctx.baseLatency || 0;
    const output = this.ctx.outputLatency || 0;
    return (base + output) * 1000; // ms
  }

  getLatencyBreakdown() {
    const baseMs = (this.ctx.baseLatency || 0) * 1000;
    const outputMs = (this.ctx.outputLatency || 0) * 1000;
    return { baseMs, outputMs };
  }

  /** Estimated bridge latency for secondary outputs */
  getBridgeLatency() {
    // ~128 samples at 48kHz = ~2.67ms per bridge hop
    return 128 / (this.ctx?.sampleRate || 48000) * 1000;
  }

  /**
   * Recreate the AudioContext with a specific buffer size hint.
   * @param {number|null} bufferSizeSamples - Buffer size in samples, or null for 'interactive' default
   * @returns {Promise<AudioContext>} The new AudioContext
   */
  async reinitWithBufferSize(bufferSizeSamples) {
    if (this._reinitInProgress) return this.ctx;
    this._reinitInProgress = true;
    try {
      return await this._doReinit(bufferSizeSamples);
    } finally {
      this._reinitInProgress = false;
    }
  }

  async _doReinit(bufferSizeSamples) {
    const latencyHint = bufferSizeSamples != null
      ? bufferSizeSamples / (this.ctx?.sampleRate || 48000)
      : 'interactive';

    // Save input streams
    const savedInputs = [];
    for (const [id, ch] of this.inputs) {
      savedInputs.push({
        id,
        stream: ch.stream,
        gainValue: ch.gainValue,
        muted: ch.muted,
      });
      // Disconnect without stopping stream tracks
      if (ch.source) ch.source.disconnect();
      ch.gain.disconnect();
      ch.analyser.disconnect();
    }

    // Save output device IDs
    const savedOutputs = [];
    for (const [id, ch] of this.outputs) {
      savedOutputs.push({
        id,
        deviceId: ch.deviceId,
        primary: ch.primary,
        gainValue: ch.gainValue,
        muted: ch.muted,
      });
      if (!ch.primary && ch.ctx) {
        ch.bridgeSource?.disconnect();
        ch.outputGain?.disconnect();
        ch.ctx.close();
      } else if (ch.primary) {
        ch.outputGain?.disconnect();
        this.mixBus?.disconnect(ch.outputGain);
      }
    }
    this.outputs.clear();

    // Close old context
    if (this.mixBus) {
      this.mixBus.disconnect();
    }
    if (this.ctx) {
      await this.ctx.close();
    }

    // Create new context
    this.ctx = new AudioContext({ latencyHint });

    // Recreate mix bus and analysis nodes
    this.mixBus = this.ctx.createGain();
    this.pitchAnalyser = this.ctx.createAnalyser();
    this.pitchAnalyser.fftSize = 4096;
    this.pitchAnalyser.smoothingTimeConstant = 0;
    this.mixBus.connect(this.pitchAnalyser);
    this.bridgeNode = this.ctx.createMediaStreamDestination();
    this.mixBus.connect(this.bridgeNode);
    await this._initPitchWorklet();

    // Reconnect inputs
    for (const saved of savedInputs) {
      const ch = this.inputs.get(saved.id);
      if (!ch) continue;

      // Recreate gain and analyser nodes in new context
      const gain = this.ctx.createGain();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      gain.connect(analyser);
      gain.connect(this.mixBus);

      ch.gain = gain;
      ch.analyser = analyser;
      ch.gainValue = saved.gainValue;
      ch.muted = saved.muted;

      if (!saved.muted) {
        gain.gain.value = saved.gainValue;
      } else {
        gain.gain.value = 0;
      }

      // Reconnect stream if we have one
      ch.stream = saved.stream;
      if (saved.stream && saved.stream.active) {
        try {
          const source = this.ctx.createMediaStreamSource(saved.stream);
          ch.source = source;
          ch.splitter = null;
          this._routeSource(ch, gain);
        } catch (err) {
          console.warn('Failed to reconnect stream after reinit:', err);
          ch.source = null;
        }
      } else {
        ch.source = null;
      }
    }

    // Reconnect outputs
    for (const saved of savedOutputs) {
      if (saved.primary) {
        // Primary output
        const outGain = this.ctx.createGain();
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        this.mixBus.connect(outGain);
        outGain.connect(this.ctx.destination);
        outGain.connect(analyser);

        if (!saved.muted) {
          outGain.gain.value = saved.gainValue;
        } else {
          outGain.gain.value = 0;
        }

        if (this.ctx.setSinkId && saved.deviceId) {
          try { await this.ctx.setSinkId(saved.deviceId); } catch (_) {}
        }

        this.outputs.set(saved.id, {
          id: saved.id,
          deviceId: saved.deviceId,
          primary: true,
          ctx: this.ctx,
          gain: null,
          analyser,
          outputGain: outGain,
          muted: saved.muted,
          gainValue: saved.gainValue,
        });
      } else {
        // Secondary output
        const outCtx = new AudioContext({ latencyHint: 'interactive' });
        if (outCtx.setSinkId && saved.deviceId) {
          try { await outCtx.setSinkId(saved.deviceId); } catch (_) {}
        }

        const bridgeSource = outCtx.createMediaStreamSource(this.bridgeNode.stream);
        const outGain = outCtx.createGain();
        const analyser = outCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        bridgeSource.connect(outGain);
        outGain.connect(analyser);
        outGain.connect(outCtx.destination);

        if (!saved.muted) {
          outGain.gain.value = saved.gainValue;
        } else {
          outGain.gain.value = 0;
        }

        this.outputs.set(saved.id, {
          id: saved.id,
          deviceId: saved.deviceId,
          primary: false,
          ctx: outCtx,
          bridgeSource,
          gain: outGain,
          analyser,
          outputGain: outGain,
          muted: saved.muted,
          gainValue: saved.gainValue,
        });
      }
    }

    return this.ctx;
  }

  destroy() {
    for (const [id] of this.inputs) {
      this.removeInput(id);
    }
    for (const [id, ch] of this.outputs) {
      if (!ch.primary) ch.ctx.close();
    }
    this.outputs.clear();
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
