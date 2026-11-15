/**
 * FSRS 4.5 (Free Spaced Repetition Scheduler, öppen källkod) med standardvikterna.
 * Följer varje minnesfakta, till exempel 7×8: hur stabilt minnet är (S), hur svårt faktumet är för
 * just detta barn (D), och när det bör komma tillbaka. Ett faktum barnet ofta svarar fel på
 * kommer därför oftare, och ett som sitter kommer allt mer sällan.
 */

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367,
  1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755] as const;
const DECAY = -0.5;
const FACTOR = 19 / 81;
const DAY = 86_400_000;

/** 1 = fel, 2 = rätt med hjälp, 3 = rätt, 4 = rätt och lätt (används inte än: svarstid ensam får inte avgöra). */
export type Grade = 1 | 2 | 3 | 4;

export interface Card {
  s: number;      // stabilitet i dagar
  d: number;      // svårighet 1–10
  last: number;   // senaste repetition (ms)
  due: number;    // nästa repetition (ms)
  reps: number;
  lapses: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function retrievability(card: Card, now: number): number {
  const t = Math.max(0, (now - card.last) / DAY);
  return Math.pow(1 + (FACTOR * t) / card.s, DECAY);
}

function intervalDays(s: number, retention: number): number {
  return (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
}

function initD(g: Grade): number {
  return clamp(W[4] - (g - 3) * W[5], 1, 10);
}

/**
 * Uppdatera efter ett svar. Barn behöver tätare repetition än vuxna med kortlekar,
 * så målet är 90 % sannolikhet att minnas och längsta intervall 60 dagar.
 */
export function review(card: Card | undefined, g: Grade, now: number, retention = 0.9, maxDays = 60): Card {
  let s: number, d: number;
  if (!card) {
    s = W[g - 1];
    d = initD(g);
  } else {
    const r = retrievability(card, now);
    const dNext = card.d - W[6] * (g - 3);
    d = clamp(W[7] * initD(3) + (1 - W[7]) * dNext, 1, 10);
    if (g === 1) {
      s = W[11] * Math.pow(card.d, -W[12]) * (Math.pow(card.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
      s = Math.min(s, card.s);
    } else {
      const hard = g === 2 ? W[15] : 1;
      const easy = g === 4 ? W[16] : 1;
      s = card.s * (Math.exp(W[8]) * (11 - card.d) * Math.pow(card.s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
    }
  }
  s = clamp(s, 0.1, 3650);
  // Fel: kom tillbaka redan i nästa omgång (inom 10 minuter), inte efter flera dagar.
  const days = g === 1 ? 10 / 1440 : clamp(intervalDays(s, retention), 10 / 1440, maxDays);
  return {
    s, d, last: now, due: now + days * DAY,
    reps: (card?.reps ?? 0) + 1,
    lapses: (card?.lapses ?? 0) + (g === 1 ? 1 : 0),
  };
}

export function gradeFor(correct: boolean, hintLevel: number): Grade {
  if (!correct) return 1;
  return hintLevel > 0 ? 2 : 3;
}
