import * as art from "./art";

/**
 * Klämmisarna i Eggly 2. Samma figurer som i Eggly 1, så att barnens gamla samlingar följer med.
 * Inget går att köpa. Ägg tjänas bara in med stjärnor från spelet.
 */

export type Treats = Partial<Record<"hat" | "glasses" | "bow" | "clothes" | "acc" | "skin", string>>;

export interface Species {
  id: string;
  name: string;
  kind: string;
  /** Nivå (index i TIERS). */
  tier: number;
  txt: string;
  special?: string;
}

export const TIERS = art.TIERS as unknown as { id: string; name: string; egg: [string, string, string]; stat: string }[];
/** Nivåernas ordning från lättast till svårast. RANK[nivå] = plats i ordningen. */
export const TIER_ORDER: number[] = art.TORDER;
export const TIER_RANK: number[] = art.RANK;
export const SPECIES: Species[] = art.SQ;
export const SLOT_NAME: Record<string, string> = art.SLOT_NAME;

/** Arter som kan komma ur vanliga ägg. Specialarterna fick man för särskilda bedrifter i Eggly 1. */
export const HATCHABLE: Species[] = SPECIES.filter((s) => !s.special);

export function speciesById(id: string): Species | undefined {
  return art.SQ_BY[id];
}

export function treatName(id: string): string | undefined {
  return (art.TREAT_BY[id] ?? art.SKIN_BY[id])?.name;
}

/** SVG-text för en klämmis. Varje anrop får egna id:n för gradienter, så flera kan ritas på samma sida. */
export function squishySvg(id: string, treats: Treats = {}): string {
  return art.sqSVG(id, { treats });
}

/** SVG-text för ett ägg av en viss nivå, med 0–5 sprickor. */
export function eggSvg(tier: number, cracks = 0): string {
  return art.eggSVG(tier, cracks);
}

/** Hur många tryck ett ägg av nivån behöver för att kläckas. */
export function tapsFor(tier: number): number {
  return art.TAPS[tier] ?? 3;
}

export interface Hatched { id: string; tier: number; treats: Treats; seed: number }

/**
 * Bestämmer vad ett ägg blir. `maxRank` är den bästa nivån barnet kan få (efter hur långt det kommit
 * på kartan). Oftast blir det den nivån, ibland en eller två steg lägre. Arter barnet inte har än
 * kommer tre gånger så ofta som dubbletter.
 */
export function hatchRoll(owned: string[], maxRank: number, rnd: () => number = Math.random): Hatched {
  const top = Math.max(0, Math.min(TIER_ORDER.length - 1, Math.floor(maxRank)));
  const r = rnd();
  const rank = Math.max(0, top - (r < 0.5 ? 0 : r < 0.85 ? 1 : 2));
  return hatchFromTier(owned, TIER_ORDER[rank], rnd);
}

/** Kläcker ett ägg av en bestämd nivå (som äggen från stegen på kartan). Nya arter kommer oftare. */
export function hatchFromTier(owned: string[], tier: number, rnd: () => number = Math.random): Hatched {
  let t = tier;
  let pool = HATCHABLE.filter((s) => s.tier === t);
  if (pool.length === 0) { t = TIER_ORDER[0]; pool = HATCHABLE.filter((s) => s.tier === t); }
  const have = new Set(owned);
  const w = pool.map((s) => (have.has(s.id) ? 1 : 3));
  let x = rnd() * w.reduce((a, b) => a + b, 0);
  let pick = pool[0];
  for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { pick = pool[i]; break; } }
  return { id: pick.id, tier: t, treats: art.rollTreats(t), seed: Math.floor(rnd() * 2147483647) };
}

export interface Stats { mj: number; st: number; gl: number; kl: number; kraft: number }

/** Mjukhet, Studs, Glitter och Klurighet. Mjukhet tål smällar, Studs slår hårdare, Glitter ger superslag, Klurighet ger mer tid. */
export function squishyStats(id: string, seed: number, treats: Treats = {}): Stats {
  return art.statsOf(id, seed, treats) as Stats;
}

/** Grundstyrkan för en nivå (index i TIERS). Bossens styrka räknas från den. */
export function tierBase(tier: number): number {
  return art.TIER_BASE[tier] ?? 10;
}

/** Bossen i en värld (index = äggnivå): SVG-text, arg. */
export function bossSvg(tier: number): string {
  return art.sqSVG("boss" + Math.max(0, Math.min(13, tier)), { angry: true });
}
