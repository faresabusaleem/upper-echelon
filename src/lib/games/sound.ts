/**
 * The Arena's sounds, synthesised in the browser with the Web Audio API (no audio files). Every
 * sound is a few short oscillator notes shaped by an envelope, mixed through one compressor so
 * nothing clips. Muting is remembered per device.
 */
const KEY = "ue-sound";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  listeners.forEach((l) => l());
}

export function subscribeSound(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    const master = ctx.createGain();
    master.gain.value = 0.85;
    comp.connect(master).connect(ctx.destination);
    bus = comp;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Note = {
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  attack?: number;
};

function note(freq: number, { at = 0, dur = 0.12, type = "sine", gain = 0.16, slideTo, attack = 0.006 }: Note = {}) {
  const a = audio();
  if (!a || !bus || !soundOn()) return;
  const t0 = a.currentTime + at;
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** A struck bell: a few inharmonic partials with a long fall. */
function bell(freq: number, at = 0, gain = 0.12, dur = 1.6) {
  [1, 2.01, 2.76, 4.07].forEach((ratio, i) => note(freq * ratio, { at, dur: dur / (i + 1), type: "sine", gain: gain / (i + 1.4) }));
}

/** A pentatonic scale over two octaves, so any run of tiles sounds like a phrase, never a clash. */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

export const sfx = {
  /** The note that belongs to a tile. */
  tile: (i: number) => {
    const f = SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length];
    note(f, { dur: 0.32, type: "triangle", gain: 0.11 });
    note(f * 2, { dur: 0.18, type: "sine", gain: 0.03 });
  },
  /** A light tap on a tile or a key. */
  tap: () => note(880, { dur: 0.05, type: "triangle", gain: 0.07 }),
  /** Right answer: a bright two-note chime. */
  hit: () => {
    note(1046.5, { dur: 0.13, type: "triangle", gain: 0.12 });
    note(1567.98, { at: 0.045, dur: 0.18, type: "sine", gain: 0.07 });
  },
  /** Wrong answer: a short low thud. */
  miss: () => {
    note(196, { dur: 0.2, type: "sawtooth", gain: 0.05, slideTo: 120 });
    note(98, { dur: 0.24, type: "sine", gain: 0.16 });
  },
  /** A life spent: a falling minor third over a soft drum. */
  life: () => {
    note(311.13, { dur: 0.3, type: "triangle", gain: 0.11, slideTo: 233.08 });
    note(146.83, { at: 0.02, dur: 0.42, type: "sine", gain: 0.18, slideTo: 98 });
  },
  /** A level cleared: a rising arpeggio. */
  level: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, { at: i * 0.065, dur: 0.24, type: "triangle", gain: 0.1 })),
  /** A new personal best: a quick sparkle and a bell. */
  best: () => {
    [783.99, 987.77, 1174.66, 1567.98, 1975.53].forEach((f, i) => note(f, { at: i * 0.05, dur: 0.2, type: "triangle", gain: 0.08 }));
    bell(1046.5, 0.3, 0.08, 1.2);
  },
  /** The trial ends. */
  over: () => bell(220, 0, 0.16, 1.8),
  /** The signal in Reaction Time. */
  go: () => note(1318.5, { dur: 0.08, type: "square", gain: 0.04 }),
  /** A quiet tick for countdowns. */
  tick: () => note(1400, { dur: 0.025, type: "sine", gain: 0.04 }),
  /** A soft swell when a trial begins. */
  start: () => {
    note(392, { dur: 0.22, type: "triangle", gain: 0.08 });
    note(587.33, { at: 0.08, dur: 0.3, type: "triangle", gain: 0.08 });
  },
};
