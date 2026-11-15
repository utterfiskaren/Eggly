import { TIER_ORDER } from "../klammisar";
import { MATTE_STOPS, ORIGINAL_STOP_IDS } from "./world";
import type { GameId } from "./steps";

/**
 * Alla spel: spel man väljer själv, med eget matteslag, egen svårighet och eget tempo. Som «Alla spel»
 * i Eggly 1. De första åtta nivåerna följer kartans stopp (nivå 1 = första stoppet). Nivå 9–15 finns
 * bara här: de bygger på mallarna för åk 4–6 och har inga stopp på kartan än.
 */

interface ArcadeStop { name: string; blurb: string; skills: string[]; stage: string }

const EXTRA_STOPS: ArcadeStop[] = [
  { name: "Uppställningen", blurb: "Plus och minus på höjden med stora tal, och avrunda.", stage: "åk 4",
    skills: ["ma.add.uppstallning", "ma.sub.uppstallning", "ma.tal.avrunda"] },
  { name: "Gångerslätten", blurb: "Gånger med flersiffriga tal.", stage: "åk 4–5", skills: ["ma.mul.flersiffrigt"] },
  { name: "Delningsdalen", blurb: "Dela stora tal, och det som blir över.", stage: "åk 4–5", skills: ["ma.div.kort", "ma.div.rest"] },
  { name: "Räkneordningen", blurb: "Vad räknar man först? Parenteser, gånger, plus och minus.", stage: "åk 5", skills: ["ma.alg.prioritering"] },
  { name: "Procenttoppen", blurb: "Procent av ett tal, och räkneordning.", stage: "åk 6", skills: ["ma.tal.procent", "ma.alg.prioritering"] },
  { name: "Ekvationsborgen", blurb: "Lös gåtan med x, och procent.", stage: "åk 6", skills: ["ma.alg.ekvation", "ma.tal.procent"] },
  { name: "Mästarnivån", blurb: "Allt från åk 4–6 i en enda röra.", stage: "åk 6",
    skills: ["ma.mul.flersiffrigt", "ma.div.kort", "ma.div.rest", "ma.alg.prioritering", "ma.tal.procent", "ma.alg.ekvation", "ma.add.uppstallning", "ma.sub.uppstallning"] },
  { name: "Bråkbergen", blurb: "Bråk av ett antal, och bråk som är lika mycket värda.", stage: "åk 4–5", skills: ["ma.tal.brak_del", "ma.tal.brak_likvardiga"] },
  { name: "Kommastigen", blurb: "Plus och minus med tal som har komma.", stage: "åk 5", skills: ["ma.tal.decimal"] },
  { name: "Under noll", blurb: "Tal under noll: plus och minus på tallinjen.", stage: "åk 5–6", skills: ["ma.tal.negativa"] },
  { name: "Kommagångern", blurb: "Gånger och delat med komma.", stage: "åk 6", skills: ["ma.mul.decimal", "ma.tal.decimal"] },
  { name: "Stora provet", blurb: "Alla nya sorter blandade: komma, bråk, minus, procent och mer.", stage: "åk 6–7",
    skills: ["ma.mul.decimal", "ma.tal.decimal", "ma.tal.negativa", "ma.tal.brak_del", "ma.tal.brak_likvardiga", "ma.alg.ekvation", "ma.tal.procent", "ma.alg.prioritering", "ma.mul.flersiffrigt", "ma.div.kort"] },
  { name: "Måttlandet", blurb: "Omkrets, area och att byta enhet.", stage: "åk 3–5", skills: ["ma.geo.omkrets", "ma.geo.area", "ma.geo.enhetsbyte", "ma.mat.volym_vikt"] },
  { name: "Tid och pengar", blurb: "Hur länge, växel och vad som blir kvar.", stage: "åk 4–5", skills: ["ma.mat.tidsskillnad", "ma.mat.pengar", "ma.geo.enhetsbyte"] },
  { name: "Statistikstan", blurb: "Medelvärde, median och typvärde.", stage: "åk 5–6", skills: ["ma.stat.medelvarde", "ma.samb.proportionalitet"] },
  { name: "Berättelsebyn", blurb: "Berättelser med flera steg, och proportion.", stage: "åk 5–6", skills: ["ma.prob.textuppgift_flera", "ma.samb.proportionalitet", "ma.mat.pengar"] },
  { name: "Det riktigt stora provet", blurb: "Mått, tid, pengar, statistik och berättelser blandade.", stage: "åk 6–7",
    skills: ["ma.geo.omkrets", "ma.geo.area", "ma.geo.enhetsbyte", "ma.mat.volym_vikt", "ma.mat.tidsskillnad", "ma.mat.pengar", "ma.stat.medelvarde", "ma.samb.proportionalitet", "ma.prob.textuppgift_flera", "ma.tal.procent"] },
  { name: "Siffrornas by", blurb: "Tiotal, hundratal, tusental och stora tal.", stage: "åk 1–5", skills: ["ma.tal.positionssystem100", "ma.tal.positionssystem1000", "ma.tal.positionssystem_stora"] },
  { name: "Huvudräkningen", blurb: "Överslag, smarta knep och lika mycket på båda sidor.", stage: "åk 3–6", skills: ["ma.rakna.huvudrakning", "ma.rakna.overslag", "ma.alg.likhetstecken"] },
  { name: "Mönsterskogen", blurb: "Mönster, bokstäver som tal, bråk och tänk-på-ett-tal.", stage: "åk 3–6", skills: ["ma.alg.monster", "ma.alg.uttryck", "ma.prob.logik", "ma.tal.brak_jamfora"] },
  { name: "Formernas land", blurb: "Hörn, kanter, symmetri, vinklar, längd och skala.", stage: "åk 1–6", skills: ["ma.geo.former", "ma.geo.kroppar", "ma.geo.symmetri", "ma.geo.langd", "ma.geo.vinklar", "ma.geo.skala"] },
  { name: "Klockslottet", blurb: "Klockan, tabeller, chans, koordinater och korta berättelser.", stage: "åk 1–6", skills: ["ma.mat.klockan_hel", "ma.mat.klockan_minut", "ma.stat.tabeller", "ma.stat.chans", "ma.samb.koordinater", "ma.prob.textuppgift_ett"] },
  { name: "Allra sista provet", blurb: "Allt det nya blandat. Sista nivån!", stage: "åk 1–7",
    skills: ["ma.tal.positionssystem1000", "ma.tal.positionssystem_stora", "ma.rakna.huvudrakning", "ma.rakna.overslag", "ma.alg.monster", "ma.alg.uttryck", "ma.prob.logik", "ma.tal.brak_jamfora", "ma.geo.kroppar", "ma.geo.vinklar", "ma.geo.skala", "ma.mat.klockan_minut", "ma.stat.chans", "ma.samb.koordinater"] },
];

const STAGES = ["förskoleklass–åk 1", "åk 1", "åk 1–2", "åk 2", "åk 2–3", "åk 3", "åk 3–4", "åk 4"];
const STOPS: ArcadeStop[] = [
  ...MATTE_STOPS.filter((s) => ORIGINAL_STOP_IDS.includes(s.id)).map((s, i) => ({ name: s.name, blurb: s.blurb, skills: s.skills, stage: STAGES[i] ?? "" })),
  ...EXTRA_STOPS,
];

export const ARCADE_LEVELS = STOPS.map((s, i) => ({
  level: i + 1,
  name: s.name,
  blurb: s.blurb,
  /** Ungefärlig årskurs, som i Eggly 1. */
  stage: s.stage,
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
  rush: "Spring i rätt bana och ta det rätta talet. Undvik de felaktiga!",
};

/** Ordningen på korten, som i Eggly 1. */
export const ARCADE_GAME_ORDER: GameId[] = ["rakna", "bubbel", "sant", "minne", "fanga", "kiosk", "krossa", "storre", "spurt", "rush", "strid"];

/**
 * Färdigheterna motorn väljer bland för en nivå och ett matteslag: stoppet för nivån och stoppet före.
 * Finns inget av matteslaget där används alla stopp upp till nivån. Tom lista = matteslaget finns inte
 * på den nivån än.
 */
export function arcadeSkills(level: number, op: ArcadeOp): string[] {
  const idx = Math.max(0, Math.min(STOPS.length - 1, Math.round(level) - 1));
  const prefix = ARCADE_OPS.find((o) => o.id === op)?.prefix ?? "";
  const match = (id: string) => id.startsWith(prefix);
  const near = [...STOPS[idx].skills, ...(idx > 0 ? STOPS[idx - 1].skills : [])].filter(match);
  if (near.length) return near;
  return STOPS.slice(0, idx + 1).flatMap((s) => s.skills).filter(match);
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
const LIVES = [5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
export const arcadeLives = (level: number) => LIVES[Math.max(0, Math.min(LIVES.length - 1, Math.round(level) - 1))];

