import type { Question, Representation, Template } from "../question";
import { int, pick, shuffle } from "../rng";

/**
 * Frågemallar för matte, version 1. Varje mall räknar ut facit själv: inga svar skrivs för hand och
 * inget genereras fritt av AI. Svårigheten 0–1 väljer bland talen, från lätt till svårt.
 */

const NAMES = ["Mochi", "Pudding", "Bubbel", "Kanelbulle", "Dimma", "Plopp", "Tuss", "Mango"] as const;
/** [en, flera]. Rätt böjning: «1 knapp», «2 knappar». */
const THINGS = [
  ["bär", "bär"], ["kula", "kulor"], ["stjärna", "stjärnor"], ["ägg", "ägg"], ["knapp", "knappar"],
] as const;

function count(n: number, thing: readonly [string, string]): string {
  return `${n} ${n === 1 ? thing[0] : thing[1]}`;
}

type Op = "+" | "−" | "×" | "÷";

interface Fact {
  key: string;
  a: number;
  b: number;
  op: Op;
  answer: number;
  score: number;
}

function calc(a: number, b: number, op: Op): number {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return a / b;
  }
}

/** Fyra svarsalternativ: rätt svar plus vanliga fel. Alla olika, inga negativa. */
export function distractors(rng: () => number, answer: number, near: number[]): number[] {
  const set = new Set<number>([answer]);
  const candidates = shuffle(rng, [...near, answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10]);
  for (const c of candidates) {
    if (set.size >= 4) break;
    if (Number.isInteger(c) && c >= 0 && !set.has(c)) set.add(c);
  }
  let k = 3;
  while (set.size < 4) { if (!set.has(answer + k)) set.add(answer + k); k++; }
  return shuffle(rng, [...set]);
}

function nearMisses(f: Fact): number[] {
  switch (f.op) {
    case "+": return [f.a - f.b, f.answer + 10, f.answer - 10];
    case "−": return [f.a + f.b, f.b - f.a, f.answer + 10];
    case "×": return [f.a + f.b, f.answer + f.a, f.answer - f.a, f.answer + f.b, f.answer - f.b];
    case "÷": return [f.answer + 1, f.answer - 1, f.a - f.b, f.b];
  }
}

function story(rng: () => number, f: Fact): string {
  const name = pick(rng, NAMES);
  const thing = pick(rng, THINGS);
  const many = thing[1];
  switch (f.op) {
    case "+": return `${name} har ${count(f.a, thing)} och hittar ${f.b} till. Hur många ${many} har ${name} nu?`;
    case "−": return `${name} har ${count(f.a, thing)} och ger bort ${f.b}. Hur många ${many} har ${name} kvar?`;
    case "×": return `${f.a} ${f.a === 1 ? "klämmis" : "klämmisar"} har ${count(f.b, thing)} var. Hur många ${many} är det tillsammans?`;
    case "÷": return `${name} delar ${count(f.a, thing)} lika mellan ${f.b} ${f.b === 1 ? "kompis" : "kompisar"}. Hur många får var och en?`;
  }
}

/** Väljer ett faktum nära önskad svårighet, med lite variation så att samma tal inte kommer hela tiden. */
function chooseFact(rng: () => number, facts: Fact[], d: number): Fact {
  const center = Math.round(Math.min(1, Math.max(0, d)) * (facts.length - 1));
  const spread = Math.max(1, Math.round(facts.length * 0.06));
  const i = Math.min(facts.length - 1, Math.max(0, center + int(rng, -spread, spread)));
  return facts[i];
}

function factTemplate(spec: {
  id: string; skillId: string; facts: Fact[]; representations: Representation[];
  hints: (f: Fact, missing: boolean) => [string, string, string];
  /** Uppgiften är alltid "a + ? = svar" (t.ex. tiokamrater). */
  alwaysMissing?: boolean;
  /** Egen text i stället för "a op b = ?" (t.ex. "Dubbelt av 6"). */
  prompt?: (f: Fact) => string;
}): Template {
  const facts = [...spec.facts].sort((x, y) => x.score - y.score || x.key.localeCompare(y.key));
  const byKey = new Map(facts.map((f) => [f.key, f]));
  return {
    id: spec.id,
    version: 1,
    skillId: spec.skillId,
    representations: spec.representations,
    facts: () => facts.map((f) => f.key),
    generate(rng, d, rep, factKey) {
      const f = (factKey && byKey.get(factKey)) || chooseFact(rng, facts, d);
      const difficulty = facts.indexOf(f) / Math.max(1, facts.length - 1);
      const base = { templateId: spec.id, templateVersion: 1, skillId: spec.skillId, representation: rep,
        params: { a: f.a, b: f.b }, difficulty, factKey: f.key };
      if (spec.alwaysMissing) {
        const prompt = `${f.a} ${f.op} ? = ${f.answer}`;
        if (rep === "choice") {
          return { ...base, prompt, input: "choice", answer: f.b, choices: distractors(rng, f.b, [f.b + 1, f.b - 1, f.answer - f.b + 1]) };
        }
        const visual: Question["visual"] = rep === "visual" ? { kind: "tenframe", a: f.a, b: f.b, op: "+" } : undefined;
        return { ...base, prompt, input: "number", answer: f.b, visual };
      }
      if (rep === "missing") {
        // a op ? = svar. För delat blir det ? × b = a, som är samma faktum sett från multiplikationen.
        if (f.op === "÷") {
          return { ...base, prompt: `? × ${f.b} = ${f.a}`, input: "number", answer: f.answer };
        }
        return { ...base, prompt: `${f.a} ${f.op} ? = ${f.answer}`, input: "number", answer: f.b };
      }
      const expr = spec.prompt ? spec.prompt(f) : `${f.a} ${f.op} ${f.b} = ?`;
      if (rep === "choice") {
        return { ...base, prompt: expr, input: "choice", answer: f.answer, choices: distractors(rng, f.answer, nearMisses(f)) };
      }
      if (rep === "story") return { ...base, prompt: story(rng, f), input: "number", answer: f.answer };
      if (rep === "visual") {
        const visual: Question["visual"] =
          f.op === "×" ? { kind: "groups", groups: f.a, per: f.b }
          : f.op === "÷" ? { kind: "share", total: f.a, groups: f.b }
          : { kind: "tenframe", a: f.a, b: f.b, op: f.op as "+" | "−" };
        return { ...base, prompt: expr, input: "number", answer: f.answer, visual };
      }
      return { ...base, prompt: expr, input: "number", answer: f.answer };
    },
    hints(q) {
      const f = byKey.get(q.factKey!)!;
      return spec.hints(f, q.representation === "missing" && !spec.alwaysMissing);
    },
  };
}

// ── Faktalistor ─────────────────────────────────────────────

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function addFacts(filter: (a: number, b: number) => boolean, maxA: number, maxB: number): Fact[] {
  const out: Fact[] = [];
  for (const a of range(1, maxA)) for (const b of range(1, maxB)) {
    if (!filter(a, b)) continue;
    out.push({ key: `${a}+${b}`, a, b, op: "+", answer: a + b, score: a + b + Math.min(a, b) * 0.6 });
  }
  return out;
}

function subFacts(filter: (a: number, b: number) => boolean, maxA: number): Fact[] {
  const out: Fact[] = [];
  for (const a of range(2, maxA)) for (const b of range(1, a - 1)) {
    if (!filter(a, b)) continue;
    out.push({ key: `${a}−${b}`, a, b, op: "−", answer: a - b, score: a + b * 0.8 });
  }
  return out;
}

/** Hur svår en multiplikationstabell brukar vara. 2, 10 och 5 är lättast; 7 och 8 svårast. */
const TABLE_WEIGHT: Record<number, number> = { 1: 0, 2: 1, 10: 1.2, 5: 1.6, 3: 2.5, 4: 2.7, 11: 3, 6: 3.6, 9: 3.8, 7: 4.6, 8: 4.6 };

function mulFacts(tables: number[]): Fact[] {
  const out: Fact[] = [];
  for (const t of tables) for (const b of range(1, 10)) {
    const score = TABLE_WEIGHT[t] * 3 + (TABLE_WEIGHT[b] ?? 2) * 2;
    out.push({ key: `${t}×${b}`, a: t, b, op: "×", answer: t * b, score });
    if (b !== t && !tables.includes(b)) {
      out.push({ key: `${b}×${t}`, a: b, b: t, op: "×", answer: t * b, score: score + 0.5 });
    }
  }
  return out;
}

function divFacts(): Fact[] {
  const out: Fact[] = [];
  for (const d of range(2, 10)) for (const q of range(1, 10)) {
    const score = TABLE_WEIGHT[d] * 3 + (TABLE_WEIGHT[q] ?? 2) * 2;
    out.push({ key: `${d * q}÷${d}`, a: d * q, b: d, op: "÷", answer: q, score });
  }
  return out;
}

// ── Ledtrådar ───────────────────────────────────────────────

function addHints(f: Fact, missing: boolean): [string, string, string] {
  if (missing) {
    return [
      `Vad behöver ${f.a} få till för att bli ${f.answer}? Räkna uppåt från ${f.a}.`,
      `Du kan också räkna baklänges: ${f.answer} − ${f.a} = ?`,
      `${f.answer} − ${f.a} = ${f.b}. Det saknade talet är ${f.b}.`,
    ];
  }
  const big = Math.max(f.a, f.b), small = Math.min(f.a, f.b);
  const toTen = 10 - (big % 10);
  if (big < 10 && big + small > 10) {
    return [
      `Gör en tia först: hur mycket fattas för att ${big} ska bli 10?`,
      `Dela upp ${small} i ${toTen} och ${small - toTen}: ${big} + ${toTen} + ${small - toTen}`,
      `${big} + ${toTen} = 10, och 10 + ${small - toTen} = ${f.answer}. Svaret är ${f.answer}.`,
    ];
  }
  return [
    `Börja på det största talet, ${big}, och räkna uppåt.`,
    `Räkna ${small} steg från ${big}.`,
    `${big} + ${small} = ${f.answer}. Svaret är ${f.answer}.`,
  ];
}

function subHints(f: Fact, missing: boolean): [string, string, string] {
  if (missing) {
    return [
      `Hur mycket ska tas bort från ${f.a} för att det ska bli ${f.answer} kvar?`,
      `Räkna uppåt från ${f.answer} till ${f.a}.`,
      `${f.a} − ${f.answer} = ${f.b}. Det saknade talet är ${f.b}.`,
    ];
  }
  const units = f.a % 10;
  if (f.a > 10 && units < f.b) {
    return [
      `Gå ner till 10 först: ta bort ${units}.`,
      `Ta först bort ${units}, så blir det 10. Hur mycket av ${f.b} är kvar att ta bort?`,
      `${f.a} − ${units} = 10, och 10 − ${f.b - units} = ${f.answer}. Svaret är ${f.answer}.`,
    ];
  }
  return [
    `Börja på ${f.a} och räkna baklänges.`,
    `Räkna ${f.b} steg nedåt från ${f.a}. Eller: vad ska läggas till ${f.b} för att bli ${f.a}?`,
    `${f.a} − ${f.b} = ${f.answer}. Svaret är ${f.answer}.`,
  ];
}

function mulHints(f: Fact, missing: boolean): [string, string, string] {
  const skip = Array.from({ length: Math.max(1, f.a - 1) }, (_, i) => (i + 1) * f.b).slice(0, 6).join(", ");
  if (missing) {
    return [
      `Hur många gånger ${f.a} blir ${f.answer}? Räkna ${f.a}-hopp.`,
      `Du kan dela i stället: ${f.answer} ÷ ${f.a} = ?`,
      `${f.a} × ${f.b} = ${f.answer}. Det saknade talet är ${f.b}.`,
    ];
  }
  return [
    `${f.a} × ${f.b} betyder ${f.a} grupper med ${f.b} i varje.`,
    f.a > 1 ? `Räkna ${f.b}-hopp: ${skip}, … Ett hopp till!` : `En grupp med ${f.b}.`,
    `${f.a} × ${f.b} = ${f.answer}. Svaret är ${f.answer}.`,
  ];
}

function divHints(f: Fact): [string, string, string] {
  return [
    `Dela ${f.a} i ${f.b} lika stora högar. Hur många hamnar i varje?`,
    `Tänk gånger: ${f.b} × ? = ${f.a}`,
    `${f.b} × ${f.answer} = ${f.a}, alltså ${f.a} ÷ ${f.b} = ${f.answer}.`,
  ];
}

const ALL: Representation[] = ["symbol", "missing", "choice", "visual", "story"];

// ── Mallar ──────────────────────────────────────────────────


// ── Åk 4–6: uppställning, flersiffrigt, kort division, rest, avrundning, räkneordning, procent, ekvationer ──

const EXTRA_REPS: Representation[] = ["symbol", "choice", "story"];

/** Det en procedurmall ger för givna tal: texten, facit, vanliga fel och ledtrådarna. */
interface Made { prompt: string; answer: number; near: number[]; hints: [string, string, string]; storyFact?: Fact }

/**
 * Gemensam byggare. `choose` väljer talen (och är den enda som använder slump), `build` räknar ut allt
 * från talen. Ledtrådar byggs om från sparade `params`, så de stämmer även om frågan kommer från lagring.
 */
function procTemplate(
  id: string, skillId: string, representations: Representation[],
  choose: (rng: () => number, d: number) => Record<string, number>,
  build: (p: Record<string, number>) => Made,
): Template {
  return {
    id, version: 1, skillId, representations,
    generate(rng, d, rep) {
      const params = choose(rng, d);
      const m = build(params);
      const base = { templateId: id, templateVersion: 1, skillId, representation: rep, params, difficulty: d, answer: m.answer };
      if (rep === "choice") return { ...base, prompt: m.prompt, input: "choice", choices: distractors(rng, m.answer, m.near) };
      if (rep === "story" && m.storyFact) return { ...base, prompt: story(rng, m.storyFact), input: "number" };
      return { ...base, prompt: m.prompt, input: "number" };
    },
    hints: (q) => build(q.params).hints,
  };
}

const digitsOf = (n: number) => ({ e: n % 10, t: Math.floor(n / 10) % 10 });

/** Plus och minus med uppställning: 3–4 siffror. Svårigheten styr storlek och hur många växlingar det blir. */
function stackedTemplate(op: "+" | "−"): Template {
  const skillId = op === "+" ? "ma.add.uppstallning" : "ma.sub.uppstallning";
  return procTemplate(`${skillId}.v1`, skillId, EXTRA_REPS,
    (rng, d) => {
      let a = 0, b = 0;
      for (let tries = 0; tries < 200; tries++) {
        const top = 300 + Math.round(d * 9400);
        a = int(rng, 120, Math.max(130, top));
        b = int(rng, 101, Math.max(110, Math.min(a - 1, Math.round(top * 0.8))));
        if (op === "+" ? a + b > 9999 : b >= a || a - b < 20) continue;
        if (b % 10 === 0) continue;
        const hasCarry = op === "+" ? (a % 10) + (b % 10) >= 10 : (a % 10) < (b % 10);
        if (d > 0.5 && !hasCarry) continue;
        break;
      }
      if (op === "+" ? a + b > 9999 : b >= a || a - b < 20) { a = 345; b = 128; }
      return { a, b };
    },
    ({ a, b }) => {
      const ans = op === "+" ? a + b : a - b;
      const x = digitsOf(a), y = digitsOf(b);
      const hints: [string, string, string] = op === "+"
        ? [
          "Skriv talen under varandra så att entalen står under entalen. Börja med entalen.",
          `Entalen: ${x.e} + ${y.e} = ${x.e + y.e}${x.e + y.e >= 10 ? ", alltså en tia att ta med" : ""}. Fortsätt sedan med tiotalen och hundratalen.`,
          `${a} + ${b} = ${ans}. Svaret är ${ans}.`,
        ]
        : [
          "Skriv talen under varandra. Börja med entalen. Är det övre entalet för litet måste du växla från tiotalet.",
          x.e < y.e ? `Entalen: ${x.e + 10} − ${y.e} = ${x.e + 10 - y.e} efter att du växlat en tia. Tiotalet ovanför blir en mindre.` : `Entalen: ${x.e} − ${y.e} = ${x.e - y.e}. Ta sedan tiotalen och hundratalen.`,
          `${a} − ${b} = ${ans}. Svaret är ${ans}.`,
        ];
      const near = op === "+" ? [ans - 10, ans + 10, ans - 100, ans + 100] : [ans + 10, ans - 10, ans + 100, ans - 100];
      return { prompt: `${a} ${op} ${b} = ?`, answer: ans, near, hints, storyFact: { key: "", a, b, op, answer: ans, score: 0 } };
    });
}

/** Gånger med flersiffriga tal: tvåsiffrigt × ensiffrigt först, sedan tvåsiffrigt × tvåsiffrigt. */
function bigMulTemplate(): Template {
  return procTemplate("ma.mul.flersiffrigt.v1", "ma.mul.flersiffrigt", EXTRA_REPS,
    (rng, d) => {
      let a = 13, b = 4;
      for (let tries = 0; tries < 100; tries++) {
        if (d < 0.35) { a = int(rng, 12, 12 + Math.round(d * 120)); b = int(rng, 2, 6); }
        else if (d < 0.7) { a = int(rng, 15, 99); b = int(rng, 3, 9); }
        else { a = int(rng, 100, 100 + Math.round(d * 400)); b = rng() < 0.5 ? int(rng, 3, 9) : int(rng, 12, 12 + Math.round(d * 30)); }
        if (a % 10 !== 0 && b % 10 !== 0 && a * b <= 9999) break;
        a = 13; b = 4;
      }
      return { a, b };
    },
    ({ a, b }) => {
      const ans = a * b;
      const bt = Math.floor(b / 10) * 10, be = b % 10;
      const at = a - (a % 10);
      const hints: [string, string, string] = bt === 0
        ? [
          `Dela upp ${a} i tiotal och ental (och hundratal om det finns) och gångra varje del för sig.`,
          `${at} × ${b} = ${at * b} och ${a % 10} × ${b} = ${(a % 10) * b}. Lägg ihop delarna.`,
          `${at * b} + ${(a % 10) * b} = ${ans}. Svaret är ${ans}.`,
        ]
        : [
          `Dela upp ${b} i ${bt} och ${be}, och gångra ${a} med varje del.`,
          `${a} × ${bt} = ${a * bt} och ${a} × ${be} = ${a * be}. Lägg ihop delarna.`,
          `${a * bt} + ${a * be} = ${ans}. Svaret är ${ans}.`,
        ];
      return { prompt: `${a} × ${b} = ?`, answer: ans, near: [(a % 10) * b + at, ans + 10, ans - 10, ans + a, ans - b], hints,
        storyFact: { key: "", a: b, b: a, op: "×", answer: ans, score: 0 } };
    });
}

/** Kort division utan rest: tvåsiffrig eller tresiffrig kvot. */
function shortDivTemplate(): Template {
  return procTemplate("ma.div.kort.v1", "ma.div.kort", EXTRA_REPS,
    (rng, d) => ({ b: int(rng, 2, 3 + Math.round(d * 6)), q: int(rng, 11, 15 + Math.round(d * 150)) }),
    ({ b, q }) => {
      const a = b * q;
      return {
        prompt: `${a} ÷ ${b} = ?`, answer: q, near: [q + 1, q - 1, q + 10, q - 10, a - b],
        hints: [
          `Dela talet i delar som ${b}-tabellen passar. Börja längst till vänster.`,
          `Tänk gånger: ${b} × ? = ${a}. Pröva dig fram med ${b}-tabellen.`,
          `${b} × ${q} = ${a}, så ${a} ÷ ${b} = ${q}. Svaret är ${q}.`,
        ],
        storyFact: { key: "", a, b, op: "÷", answer: q, score: 0 },
      };
    });
}

/** Division med rest. Ibland frågas hur många hela, ibland vad som blir över. */
function remainderTemplate(): Template {
  return procTemplate("ma.div.rest.v1", "ma.div.rest", ["symbol", "choice"],
    (rng, d) => {
      const b = int(rng, 2, 4 + Math.round(d * 5));
      return { b, q: int(rng, 2, 6 + Math.round(d * 10)), r: int(rng, 1, b - 1), askRest: rng() < 0.4 ? 1 : 0 };
    },
    ({ b, q, r, askRest }) => {
      const a = b * q + r;
      const hints: [string, string, string] = askRest
        ? [
          `Hur många hela ${b} ryms i ${a}? Det som blir över är resten.`,
          `${b} × ${q} = ${b * q}. Hur mycket fattas upp till ${a}?`,
          `${a} − ${b * q} = ${r}. Resten är ${r}.`,
        ]
        : [
          `Vilket tal i ${b}-tabellen ligger närmast under ${a}, utan att passera?`,
          `Resten är ${r}, så ${a - r} är exakt ${b} gånger något. Vad?`,
          `${b} × ${q} = ${a - r} och ${a - r} + ${r} = ${a}. Svaret är ${q}.`,
        ];
      return {
        prompt: askRest ? `${a} ÷ ${b} = ${q} rest ?` : `${a} ÷ ${b} = ? rest ${r}`,
        answer: askRest ? r : q,
        near: askRest ? [q, r + 1, r - 1, b - 1] : [r, q + 1, q - 1, Math.floor(a / 2)],
        hints,
      };
    });
}

/** Avrunda till tiotal, hundratal eller tusental. 5 och uppåt avrundas uppåt. */
function roundingTemplate(): Template {
  return procTemplate("ma.tal.avrunda.v1", "ma.tal.avrunda", ["symbol", "choice"],
    (rng, d) => {
      const unit = d < 0.4 ? 10 : d < 0.75 ? 100 : 1000;
      const lo = unit === 10 ? 12 : unit === 100 ? 120 : 1200;
      const hi = unit === 10 ? 20 + Math.round(d * 180) : unit === 100 ? 300 + Math.round(d * 900) : 3000 + Math.round(d * 6900);
      let n = int(rng, lo, Math.max(lo + 10, hi));
      while (n % unit === 0) n++;
      return { n, unit };
    },
    ({ n, unit }) => {
      const ans = Math.round(n / unit) * unit;
      const name = unit === 10 ? "tiotal" : unit === 100 ? "hundratal" : "tusental";
      const lookAt = unit === 10 ? "entalssiffran" : unit === 100 ? "tiotalssiffran" : "hundratalssiffran";
      const digit = Math.floor((n % unit) / (unit / 10));
      return {
        prompt: `Avrunda ${n} till närmaste ${name}`, answer: ans,
        near: [ans - unit, ans + unit, n - (n % unit), n - (n % unit) + unit],
        hints: [
          `Titta på ${lookAt} i ${n}: den bestämmer om du går upp eller ner.`,
          `Är siffran ${digit} fem eller mer går du upp till nästa ${name}, annars stannar du.`,
          `${n} avrundas till ${ans}. Svaret är ${ans}.`,
        ],
      };
    });
}

/** Räkneordning: gånger före plus och minus, parenteser först av allt. */
function precedenceTemplate(): Template {
  return procTemplate("ma.alg.prioritering.v1", "ma.alg.prioritering", ["symbol", "choice"],
    (rng, d) => {
      const form = d < 0.4 ? 0 : d < 0.7 ? pick(rng, [0, 1, 2]) : pick(rng, [1, 2, 3]);
      const big = 3 + Math.round(d * 7);
      const a = int(rng, 2, 4 + Math.round(d * 20)), b = int(rng, 2, big), c = int(rng, 2, big);
      // form 2: a × b − s (s mindre än a × b). form 3: t − b × c (t större än b × c).
      const s = int(rng, 1, Math.max(1, a * b - 1));
      let t = b * c + int(rng, 1, 9 + a);
      if (t - b * c === b * c) t++;
      return { form, a, b, c, s, t };
    },
    ({ form, a, b, c, s, t }) => {
      let prompt: string, ans: number, step: string;
      if (form === 0) { prompt = `${a} + ${b} × ${c} = ?`; ans = a + b * c; step = `${b} × ${c} = ${b * c}`; }
      else if (form === 1) { prompt = `(${a} + ${b}) × ${c} = ?`; ans = (a + b) * c; step = `(${a} + ${b}) = ${a + b}`; }
      else if (form === 2) { prompt = `${a} × ${b} − ${s} = ?`; ans = a * b - s; step = `${a} × ${b} = ${a * b}`; }
      else { prompt = `${t} − ${b} × ${c} = ?`; ans = t - b * c; step = `${b} × ${c} = ${b * c}`; }
      return {
        prompt, answer: ans, near: [ans + 1, ans - 1, ans + a, a + b + c, a * b + c],
        hints: [
          "Parenteser räknas först. Sedan gånger och delat. Plus och minus kommer sist.",
          `Börja med ${step}. Räkna sedan vidare med resten av uttrycket.`,
          `${prompt.replace("?", String(ans))}. Svaret är ${ans}.`,
        ],
      };
    });
}

/** Procent av ett tal. De vanliga procenten är bråk i förklädnad: 50 % är hälften, 25 % en fjärdedel. */
const PERCENTS: [number, number, number][] = [[50, 2, 1], [10, 10, 1], [25, 4, 1], [20, 5, 1], [75, 4, 3], [5, 20, 1], [30, 10, 3], [40, 10, 4], [60, 10, 6]];
function percentTemplate(): Template {
  return procTemplate("ma.tal.procent.v1", "ma.tal.procent", ["symbol", "choice"],
    (rng, d) => {
      const i = pick(rng, d < 0.3 ? [0, 1, 2] : d < 0.6 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6, 7, 8]);
      const [, div, mult] = PERCENTS[i];
      let unit = int(rng, 2, 4 + Math.round(d * 17));
      if (unit * mult === div) unit++;
      return { i, unit };
    },
    ({ i, unit }) => {
      const [p, div, mult] = PERCENTS[i];
      const base = div * unit, ans = unit * mult;
      return {
        prompt: `${p} % av ${base} = ?`, answer: ans, near: [unit, base - ans, ans + unit, ans * 2],
        hints: [
          p === 5 || (p % 10 === 0 && p !== 50) ? "Börja med en tiondel (tio procent) och bygg vidare." : "Procent är bråk i förklädnad: femtio procent är hälften, tjugofem procent en fjärdedel.",
          `Dela ${base} med ${div}${mult > 1 ? ` och gångra sedan med ${mult}` : ""}.`,
          `${base} ÷ ${div} = ${unit}${mult > 1 ? ` och ${unit} × ${mult} = ${ans}` : ""}. Svaret är ${ans}.`,
        ],
      };
    });
}

/** Enkla ekvationer: x + a = c, x − a = c, a × x = c och a × x + b = c. Svaret är x. */
function equationTemplate(): Template {
  return procTemplate("ma.alg.ekvation.v1", "ma.alg.ekvation", ["symbol", "choice"],
    (rng, d) => {
      const form = d < 0.3 ? pick(rng, [0, 1]) : d < 0.65 ? pick(rng, [0, 1, 2]) : pick(rng, [2, 3]);
      return { form, x: int(rng, 3, 7 + Math.round(d * 20)), a: int(rng, 2, 4 + Math.round(d * 6)), b: int(rng, 1, 5 + Math.round(d * 20)) };
    },
    ({ form, x, a, b }) => {
      let prompt: string, h1: string, h2: string;
      if (form === 0) { prompt = `x + ${b} = ${x + b}, x = ?`; h1 = `Det som händer med x ska göras ogjort: plus ${b} ångras med minus ${b}.`; h2 = `x = ${x + b} − ${b}`; }
      else if (form === 1) { prompt = `x − ${b} = ${x - b}, x = ?`; h1 = `Minus ${b} ångras med plus ${b}.`; h2 = `x = ${x - b} + ${b}`; }
      else if (form === 2) { prompt = `${a} × x = ${a * x}, x = ?`; h1 = `${a} × x betyder ${a} stycken x. Gör tvärtom: dela.`; h2 = `x = ${a * x} ÷ ${a}`; }
      else { prompt = `${a} × x + ${b} = ${a * x + b}, x = ?`; h1 = `Ångra i omvänd ordning: plus ${b} kommer sist, så ta bort ${b} först.`; h2 = `${a} × x = ${a * x}. Dela sedan med ${a}.`; }
      return { prompt, answer: x, near: [x + 1, x - 1, x + b, a], hints: [h1, h2, `x = ${x}. Svaret är ${x}.`] };
    });
}

export const mathTemplates: Template[] = [
  factTemplate({ id: "ma.add.inom10.v1", skillId: "ma.add.inom10", representations: ALL,
    facts: addFacts((a, b) => a + b <= 10, 9, 9), hints: addHints }),
  factTemplate({ id: "ma.sub.inom10.v1", skillId: "ma.sub.inom10", representations: ALL,
    facts: subFacts(() => true, 10), hints: subHints }),
  factTemplate({ id: "ma.tal.tiokamrater.v1", skillId: "ma.tal.tiokamrater", representations: ["missing", "choice", "visual"],
    alwaysMissing: true,
    facts: range(1, 9).map((a) => ({ key: `${a}+?=10`, a, b: 10 - a, op: "+" as Op, answer: 10, score: 5 - Math.abs(5 - a) })),
    hints: (f) => [
      `Tänk på tiorutan: ${f.a} rutor är fyllda. Hur många är tomma?`,
      `Räkna från ${f.a} upp till 10.`,
      `${f.a} + ${f.b} = 10. Tiokamraten är ${f.b}.`,
    ] }),
  factTemplate({ id: "ma.add.inom20_utan.v1", skillId: "ma.add.inom20_utan", representations: ALL,
    facts: addFacts((a, b) => a + b > 10 && a + b <= 19 && (a % 10) + b < 10 && a >= 10, 18, 9), hints: addHints }),
  factTemplate({ id: "ma.add.inom20_med.v1", skillId: "ma.add.inom20_med", representations: ALL,
    facts: addFacts((a, b) => a >= 2 && b >= 2 && a + b > 10, 9, 9), hints: addHints }),
  factTemplate({ id: "ma.sub.inom20_utan.v1", skillId: "ma.sub.inom20_utan", representations: ALL,
    facts: subFacts((a, b) => a > 10 && b < 10 && a % 10 >= b, 19), hints: subHints }),
  factTemplate({ id: "ma.sub.inom20_med.v1", skillId: "ma.sub.inom20_med", representations: ALL,
    facts: subFacts((a, b) => a > 10 && a < 19 && b >= 2 && b <= 9 && a % 10 < b, 18), hints: subHints }),
  factTemplate({ id: "ma.samb.dubbelt_halften.v1", skillId: "ma.samb.dubbelt_halften", representations: ["symbol", "choice", "story"],
    prompt: (f) => (f.op === "+" ? `Dubbelt så mycket som ${f.a} = ?` : `Hälften av ${f.a} = ?`),
    facts: [
      ...range(1, 10).map((a) => ({ key: `dubbelt ${a}`, a, b: a, op: "+" as Op, answer: 2 * a, score: a })),
      ...range(1, 10).map((a) => ({ key: `hälften ${2 * a}`, a: 2 * a, b: 2, op: "÷" as Op, answer: a, score: a + 2 })),
    ],
    hints: (f) => f.op === "+"
      ? [`Dubbelt betyder lika mycket en gång till.`, `${f.a} + ${f.a} = ?`, `${f.a} + ${f.a} = ${f.answer}. Dubbelt så mycket som ${f.a} är ${f.answer}.`]
      : [`Hälften betyder att dela i två lika delar.`, `Vilket tal + samma tal blir ${f.a}?`, `${f.answer} + ${f.answer} = ${f.a}. Hälften av ${f.a} är ${f.answer}.`] }),
  factTemplate({ id: "ma.mul.tabell_2_5_10.v1", skillId: "ma.mul.tabell_2_5_10", representations: ALL,
    facts: mulFacts([2, 5, 10]), hints: mulHints }),
  factTemplate({ id: "ma.mul.tabell_3_4.v1", skillId: "ma.mul.tabell_3_4", representations: ALL,
    facts: mulFacts([3, 4]), hints: mulHints }),
  factTemplate({ id: "ma.mul.tabell_6_9.v1", skillId: "ma.mul.tabell_6_9", representations: ALL,
    facts: mulFacts([6, 7, 8, 9]), hints: mulHints }),
  factTemplate({ id: "ma.div.tabell.v1", skillId: "ma.div.tabell", representations: ["symbol", "missing", "choice", "visual", "story"],
    facts: divFacts(), hints: (f) => divHints(f) }),
  factTemplate({ id: "ma.mul.grupper.v1", skillId: "ma.mul.grupper", representations: ["visual", "story", "choice"],
    facts: [2, 3, 4, 5].flatMap((g) => [2, 3, 4, 5].map((p) => ({ key: `${g}×${p}`, a: g, b: p, op: "×" as Op, answer: g * p, score: g * p }))),
    hints: mulHints }),
  factTemplate({ id: "ma.div.likadelning.v1", skillId: "ma.div.likadelning", representations: ["visual", "story", "choice"],
    facts: [2, 3, 4, 5].flatMap((g) => [1, 2, 3, 4, 5].map((q) => ({ key: `${g * q}÷${g}`, a: g * q, b: g, op: "÷" as Op, answer: q, score: g * q }))),
    hints: (f) => divHints(f) }),
  twoDigitTemplate("+"),
  twoDigitTemplate("−"),
  missingNumberTemplate(),
  compareTemplate(),
  stackedTemplate("+"),
  stackedTemplate("−"),
  bigMulTemplate(),
  shortDivTemplate(),
  remainderTemplate(),
  roundingTemplate(),
  precedenceTemplate(),
  percentTemplate(),
  equationTemplate(),
  countTemplate(),
  orderTemplate(),
];

/** Räkna prickar upp till 10. Lätt: få prickar i en tioruta. Svårare: fler, och utspridda. */
function countTemplate(): Template {
  const id = "ma.tal.antal10.v1", skillId = "ma.tal.antal10";
  return {
    id, version: 1, skillId, representations: ["visual", "choice"],
    generate(rng, d, rep) {
      const n = Math.min(10, Math.max(1, int(rng, 1 + Math.round(d * 5), 4 + Math.round(d * 6))));
      const layout: "frame" | "scatter" = d > 0.45 && rng() < 0.7 ? "scatter" : "frame";
      const seed = int(rng, 1, 1_000_000);
      const base = { templateId: id, templateVersion: 1, skillId, representation: rep, difficulty: d,
        params: { n, scatter: layout === "scatter" ? 1 : 0, seed }, answer: n,
        prompt: "Hur många prickar?", visual: { kind: "count", n, layout, seed } as Question["visual"] };
      if (rep === "choice") return { ...base, input: "choice", choices: distractors(rng, n, [n + 1, n - 1, n + 2]) };
      return { ...base, input: "number" };
    },
    hints(q) {
      const scatter = q.params.scatter === 1;
      return [
        "Peka på en prick i taget och räkna högt.",
        scatter ? "Räkna två i taget, och håll koll på vilka du redan räknat." : "Räkna den övre raden först och fortsätt sedan på den undre.",
        `Det är ${q.answer} prickar.`,
      ];
    },
  };
}

/** Talens ordning upp till 20: talet efter, talet före, talet mellan och talet som saknas i en följd. */
function orderTemplate(): Template {
  const id = "ma.tal.ordning20.v1", skillId = "ma.tal.ordning20";
  const KINDS = ["after", "before", "between", "sequence"] as const;
  return {
    id, version: 1, skillId, representations: ["symbol", "choice", "visual"],
    generate(rng, d, rep) {
      const max = d < 0.4 ? 10 : 20;
      const pool = d < 0.3 ? [0] : d < 0.6 ? [0, 1] : [1, 2, 3];
      const k = KINDS[pick(rng, pool)];
      const n = int(rng, 1, max - 1);
      let prompt: string, answer: number;
      if (k === "after") { prompt = `Vilket tal kommer efter ${n}?`; answer = n + 1; }
      else if (k === "before") { prompt = `Vilket tal kommer före ${n}?`; answer = n - 1; }
      else if (k === "between") { prompt = `Vilket tal ligger mellan ${n - 1} och ${n + 1}?`; answer = n; }
      else {
        const start = Math.max(0, Math.min(max - 4, n - 2));
        const hole = start + int(rng, 1, 2);
        const seq = [0, 1, 2, 3].map((i) => (start + i === hole ? "?" : String(start + i)));
        prompt = `Vilket tal saknas? ${seq.join(", ")}`; answer = hole;
      }
      const from = Math.max(0, answer - 3), to = from + 6;
      const base = { templateId: id, templateVersion: 1, skillId, representation: rep, difficulty: d,
        params: { n, kind: KINDS.indexOf(k) }, prompt, answer };
      if (rep === "choice") return { ...base, input: "choice", choices: distractors(rng, answer, [answer + 1, answer - 1, answer + 2]) };
      if (rep === "visual") return { ...base, input: "number", visual: { kind: "numberline", from, to, hidden: answer } };
      return { ...base, input: "number" };
    },
    hints(q) {
      const k = KINDS[q.params.kind];
      const first = k === "after" ? "Räkna uppåt ett steg." : k === "before" ? "Räkna bakåt ett steg."
        : k === "between" ? "Talet i mitten är ett mer än det första talet." : "Talen ökar med ett i taget.";
      return [
        first,
        k === "before" ? "På tallinjen ligger talet före ett steg till vänster." : "På tallinjen ligger nästa tal ett steg till höger.",
        `Svaret är ${q.answer}.`,
      ];
    },
  };
}

/** Addition och subtraktion med tvåsiffriga tal. Svårigheten styr storlek och om det blir växling. */
function twoDigitTemplate(op: "+" | "−"): Template {
  const skillId = op === "+" ? "ma.add.tvasiffrigt" : "ma.sub.tvasiffrigt";
  const id = `${skillId}.v1`;
  return {
    id, version: 1, skillId, representations: ["symbol", "choice", "story"],
    generate(rng, d, rep) {
      const carry = rng() < Math.min(0.9, d * 1.2);
      let a = 0, b = 0;
      for (let tries = 0; tries < 200; tries++) {
        a = int(rng, 12, 40 + Math.round(d * 59));
        b = int(rng, 11, Math.max(12, Math.min(a - 1, 20 + Math.round(d * 79))));
        if (op === "+" && a + b > 100) continue;
        if (op === "−" && b >= a) continue;
        const hasCarry = op === "+" ? (a % 10) + (b % 10) >= 10 : (a % 10) < (b % 10);
        const ans = op === "+" ? a + b : a - b;
        // Ledtrådarna visar talens tiotal och ental. Inget av dem får råka vara svaret.
        const parts = [Math.floor(a / 10) * 10, a % 10, Math.floor(b / 10) * 10, b % 10, a - Math.floor(b / 10) * 10];
        if (b % 10 === 0 || parts.includes(ans) || (op === "−" && ans < 5)) continue;
        if (hasCarry === carry) break;
      }
      const answer = op === "+" ? a + b : a - b;
      const base = { templateId: id, templateVersion: 1, skillId, representation: rep, params: { a, b }, difficulty: d, answer };
      const expr = `${a} ${op} ${b} = ?`;
      if (rep === "choice") {
        const near = op === "+" ? [answer - 10, answer + 10, a - b] : [answer + 10, answer - 10, a + b];
        return { ...base, prompt: expr, input: "choice", choices: distractors(rng, answer, near) };
      }
      if (rep === "story") {
        const f: Fact = { key: "", a, b, op, answer, score: 0 };
        return { ...base, prompt: story(rng, f), input: "number" };
      }
      return { ...base, prompt: expr, input: "number" };
    },
    hints(q) {
      const { a, b } = q.params;
      const at = Math.floor(a / 10) * 10, ae = a % 10, bt = Math.floor(b / 10) * 10, be = b % 10;
      if (op === "+") {
        return [
          `Ta tiotalen för sig och entalen för sig.`,
          `Tiotal: ${at} + ${bt}. Ental: ${ae} + ${be}. Lägg sedan ihop.`,
          `${at} + ${bt} = ${at + bt}, ${ae} + ${be} = ${ae + be}, och ${at + bt} + ${ae + be} = ${q.answer}.`,
        ];
      }
      return [
        `Ta bort tiotalen först, sedan entalen.`,
        `${a} − ${bt} = ${a - bt}. Ta sedan bort ${be}.`,
        `${a} − ${bt} = ${a - bt}, och ${a - bt} − ${be} = ${q.answer}. Svaret är ${q.answer}.`,
      ];
    },
  };
}

/** Hitta det saknade talet: a + ? = c, a − ? = c, a × ? = c. Bygger förståelse för likhetstecknet. */
function missingNumberTemplate(): Template {
  const id = "ma.alg.saknat_tal.v1";
  return {
    id, version: 1, skillId: "ma.alg.saknat_tal", representations: ["missing", "choice"],
    generate(rng, d, rep) {
      const ops: Op[] = d < 0.35 ? ["+"] : d < 0.7 ? ["+", "−"] : ["+", "−", "×"];
      const op = pick(rng, ops);
      let a: number, b: number;
      if (op === "×") { a = int(rng, 2, 9); b = int(rng, 2, 9); }
      else if (op === "+") { a = int(rng, 2, 10 + Math.round(d * 30)); b = int(rng, 1, 9 + Math.round(d * 20)); }
      else { b = int(rng, 1, 9 + Math.round(d * 10)); a = b + int(rng, 1, 10 + Math.round(d * 20)); }
      const c = calc(a, b, op);
      const leftMissing = d > 0.5 && rng() < 0.4;
      const prompt = leftMissing ? `? ${op} ${b} = ${c}` : `${a} ${op} ? = ${c}`;
      const answer = leftMissing ? a : b;
      const base = { templateId: id, templateVersion: 1, skillId: "ma.alg.saknat_tal", representation: rep,
        params: { a, b, c, op: ["+", "−", "×"].indexOf(op), left: leftMissing ? 1 : 0 }, difficulty: d, prompt, answer };
      if (rep === "choice") return { ...base, input: "choice", choices: distractors(rng, answer, [c, c + b, Math.abs(c - a)]) };
      return { ...base, input: "number" };
    },
    hints(q) {
      const { a, b, c, op, left } = q.params;
      const sym = ["+", "−", "×"][op];
      const inverse = sym === "+" ? (left ? `${c} − ${b}` : `${c} − ${a}`)
        : sym === "−" ? (left ? `${c} + ${b}` : `${a} − ${c}`)
        : (left ? `${c} ÷ ${b}` : `${c} ÷ ${a}`);
      return [
        `Båda sidor om = ska vara lika mycket värda. Vad ska stå i rutan?`,
        `Använd det omvända räknesättet: ${inverse} = ?`,
        `${inverse} = ${q.answer}. Det saknade talet är ${q.answer}.`,
      ];
    },
  };
}

/** Vilket tal är störst? Svårigheten styr talens storlek och hur lika de är. */
function compareTemplate(): Template {
  const id = "ma.tal.jamfora.v1";
  return {
    id, version: 1, skillId: "ma.tal.jamfora", representations: ["choice"],
    generate(rng, d, rep) {
      const max = d < 0.3 ? 20 : d < 0.7 ? 100 : 1000;
      const n = d < 0.5 ? 2 : 3;
      const set = new Set<number>();
      const first = int(rng, Math.round(max / 10), max);
      set.add(first);
      while (set.size < n) {
        // Svårare: talen ligger närmare varandra och har samma siffror i olika ordning.
        const close = d > 0.5 && rng() < 0.6;
        const swapped = Number(String(first).split("").reverse().join(""));
        const cand = close && swapped !== first && swapped > 0 ? swapped : int(rng, 1, max);
        set.add(cand);
      }
      const nums = shuffle(rng, [...set]);
      const answer = Math.max(...nums);
      return { templateId: id, templateVersion: 1, skillId: "ma.tal.jamfora", representation: rep,
        params: Object.fromEntries(nums.map((x, i) => [`n${i}`, x])), difficulty: d,
        prompt: "Vilket tal är störst?", input: "choice", choices: nums, answer };
    },
    hints(q) {
      const nums = Object.values(q.params);
      const digits = Math.max(...nums.map((x) => String(x).length));
      return [
        `Titta först på hur många siffror talen har. Fler siffror betyder ett större tal.`,
        digits > 1 ? `Har de lika många siffror? Jämför den första siffran, sedan nästa.` : `Tänk på tallinjen: talet längst till höger är störst.`,
        `${q.answer} är störst.`,
      ];
    },
  };
}

export function templatesForSkill(skillId: string): Template[] {
  return mathTemplates.filter((t) => t.skillId === skillId);
}

export const MATH_SKILLS_WITH_TEMPLATES = [...new Set(mathTemplates.map((t) => t.skillId))];
