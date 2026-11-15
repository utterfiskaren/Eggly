import { TIER_ORDER } from "../klammisar";
import { MATTE_STOPS } from "./world";
import type { GameId } from "./steps";

/**
 * Alla spel: spel man väljer själv, med eget matteslag, egen svårighet och eget tempo. Som «Alla spel»
 * i Eggly 1. Svårigheten följer kartans stopp (nivå 1 = första stoppet). Motorns mattemallar når
 * än så länge åk 3–4, så det finns åtta nivåer. Fler kommer med fler mallar.
 */

export const ARCADE_LEVELS = MATTE_STOPS.map((s, i) => ({
  level: i + 1,
  name: s.name,
  blurb: s.blurb,
  /** Ungefärlig årskurs, som i Eggly 1. */
  stage: ["förskoleklass–åk 1", "åk 1", "åk 1–2", "åk 2", "åk 2–3", "åk 3", "åk 3–4", "åk 4"][i] ?? "",
}));

export type ArcadeOp = "mix" | "add" | "sub" | "mul" | "div";

export const ARCADE_OPS: { id: ArcadeOp; name: string; prefix: string }[] = [
  { id: "mix", name: "Blandat", prefix: "" },
  { id: "add", name: "Plus", prefix: "ma.add" },
  { id: "sub", name: "Minus", prefix: "ma.sub" },
  { id: "mul", name: "Gånger", prefix: "ma.mul" },
  { id: "div", name: "Delat", prefix: "ma.div" },
];

/** Spelen man kan välja själv (de som är byggda skickas in av servern). */
export const ARCADE_GAME_INFO: Record<GameId, string> = {
  rakna: "Skriv svaret med knappsatsen.",
  bubbel: "Poppa bubblan med rätt svar innan tiden tar slut.",
  sant: "Stämmer talet? Tryck Rätt eller Fel så fort du kan.",
  minne: "Hitta paren: talet och dess svar.",
  fanga: "Dra klämmisen under rätt svar och fånga det.",
  kiosk: "Betala med exakt rätt pengar eller ge rätt växel.",
  krossa: "Tryck på rutor som tillsammans blir målet.",
  storre: "Vilket tal blir störst? Eller är de lika?",
  spurt: "Hur många hinner du innan klockan tar slut?",
  strid: "Svara rätt för att slå bossen. Din klämmis spelar roll!",
};

/** Ordningen på korten, som i Eggly 1. */
export const ARCADE_GAME_ORDER: GameId[] = ["rakna", "bubbel", "sant", "minne", "fanga", "kiosk", "krossa", "storre", "spurt", "strid"];

/**
 * Färdigheterna motorn väljer bland för en nivå och ett matteslag: stoppet för nivån och stoppet före.
 * Finns inget av matteslaget där används alla stopp upp till nivån. Tom lista = matteslaget finns inte
 * på den nivån än.
 */
export function arcadeSkills(level: number, op: ArcadeOp): string[] {
  const idx = Math.max(0, Math.min(MATTE_STOPS.length - 1, Math.round(level) - 1));
  const prefix = ARCADE_OPS.find((o) => o.id === op)?.prefix ?? "";
  const match = (id: string) => id.startsWith(prefix);
  const near = [...MATTE_STOPS[idx].skills, ...(idx > 0 ? MATTE_STOPS[idx - 1].skills : [])].filter(match);
  if (near.length) return near;
  return MATTE_STOPS.slice(0, idx + 1).flatMap((s) => s.skills).filter(match);
}

/** Matteslagen som finns på en nivå. «Blandat» finns alltid. */
export function arcadeOps(level: number): ArcadeOp[] {
  return ARCADE_OPS.filter((o) => arcadeSkills(level, o.id).length > 0).map((o) => o.id);
}

/** Äggets nivå för ett pass: svårare nivå och snabbare tempo ger bättre ägg (som i Eggly 1). Utan klocka blir ägget aldrig bättre än plats 6 i ordningen. */
const TEMPO_BONUS = [0, 0, 1, 1, 2];
export function arcadeEggTier(level: number, tempo: number): number {
  const base = Math.max(0, Math.min(13, Math.round(level) - 1));
  const t = Math.max(0, Math.min(TIER_ORDER.length - 1, base + (TEMPO_BONUS[Math.max(0, Math.min(4, tempo))] ?? 0)));
  return TIER_ORDER[tempo === 0 ? Math.min(t, 5) : t];
}

/** Hjärtan per nivå, som kartans världar: fler fel tillåts på de lägsta nivåerna. */
const LIVES = [5, 5, 4, 4, 3, 3, 3, 2];
export const arcadeLives = (level: number) => LIVES[Math.max(0, Math.min(LIVES.length - 1, Math.round(level) - 1))];

