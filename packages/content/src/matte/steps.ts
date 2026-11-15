import { TIER_ORDER } from "../klammisar";
import { MATTE_STOPS } from "./world";

/**
 * Matteöns stora karta: 300 steg i 14 världar, en värld per äggnivå (Brons, Silver, Guld …).
 * Samma steg, namn och spel som utmaningarna i Eggly 1, så att barnens framsteg kan följa med.
 * Skillnaden: uppgifterna väljs nu av motorn, efter vad just det här barnet behöver.
 *
 * Varje steg spelas som ett minispel. Klarar man steget får man ett ägg från världens nivå.
 */

export type GameId = "rakna" | "bubbel" | "sant" | "minne" | "fanga" | "kiosk" | "krossa" | "storre" | "spurt" | "strid";

export interface Step {
  /** Samma id som i Eggly 1 (t.ex. «b1» eller «n3_7»). Byt aldrig. */
  id: string;
  /** Plats på kartan, 0–299. */
  index: number;
  /** Plats inom världen. */
  k: number;
  /** Äggnivå (index i TIERS) för världen och för ägget man får. */
  tier: number;
  /** Världens plats i ordningen, 0 = första. */
  world: number;
  game: GameId;
  /** Tidsnivå 0–4: ingen klocka, snigel, kanin, gepard, blixt. */
  tempo: number;
  /** Antal uppgifter (0 = spelet bestämmer). */
  n: number;
  title: string;
  boss: boolean;
  mini: boolean;
  /** Färdigheterna motorn väljer bland. */
  skills: string[];
}

export const TEMPO = [
  { name: "Ingen klocka", sec: 0, bolts: 0 },
  { name: "Snigel", sec: 20, bolts: 1 },
  { name: "Kanin", sec: 12, bolts: 2 },
  { name: "Gepard", sec: 7, bolts: 3 },
  { name: "Blixt", sec: 4, bolts: 4 },
] as const;

export const GAME_NAMES: Record<GameId, string> = {
  rakna: "Räkna", bubbel: "Bubbelpop", sant: "Rätt eller fel", minne: "Minnet", fanga: "Fånga talen",
  kiosk: "Kiosken", krossa: "Talkross", storre: "Vem är störst?", spurt: "Spurten", strid: "Striden",
};

/** Bossen i varje värld (index = nivå), från Eggly 1. */
export const WORLD_BOSSES = ["Surpuppan", "Griniga Grete", "Bråk-Bosse", "Isgnället", "Färgtjuven", "Drottning Sur", "Skuggkungen", "Dimmspöket", "Eldjätten", "Skurmonstret", "Rex Rasande", "Drömtjuven", "Skuggängeln", "Kosmos-Kungen"];

/* Utmaningarna som fanns redan i Eggly 1:s första version. De behåller sina id:n och namn. */
const OLD_CH: Record<string, [GameId, number, number, string]> = {
  b1: ["rakna", 0, 8, "Första talen"],
  b2: ["bubbel", 0, 8, "Bubbelstart"],
  b3: ["minne", 0, 6, "Minnesmys"],
  b4: ["strid", 0, 0, "Surpuppan"],
  s1: ["rakna", 1, 10, "Silverräkning"],
  s2: ["sant", 1, 10, "Sant eller inte"],
  s3: ["fanga", 1, 10, "Talregnet"],
  s4: ["strid", 1, 0, "Griniga Grete"],
  g1: ["bubbel", 1, 10, "Guldbubblor"],
  g2: ["kiosk", 1, 6, "Guldkiosken"],
  g3: ["minne", 2, 6, "Minnesguld"],
  g4: ["strid", 2, 0, "Bråk-Bosse"],
  p1: ["rakna", 2, 12, "Kanintempo"],
  p2: ["krossa", 1, 8, "Iskross"],
  p3: ["storre", 2, 10, "Vem väger mest?"],
  p4: ["strid", 2, 0, "Isgnället"],
  r1: ["sant", 2, 14, "Färgtestet"],
  r2: ["fanga", 2, 12, "Regnbågsregnet"],
  r3: ["spurt", 2, 0, "Regnbågsspurten"],
  r4: ["strid", 2, 0, "Färgtjuven"],
  q1: ["kiosk", 2, 6, "Slottskiosken"],
  q2: ["bubbel", 3, 12, "Kungliga bubblor"],
  q3: ["minne", 3, 8, "Hovets minne"],
  q4: ["strid", 3, 0, "Drottning Sur"],
  d1: ["rakna", 3, 12, "Nattens tal"],
  d2: ["storre", 3, 12, "Skuggvågen"],
  d3: ["krossa", 3, 8, "Mörkerkrossen"],
  d4: ["strid", 3, 0, "Skuggkungen"],
  h1: ["sant", 3, 14, "Syns eller syns inte"],
  h2: ["bubbel", 3, 12, "Spökbubblor"],
  h3: ["spurt", 3, 0, "Spökspurten"],
  h4: ["strid", 4, 0, "Dimmspöket"],
  l1: ["rakna", 3, 15, "Mästarprovet"],
  l2: ["fanga", 3, 14, "Stjärnfall"],
  l3: ["minne", 4, 8, "Evigt minne"],
  l4: ["strid", 4, 0, "Eldjätten"]
};
const ZN = [18, 18, 20, 20, 21, 21, 22, 22, 22, 23, 23, 23, 23, 24];
const ZADJ = ["Brons", "Silver", "Guld", "Platina", "Regnbågs", "Prinsess", "Mörker", "Spök", "Legend", "Svamp", "Dino", "Enhörnings", "Ängla", "Epic"];
const GNAME: Partial<Record<GameId, string>> = {
  rakna: "räkning", bubbel: "bubblor", sant: "testet", minne: "minnet", fanga: "regnet", kiosk: "kiosken",
  krossa: "krossen", storre: "vågen", spurt: "spurten",
};
const GLIST: GameId[] = ["rakna", "bubbel", "sant", "minne", "fanga", "kiosk", "krossa", "storre", "spurt"];

/** Vilka färdigheter ett steg tränar: kartans stopp i tur och ordning, med föregående stopp som repetition. */
function skillsFor(index: number, total: number): string[] {
  const s = Math.min(MATTE_STOPS.length - 1, Math.floor((index * MATTE_STOPS.length) / total));
  return [...MATTE_STOPS[s].skills, ...(s > 0 ? MATTE_STOPS[s - 1].skills : [])];
}

/** Byggs exakt som i Eggly 1 (samma ordning, spel och tider), så att gamla framsteg passar. */
export const STEPS: Step[] = (() => {
  const total = ZN.reduce((a, b) => a + b, 0);
  const out: Step[] = [];
  let gi = 0;
  TIER_ORDER.forEach((z, pos) => {
    const N = ZN[z], seen: Record<string, number> = {};
    for (let k = 0; k < N; k++, gi++) {
      const oldId = z < 9 ? "bsgprqdhl"[z] : null;
      let game = GLIST[(gi * 4 + z * 3 + (gi >> 3)) % 9];
      let tempo = gi < 24 ? 0 : gi < 70 ? 1 : gi < 130 ? 2 : gi < 200 ? 3 : 4;
      if (k % 3 === 2) tempo = Math.max(0, tempo - 1);
      let n = 8 + Math.min(7, Math.floor(gi / 45));
      let title: string | undefined;
      let id = "n" + z + "_" + k, boss = false, mini = false;
      if (k === N - 1) { boss = true; game = "strid"; n = 0; tempo = Math.max(tempo, Math.min(4, 1 + (pos >> 2))); }
      else if (k === 10) { mini = true; game = "strid"; n = 0; tempo = Math.max(0, tempo - 1); }
      else if (game === "minne") { n = 6 + Math.min(2, Math.floor(gi / 100)); tempo = Math.min(tempo, 4); }
      else if (game === "kiosk") { n = 6; tempo = Math.min(tempo, 2); }
      else if (game === "spurt") { n = 0; tempo = Math.max(1, tempo); }
      else if (game === "storre") n = 10;
      if (oldId) {
        const slot = [3, 6, 14].indexOf(k);
        const key = slot >= 0 ? oldId + (slot + 1) : (boss ? oldId + "4" : null);
        const o = key ? OLD_CH[key] : undefined;
        if (key && o) { id = key; [game, tempo, n, title] = o; }
      }
      if (!title) {
        if (boss) title = WORLD_BOSSES[z];
        else if (mini) title = "Mini-" + WORLD_BOSSES[z];
        else { title = ZADJ[z] + GNAME[game]; seen[game] = (seen[game] || 0) + 1; if (seen[game] > 1) title += " " + seen[game]; }
      }
      out.push({ id, index: gi, k, tier: z, world: pos, game, tempo, n, title, boss, mini, skills: skillsFor(gi, total) });
    }
  });
  return out;
})();

export const STEP_BY_ID: Record<string, Step> = Object.fromEntries(STEPS.map((s) => [s.id, s]));

/** Stjärnor för ett klarat steg, 1–5: färre fel ger fler. */
export function roundStars(right: number, wrong: number): number {
  const acc = right / Math.max(1, right + wrong);
  return acc >= 0.97 ? 5 : acc >= 0.9 ? 4 : acc >= 0.8 ? 3 : acc >= 0.65 ? 2 : 1;
}

/** Index för det sista öppna steget: alla klarade plus nästa. Stegen öppnas i ordning. */
export function openUpTo(cleared: Record<string, number>): number {
  let max = -1;
  for (const s of STEPS) if ((cleared[s.id] ?? 0) > 0) max = Math.max(max, s.index);
  return Math.min(STEPS.length - 1, max + 1);
}
