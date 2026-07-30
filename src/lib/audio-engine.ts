/**
 * audio-engine.ts
 * ---------------------------------------------------------------------------
 * A fully synthesized cinematic audio engine built on the Web Audio API.
 *
 * Why synthesis instead of audio files?
 *  - Zero network weight (nothing to lazy-load, nothing to buffer on a
 *    projector machine with flaky wifi during a live ceremony).
 *  - Sample-accurate scheduling so SFX line up with GSAP timelines.
 *  - No licensing / placeholder asset problems.
 *
 * Everything is created lazily on the first user gesture (browser autoplay
 * policy) and every node is disconnected on `dispose()` so we never leak.
 */

type Ambience = "idle" | "charged" | "boot" | "reveal";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  /** Long-lived ambient voices (kept so we can morph, not restart, them). */
  private ambientNodes: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode }[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  private _volume = 0.7;
  private _muted = false;
  private started = false;

  /* ----------------------------------------------------------------- setup */

  /** Must be called from a user gesture. Safe to call repeatedly. */
  async start() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();

      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this._volume;
      this.master.connect(this.ctx.destination);

      this.ambientBus = this.ctx.createGain();
      this.ambientBus.gain.value = 0;
      this.ambientBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();

    if (!this.started) {
      this.buildAmbience();
      this.started = true;
      this.setAmbience("idle");
    }
  }

  get ready() {
    return this.started;
  }

  /* ---------------------------------------------------------------- volume */

  setVolume(v: number) {
    this._volume = clamp(v, 0, 1);
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(
        this._muted ? 0 : this._volume,
        this.ctx.currentTime,
        0.08,
      );
    }
  }

  get volume() {
    return this._volume;
  }

  setMuted(m: boolean) {
    this._muted = m;
    this.setVolume(this._volume);
  }

  get muted() {
    return this._muted;
  }

  /* -------------------------------------------------------------- ambience */

  /** Deep room tone: two detuned low drones + filtered noise "air". */
  private buildAmbience() {
    const ctx = this.ctx!;
    const dest = this.ambientBus!;

    [55, 82.5, 110].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = i * 6 - 6;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 320;
      filter.Q.value = 0.6;

      const gain = ctx.createGain();
      gain.gain.value = i === 2 ? 0.12 : 0.3;

      osc.connect(filter).connect(gain).connect(dest);
      osc.start();
      this.ambientNodes.push({ osc, gain, filter });
    });

    // Pink-ish noise bed for "room air".
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 700;
    nf.Q.value = 0.4;

    const ng = ctx.createGain();
    ng.gain.value = 0.25;

    src.connect(nf).connect(ng).connect(dest);
    src.start();

    this.noiseSource = src;
    this.noiseFilter = nf;
    this.noiseGain = ng;
  }

  /** Morph the ambient bed between narrative states (never restarts voices). */
  setAmbience(mode: Ambience) {
    if (!this.ctx || !this.ambientBus) return;
    const t = this.ctx.currentTime;
    const cfg: Record<Ambience, { bus: number; cut: number; detune: number; noise: number }> = {
      idle: { bus: 0.5, cut: 320, detune: 0, noise: 0.2 },
      charged: { bus: 0.75, cut: 900, detune: 14, noise: 0.42 },
      boot: { bus: 0.62, cut: 1400, detune: 5, noise: 0.3 },
      reveal: { bus: 0.55, cut: 600, detune: -8, noise: 0.16 },
    };
    const c = cfg[mode];
    this.ambientBus.gain.setTargetAtTime(c.bus, t, 0.9);
    this.ambientNodes.forEach(({ filter, osc }, i) => {
      filter.frequency.setTargetAtTime(c.cut + i * 60, t, 1.1);
      osc.detune.setTargetAtTime(c.detune + i * 4, t, 1.1);
    });
    this.noiseFilter?.frequency.setTargetAtTime(mode === "charged" ? 1800 : 700, t, 1.2);
    this.noiseGain?.gain.setTargetAtTime(c.noise, t, 1.2);
  }

  /* ------------------------------------------------------------- utilities */

  private now() {
    return this.ctx!.currentTime;
  }

  /** One-shot noise burst through a filter — the backbone of most SFX. */
  private noiseBurst(opts: {
    duration: number;
    type: BiquadFilterType;
    freq: number;
    freqEnd?: number;
    q?: number;
    gain?: number;
    delay?: number;
    attack?: number;
  }) {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t0 = this.now() + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * opts.duration));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.type;
    filter.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + opts.duration);
    filter.Q.value = opts.q ?? 1;

    const g = ctx.createGain();
    const peak = opts.gain ?? 0.3;
    const atk = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    src.connect(filter).connect(g).connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + opts.duration + 0.05);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }

  /** One-shot tonal blip / sweep. */
  private tone(opts: {
    freq: number;
    freqEnd?: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    attack?: number;
  }) {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t0 = this.now() + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + opts.duration);

    const g = ctx.createGain();
    const peak = opts.gain ?? 0.2;
    const atk = opts.attack ?? 0.01;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    osc.connect(g).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  /* ------------------------------------------------------------------- SFX */

  hover() {
    this.tone({ freq: 1650, freqEnd: 2400, duration: 0.13, type: "sine", gain: 0.06 });
    this.noiseBurst({ duration: 0.09, type: "highpass", freq: 4200, gain: 0.03 });
  }

  /** Continuous-ish proximity tick while the key nears the keyhole. */
  proximityTick(intensity: number) {
    this.tone({
      freq: 900 + intensity * 900,
      duration: 0.07,
      type: "triangle",
      gain: 0.02 + intensity * 0.05,
    });
  }

  /** Magnetic snap: pitch-up whoosh + low thud + metallic ring. */
  magneticSnap() {
    this.noiseBurst({ duration: 0.22, type: "bandpass", freq: 400, freqEnd: 3600, q: 2, gain: 0.34 });
    this.tone({ freq: 180, freqEnd: 55, duration: 0.5, type: "sine", gain: 0.5 });
    this.tone({ freq: 2100, freqEnd: 1400, duration: 0.35, type: "triangle", gain: 0.1, delay: 0.05 });
  }

  /** Servo motors turning the cylinder. */
  servo(duration = 1.1) {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t0 = this.now();
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, t0);
    osc.frequency.linearRampToValueAtTime(190, t0 + duration * 0.6);
    osc.frequency.linearRampToValueAtTime(80, t0 + duration);

    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 26;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain).connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 3;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.12);
    g.gain.setValueAtTime(0.14, t0 + duration - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(filter).connect(g).connect(this.sfxBus);
    osc.start(t0);
    lfo.start(t0);
    osc.stop(t0 + duration + 0.05);
    lfo.stop(t0 + duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }

  /** Heavy metal bolts retracting. */
  metalUnlock() {
    [0, 0.16, 0.31, 0.44].forEach((d, i) => {
      this.noiseBurst({
        duration: 0.2,
        type: "bandpass",
        freq: 1500 - i * 220,
        q: 6,
        gain: 0.3,
        delay: d,
      });
      this.tone({ freq: 120 - i * 12, duration: 0.28, type: "square", gain: 0.12, delay: d });
    });
    this.tone({ freq: 3400, freqEnd: 900, duration: 0.9, type: "triangle", gain: 0.07, delay: 0.1 });
  }

  /** Electric arc crackle. */
  electricity(duration = 1.2) {
    for (let i = 0; i < 14; i++) {
      this.noiseBurst({
        duration: 0.05 + Math.random() * 0.06,
        type: "highpass",
        freq: 1800 + Math.random() * 4000,
        gain: 0.05 + Math.random() * 0.09,
        delay: Math.random() * duration,
      });
    }
  }

  /** Deep cinematic boom / impact. */
  boom(gain = 0.85) {
    this.tone({ freq: 92, freqEnd: 26, duration: 2.4, type: "sine", gain });
    this.tone({ freq: 140, freqEnd: 40, duration: 1.4, type: "triangle", gain: gain * 0.4 });
    this.noiseBurst({ duration: 1.8, type: "lowpass", freq: 900, freqEnd: 90, gain: gain * 0.45 });
  }

  /** Terminal typing / data tick. */
  dataTick() {
    this.tone({
      freq: 1200 + Math.random() * 700,
      duration: 0.045,
      type: "square",
      gain: 0.025,
    });
  }

  moduleComplete(index: number) {
    this.tone({ freq: 620 + index * 90, freqEnd: 930 + index * 90, duration: 0.22, gain: 0.09 });
  }

  /** Failure: key dropped outside the lock. */
  failure() {
    this.tone({ freq: 300, freqEnd: 110, duration: 0.42, type: "sawtooth", gain: 0.1 });
    this.noiseBurst({ duration: 0.24, type: "lowpass", freq: 900, freqEnd: 220, gain: 0.14 });
  }

  /** Epic orchestral-style riser (stacked detuned saw swell + noise sweep). */
  riser(duration = 4) {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const t0 = this.now();
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.exponentialRampToValueAtTime(0.28, t0 + duration * 0.92);
    bus.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.6);
    bus.connect(this.sfxBus);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, t0);
    filter.frequency.exponentialRampToValueAtTime(7000, t0 + duration);
    filter.connect(bus);

    const oscs: OscillatorNode[] = [];
    [110, 164.81, 220, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + duration);
      o.detune.value = (i - 1.5) * 9;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      o.connect(g).connect(filter);
      o.start(t0);
      o.stop(t0 + duration + 0.8);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
      oscs.push(o);
    });

    this.noiseBurst({
      duration,
      type: "bandpass",
      freq: 400,
      freqEnd: 9000,
      q: 1.2,
      gain: 0.12,
      attack: duration * 0.9,
    });
    window.setTimeout(() => bus.disconnect(), (duration + 1.2) * 1000);
  }

  /* --------------------------------------------------------------- AI voice */

  /** Female AI voice via SpeechSynthesis, with graceful no-op fallback. */
  speak(text: string, rate = 0.92) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (this._muted) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /samantha|zira|female|google uk english female|karen|serena/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) u.voice = preferred;
    u.rate = rate;
    u.pitch = 1.02;
    u.volume = clamp(this._volume, 0, 1);
    window.speechSynthesis.speak(u);
  }

  cancelSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /* --------------------------------------------------------------- cleanup */

  dispose() {
    this.cancelSpeech();
    this.ambientNodes.forEach(({ osc, gain, filter }) => {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
      osc.disconnect();
      gain.disconnect();
      filter.disconnect();
    });
    this.ambientNodes = [];
    try {
      this.noiseSource?.stop();
    } catch {
      /* already stopped */
    }
    this.noiseSource?.disconnect();
    this.noiseFilter?.disconnect();
    this.noiseGain?.disconnect();
    this.ambientBus?.disconnect();
    this.sfxBus?.disconnect();
    this.master?.disconnect();
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}

/** Singleton — one audio graph for the whole experience. */
let engine: AudioEngine | null = null;
export const getAudioEngine = () => {
  if (!engine) engine = new AudioEngine();
  return engine;
};
