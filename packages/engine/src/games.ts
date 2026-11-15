import { int, pick } from "./rng";

/**
 * Logiken bakom minispelen som inte bygger på motorns vanliga mattemallar: Kiosken (pengar) och
 * Talkross (rutor som tillsammans blir målet). Ren kod utan skärm, som resten av motorn.
 * Nivå är världens plats på kartan, 1–14, som «lvl» i Eggly 1.
 */

/** Varorna i Kiosken: id (samma som klämmisen), «en …» och flertal. */
export const KIOSK_ITEMS: readonly [string, string, string][] = [
  ["bulle", "En kanelbulle", "kanelbullar"], ["munk", "En munk", "munkar"], ["glass", "En glass", "glassar"],
  ["jordgubbe", "En jordgubbe", "jordgubbar"], ["muffin", "En muffin", "muffins"], ["persika", "En persika", "persikor"],
  ["avokado", "En avokado", "avokador"],
];

export interface KioskTask {
  /** Klämmisen som är varan. */
  itemId: string;
  /** Texten. Det som står mellan ** ** är fetstilt. */
  say: string;
  /** Summan i kronor som ska läggas upp (priset, eller växeln). */
  need: number;
}

const B = (v: number) => `**${v} kr**`;

export function kioskTask(rng: () => number, level: number): KioskTask {
  const it = pick(rng, KIOSK_ITEMS), other = pick(rng, KIOSK_ITEMS), one = it[1];
  const L = Math.max(1, Math.min(9, Math.round(level)));
  let need: number, say: string;
  switch (L) {
    case 1: need = int(rng, 2, 10); say = `${one} kostar ${B(need)}. Lägg upp pengarna!`; break;
    case 2: need = int(rng, 11, 20); say = `${one} kostar ${B(need)}. Lägg upp pengarna!`; break;
    case 3: need = int(rng, 21, 50); say = `${one} kostar ${B(need)}. Lägg upp pengarna!`; break;
    case 4: need = int(rng, 51, 100); say = `${one} kostar ${B(need)}. Lägg upp pengarna!`; break;
    case 5: { const a = int(rng, 12, 45), b = int(rng, 12, 45); need = a + b; say = `${one} kostar ${B(a)} och ${other[1].toLowerCase()} ${B(b)}. Betala båda!`; break; }
    case 6: { const pr = int(rng, 11, 89), pay = pr < 50 ? 50 : 100; need = pay - pr; say = `${one} kostar ${B(pr)}. Kunden ger dig ${pay} kr. Ge rätt växel!`; break; }
    case 7: { const n = int(rng, 2, 6), pr = int(rng, 3, 12); need = n * pr; say = `${n} ${it[2]} för ${B(pr)} styck. Vad blir det?`; break; }
    case 8: { const n = int(rng, 2, 5), pr = int(rng, 6, 18), t = n * pr, pay = t <= 100 ? 100 : 200; need = pay - t; say = `${n} ${it[2]} för ${B(pr)} styck. Kunden ger dig ${pay} kr. Ge rätt växel!`; break; }
    default: { const n = int(rng, 3, 6), pr = 2 * int(rng, 4, 15); need = (n * pr) / 2; say = `Halva priset! ${n} ${it[2]} som brukar kosta ${B(pr)} styck. Vad blir det?`; }
  }
  return { itemId: it[0], say, need };
}

/** Så svår är Kiosken: nivån på kartan avgör vilken sorts uppgift det blir (1–9). */
export const kioskLevel = (world: number) => Math.max(1, Math.min(9, world + 1));

export interface KrossMode {
  /** Gånger i stället för plus. */
  mul: boolean;
  /** Antal rutor som ska väljas. */
  k: number;
  /** Största talet på en ruta. */
  hi: number;
}

export function krossMode(level: number): KrossMode {
  const L = Math.max(1, Math.round(level));
  if (L <= 2) return { mul: false, k: 2, hi: 9 };
  if (L <= 4) return { mul: false, k: 3, hi: 9 };
  if (L <= 6) return { mul: true, k: 2, hi: 9 };
  return { mul: true, k: 3, hi: 5 };
}

/** Summan (eller produkten) av de valda rutorna. */
export function krossValue(mode: KrossMode, values: number[]): number {
  return values.reduce((a, v) => (mode.mul ? a * v : a + v), mode.mul ? 1 : 0);
}

/** Ett tal för en ruta: gånger-lägena börjar på 2, så att ingen ruta gör att resten försvinner. */
export function krossTile(rng: () => number, mode: KrossMode): number {
  return int(rng, mode.mul ? 2 : 1, mode.hi);
}

/**
 * Vem är störst?: väljer en andra uppgift att jämföra med. Oftast ett annat svar nära det första
 * (så att man måste räkna), ibland samma svar (då är rätt svar «lika mycket»). Ger platsen i
 * `pool`, eller -1 om inget passar. `taken` är platser som redan används.
 */
export function pickPartner(rng: () => number, answer: number, pool: readonly { answer: number }[], taken: ReadonlySet<number>): number {
  const free = pool.map((p, i) => i).filter((i) => !taken.has(i));
  const same = free.filter((i) => pool[i].answer === answer);
  if (rng() < 0.14 && same.length) return pick(rng, same);
  const diff = free.filter((i) => pool[i].answer !== answer);
  const near = diff.filter((i) => Math.abs(pool[i].answer - answer) <= Math.max(3, answer * 0.35));
  if (near.length) return pick(rng, near);
  if (diff.length) return diff.reduce((best, i) => (Math.abs(pool[i].answer - answer) < Math.abs(pool[best].answer - answer) ? i : best), diff[0]);
  return same.length ? same[0] : -1;
}

/* ── Spurten, Minnet och Striden ─────────────────────────────────────────── */

const SPURT_TOTAL = [0, 120, 90, 60, 40];
const PER_TASK = [0, 10, 7, 4.5, 3];
const levelFactor = (lvl: number) => (lvl >= 14 ? 3.2 : lvl >= 10 ? 2.4 : lvl >= 6 ? 1.7 : lvl >= 4 ? 1.25 : 1);

/**
 * Spurten: hur länge klockan går och hur många rätt som krävs. Spurten har alltid en klocka,
 * så tempo 0 räknas som tempo 1. `world` är världens plats (0 = första).
 */
export function spurtPlan(tempo: number, world: number): { total: number; goal: number } {
  const t = Math.max(1, Math.min(4, Math.round(tempo)));
  const total = SPURT_TOTAL[t];
  const per = PER_TASK[t] * levelFactor(world + 1);
  return { total, goal: Math.max(4, Math.round(total / per)) };
}

/** Spurten klaras med så många rätt som målet. Stjärnor efter hur långt över målet man kommer. */
export const spurtPassed = (right: number, goal: number) => right >= goal;
export function spurtStars(right: number, goal: number): number {
  const r = right / Math.max(1, goal);
  return r >= 1.6 ? 5 : r >= 1.4 ? 4 : r >= 1.25 ? 3 : r >= 1.12 ? 2 : 1;
}

/** Minnet: totala sekunder för alla par. 0 = ingen klocka. */
export function minneClock(tempo: number, world: number, pairs: number): number {
  const per = PER_TASK[Math.max(0, Math.min(4, Math.round(tempo)))];
  return Math.round(per * pairs * (world + 1 >= 6 ? 1.4 : 1) * 10) / 10;
}

export interface FightNumbers {
  /** Bossens livspoäng. */
  maxB: number;
  /** Skadan bossen gör på dig vid ett fel. */
  hit: number;
  /** Dina livspoäng. */
  maxH: number;
  /** Skadan du gör vid ett rätt svar (varierar lite). */
  baseD: number;
  /** Chans till superslag i procent. */
  crit: number;
  /** Mer tid per uppgift med Klurighet. */
  timeX: number;
}

/** Striden: siffrorna för en kamp, från bossens grundstyrka och kämpens krafter (som i Eggly 1). */
export function fightNumbers(base: number, stats: { mj: number; st: number; gl: number; kl: number }): FightNumbers {
  const B = base;
  return {
    maxB: Math.round(B * 8),
    hit: Math.round(B * 0.9),
    maxH: Math.round(Math.max(B * 3, stats.mj * 4)),
    baseD: Math.max(B * 0.6, stats.st),
    crit: Math.max(10, Math.min(40, 10 + (30 * stats.gl) / (stats.gl + B))),
    timeX: 1 + (0.6 * stats.kl) / (stats.kl + B),
  };
}
