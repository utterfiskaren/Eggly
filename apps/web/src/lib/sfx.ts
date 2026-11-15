/**
 * Ljud utan ljudfiler: korta toner som byggs med Web Audio. Ljudet är på från start och kan stängas av
 * (valet sparas i webbläsaren). Ljud startar bara efter att barnet tryckt på något, så webbläsaren tillåter det.
 */
let ctx: AudioContext | null = null;
const KEY = "eggly:ljud";

export function soundOn(): boolean {
  try { return localStorage.getItem(KEY) !== "av"; } catch { return true; }
}
export function setSound(on: boolean) {
  try { localStorage.setItem(KEY, on ? "pa" : "av"); } catch { /* sparas inte, men funkar i sidan */ }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !soundOn()) return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.16) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}

const play = (notes: [number, number, number, OscillatorType?][]) => {
  const c = audio();
  if (c) for (const [f, s, d, t] of notes) tone(c, f, s, d, t);
};

export const sfx = {
  /** Rätt svar: två stigande toner. */
  right: () => play([[660, 0, 0.12], [880, 0.09, 0.18]]),
  /** Fel svar: en mjuk, låg ton. Inget skarpt. */
  wrong: () => play([[220, 0, 0.22, "triangle"], [196, 0.12, 0.25, "triangle"]]),
  /** Vänt kort, tryck. */
  tap: () => play([[520, 0, 0.06]]),
  /** Superslag och träff. */
  hit: () => play([[300, 0, 0.1, "square"], [450, 0.06, 0.12, "square"]]),
  /** Klarat: en liten fanfar. */
  win: () => play([[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.36, 0.4]]),
  /** Inte klarat: sjunkande men vänligt. */
  lose: () => play([[392, 0, 0.18, "triangle"], [330, 0.16, 0.18, "triangle"], [262, 0.32, 0.3, "triangle"]]),
};
