/**
 * Matteöns karta: en stig med fjorton stopp. Varje stopp tränar några närliggande färdigheter.
 * Stoppen följer kunskapskartan, men barnet behöver inte gå i ordning för att lära sig:
 * motorn repeterar alltid det som behövs. Kartan ger riktning och en känsla av att komma framåt.
 *
 * Reglerna här är rena funktioner så att de kan provas utan databas.
 */

export interface WorldStop {
  /** Stabilt id. Sparas i databasen, byt aldrig. */
  id: string;
  name: string;
  /** En mening till barnet om vad man gör här. */
  blurb: string;
  skills: string[];
  /** Läge på kartan i procent av bredd och höjd (0–100). */
  x: number;
  y: number;
}

export const MATTE_STOPS: WorldStop[] = [
  { id: "prickstranden", name: "Prickstranden", blurb: "Räkna prickar och hitta talens ordning.",
    skills: ["ma.tal.antal10", "ma.tal.ordning20", "ma.tal.jamfora"], x: 8, y: 88 },
  { id: "plusviken", name: "Plusviken", blurb: "Plus och minus upp till 10.",
    skills: ["ma.add.inom10", "ma.sub.inom10"], x: 24, y: 84 },
  { id: "formstranden", name: "Formstranden", blurb: "Former, hela och halva timmar, mönster och tiotal.",
    skills: ["ma.geo.former", "ma.mat.klockan_hel", "ma.alg.monster", "ma.tal.positionssystem100"], x: 42, y: 86 },
  { id: "tiokompisklippan", name: "Tiokompisklippan", blurb: "Tiokompisar och tal som saknas.",
    skills: ["ma.tal.tiokamrater", "ma.alg.saknat_tal"], x: 60, y: 80 },
  { id: "tjugoskogen", name: "Tjugoskogen", blurb: "Plus och minus upp till 20, dubbelt och hälften.",
    skills: ["ma.add.inom20_utan", "ma.sub.inom20_utan", "ma.samb.dubbelt_halften"], x: 78, y: 74 },
  { id: "tiobron", name: "Tiobron", blurb: "Plus och minus över tian.",
    skills: ["ma.add.inom20_med", "ma.sub.inom20_med"], x: 88, y: 60 },
  { id: "klockbacken", name: "Klockbacken", blurb: "Klockan på minuten, längd och lika mycket på båda sidor.",
    skills: ["ma.mat.klockan_minut", "ma.geo.langd", "ma.alg.likhetstecken", "ma.tal.positionssystem1000"], x: 72, y: 52 },
  { id: "gruppgrottan", name: "Gruppgrottan", blurb: "Lika många i varje grupp, och dela lika.",
    skills: ["ma.mul.grupper", "ma.div.likadelning", "ma.mul.tabell_2_5_10"], x: 52, y: 48 },
  { id: "spegelgrottan", name: "Spegelgrottan", blurb: "3D-former, spegelbilder, tabeller och korta berättelser.",
    skills: ["ma.geo.kroppar", "ma.geo.symmetri", "ma.stat.tabeller", "ma.prob.textuppgift_ett"], x: 32, y: 44 },
  { id: "storstadsberget", name: "Storstadsberget", blurb: "Plus och minus med stora tal.",
    skills: ["ma.add.tvasiffrigt", "ma.sub.tvasiffrigt"], x: 14, y: 36 },
  { id: "huvudrakningsbyn", name: "Huvudräkningsbyn", blurb: "Smarta knep, överslag, jättestora tal och tänk-på-ett-tal.",
    skills: ["ma.rakna.huvudrakning", "ma.rakna.overslag", "ma.tal.positionssystem_stora", "ma.prob.logik"], x: 20, y: 22 },
  { id: "tabelltornet", name: "Tabelltornet", blurb: "Gångertabellerna och division.",
    skills: ["ma.mul.tabell_3_4", "ma.mul.tabell_6_9", "ma.div.tabell"], x: 40, y: 14 },
  { id: "vinkelberget", name: "Vinkelberget", blurb: "Vinklar, chans och vilket bråk som är störst.",
    skills: ["ma.geo.vinklar", "ma.stat.chans", "ma.tal.brak_jamfora"], x: 62, y: 10 },
  { id: "bokstavsborgen", name: "Bokstavsborgen", blurb: "Bokstäver som tal, skala och koordinater.",
    skills: ["ma.alg.uttryck", "ma.geo.skala", "ma.samb.koordinater"], x: 84, y: 14 },
];

/** Kartans ursprungliga åtta stopp. Alla spel bygger sina första nivåer på dem och ska inte flytta sig när kartan växer. */
export const ORIGINAL_STOP_IDS = ["prickstranden", "plusviken", "tiokompisklippan", "tjugoskogen", "tiobron", "gruppgrottan", "storstadsberget", "tabelltornet"];

export const WORLD_RULES = {
  /** Stjärnor på föregående stopp som öppnar nästa. */
  starsToOpenNext: 2,
  /** Hur många stopp som är öppna från start, efter årskurs (index = årskurs, 0 = förskoleklass). */
  openFromStartByGrade: [1, 1, 4, 6, 10, 14, 14, 14, 14, 14],
  /** Stjärnor per ägg. Ett pass ger 8–16 stjärnor, så ungefär ett ägg varannan omgång. */
  starsPerEgg: 25,
} as const;

/**
 * Stjärnor för ett pass på ett stopp, 1–3. Ett avslutat pass ger alltid minst en stjärna:
 * att försöka ska aldrig ge noll.
 */
export function stopStars(correct: number, clean: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 1;
  if (correct / total >= 0.85 && clean / total >= 0.6) return 3;
  if (correct / total >= 0.7) return 2;
  return 1;
}

export type SkillStatusLike = "not_started" | "introduced" | "practicing" | "secure" | "mastered" | string;

/**
 * Vilka stopp som är öppna. Ett stopp öppnas om
 *  - det ligger inom de som är öppna från start för barnets årskurs, eller
 *  - föregående stopp har minst `starsToOpenNext` stjärnor, eller
 *  - barnet redan är säkert på alla färdigheter i föregående stopp, eller
 *  - läraren har öppnat det.
 * Stopp öppnas i ordning: ett öppet stopp betyder att alla före också är öppna.
 */
export function openStops(input: {
  grade: number;
  stars: Record<string, number>;
  skillStatus: Record<string, SkillStatusLike>;
  teacherOpened?: string[];
}, stops: WorldStop[] = MATTE_STOPS): number {
  const fromStart = WORLD_RULES.openFromStartByGrade[Math.max(0, Math.min(9, input.grade))];
  let open = Math.max(1, fromStart);
  for (let i = 0; i < stops.length - 1; i++) {
    const s = stops[i];
    const enough = (input.stars[s.id] ?? 0) >= WORLD_RULES.starsToOpenNext;
    const knows = s.skills.every((k) => ["secure", "mastered"].includes(input.skillStatus[k] ?? ""));
    const teacher = input.teacherOpened?.includes(stops[i + 1].id) ?? false;
    if (i < open && (enough || knows)) open = Math.max(open, i + 2);
    if (teacher) open = Math.max(open, i + 2);
  }
  return Math.min(open, stops.length);
}

/** Ägg som finns att kläcka: intjänade minus redan kläckta. */
export function eggsAvailable(totalStars: number, hatched: number): number {
  return Math.max(0, Math.floor(totalStars / WORLD_RULES.starsPerEgg) - hatched);
}

/** Hur långt nästa ägg har kommit, 0–1. */
export function eggProgress(totalStars: number): number {
  return (totalStars % WORLD_RULES.starsPerEgg) / WORLD_RULES.starsPerEgg;
}
