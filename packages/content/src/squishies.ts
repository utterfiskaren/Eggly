/**
 * Klämmisarna: Egglys egna figurer som kläcks ur ägg. Alla är originalfigurer.
 * Utseendet byggs av några få delar (färg, öron, mönster, sak) så att de ritas som SVG utan bilder.
 *
 * Inget går att köpa. Ägg tjänas bara genom att spela, och sällsynta klämmisar ger ingen fördel i spelet.
 */

export type Ears = "none" | "round" | "pointy" | "bunny" | "sprout";
export type Pattern = "none" | "spots" | "belly" | "stripes";
export type Extra = "none" | "bow" | "leaf" | "star" | "glasses" | "crown";
export type Rarity = "vanlig" | "ovanlig" | "sallsynt";

export interface Squishy {
  /** Stabilt id. Sparas i databasen, byt aldrig. */
  id: string;
  name: string;
  /** En kort rad som visas när den kläcks. */
  line: string;
  body: string;
  accent: string;
  ears: Ears;
  pattern: Pattern;
  extra: Extra;
  rarity: Rarity;
}

export const SQUISHIES: Squishy[] = [
  { id: "mochi", name: "Mochi", line: "Mjuk som en kudde och gillar att räkna till tio.",
    body: "#fbe3ec", accent: "#e8336f", ears: "none", pattern: "none", extra: "bow", rarity: "vanlig" },
  { id: "pudding", name: "Pudding", line: "Darrar lite när det blir spännande.",
    body: "#ffe9a8", accent: "#c98a12", ears: "round", pattern: "belly", extra: "none", rarity: "vanlig" },
  { id: "bubbel", name: "Bubbel", line: "Blåser bubblor i formen av siffror.",
    body: "#cfe6ff", accent: "#2f7fe0", ears: "none", pattern: "spots", extra: "none", rarity: "vanlig" },
  { id: "kanelbulle", name: "Kanelbulle", line: "Luktar nybakat och delar alltid lika.",
    body: "#f2d2b0", accent: "#9a5a2a", ears: "round", pattern: "stripes", extra: "none", rarity: "vanlig" },
  { id: "tuss", name: "Tuss", line: "Så luddig att man tappar räkningen.",
    body: "#ece8f7", accent: "#7a6aa8", ears: "pointy", pattern: "none", extra: "none", rarity: "vanlig" },
  { id: "plopp", name: "Plopp", line: "Säger plopp varje gång någon svarar rätt.",
    body: "#c9f0e1", accent: "#1f9e78", ears: "sprout", pattern: "none", extra: "leaf", rarity: "vanlig" },
  { id: "mango", name: "Mango", line: "Solig och lite busig.",
    body: "#ffd0a6", accent: "#e0661f", ears: "bunny", pattern: "belly", extra: "none", rarity: "ovanlig" },
  { id: "dimma", name: "Dimma", line: "Syns knappt i morgondimman, men hör allt.",
    body: "#dde3ea", accent: "#5b6b7d", ears: "pointy", pattern: "spots", extra: "glasses", rarity: "ovanlig" },
  { id: "blabar", name: "Blåbär", line: "Rund och blå och full av goda idéer.",
    body: "#c7c9f5", accent: "#4a4fc4", ears: "round", pattern: "none", extra: "star", rarity: "ovanlig" },
  { id: "lakrits", name: "Lakrits", line: "Svart och blank, och gillar kluriga uppgifter.",
    body: "#4a3d55", accent: "#ffd23f", ears: "bunny", pattern: "stripes", extra: "none", rarity: "ovanlig" },
  { id: "gnista", name: "Gnista", line: "Lyser upp när man lär sig något nytt.",
    body: "#fff3b8", accent: "#e8336f", ears: "pointy", pattern: "none", extra: "star", rarity: "sallsynt" },
  { id: "moln", name: "Moln", line: "Svävar lite ovanför marken. Ingen vet hur.",
    body: "#ffffff", accent: "#2f7fe0", ears: "sprout", pattern: "belly", extra: "crown", rarity: "sallsynt" },
];

const WEIGHT: Record<Rarity, number> = { vanlig: 6, ovanlig: 3, sallsynt: 1 };

export const RARITY_LABEL: Record<Rarity, string> = { vanlig: "Vanlig", ovanlig: "Ovanlig", sallsynt: "Sällsynt" };

/**
 * Väljer vilken klämmis ett ägg blir. Barnet får aldrig en dubblett förrän hela samlingen är komplett.
 * `roll` är ett tal 0–1 från servern.
 */
export function hatchPick(owned: string[], roll: number): Squishy {
  const have = new Set(owned);
  const pool = SQUISHIES.filter((s) => !have.has(s.id));
  const from = pool.length > 0 ? pool : SQUISHIES;
  const total = from.reduce((a, s) => a + WEIGHT[s.rarity], 0);
  let x = Math.min(0.999999, Math.max(0, roll)) * total;
  for (const s of from) { x -= WEIGHT[s.rarity]; if (x < 0) return s; }
  return from[from.length - 1];
}

export function squishyById(id: string): Squishy | undefined {
  return SQUISHIES.find((s) => s.id === id);
}
