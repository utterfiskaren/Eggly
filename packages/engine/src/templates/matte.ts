import type { Question, Representation, Template } from "../question";
import { int, pick, shuffle } from "../rng";
import { fmt } from "../fmt";

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

/** Antal decimaler i ett tal (högst 3). */
function decimalsOf(n: number): number {
  for (let d = 0; d < 3; d++) if (Math.abs(n * 10 ** d - Math.round(n * 10 ** d)) < 1e-9) return d;
  return 3;
}

/**
 * Fyra svarsalternativ: rätt svar plus vanliga fel. Alla olika. Inga negativa om inte svaret (eller
 * `allowNeg`) är negativt, och lika många decimaler som svaret.
 */
export function distractors(rng: () => number, answer: number, near: number[], allowNeg = false): number[] {
  const dec = decimalsOf(answer);
  const step = 10 ** -dec;
  const scale = 10 ** dec;
  const r = (x: number) => Math.round(x * scale) / scale;
  const neg = allowNeg || answer < 0;
  const ok = (c: number) => Number.isFinite(c) && Math.abs(c - r(c)) < 1e-9 && (neg || c >= 0);
  const key = (x: number) => Math.round(x * 1e6);
  const set = new Map<number, number>([[key(answer), answer]]);
  const candidates = shuffle(rng, [...near, answer + step, answer - step, answer + 2 * step, answer - 2 * step, answer + 10 * step, answer - 10 * step].map(r));
  for (const c of candidates) {
    if (set.size >= 4) break;
    if (ok(c) && !set.has(key(c))) set.set(key(c), c);
  }
  let k = 3;
  while (set.size < 4) { const c = r(answer + k * step); if (!set.has(key(c))) set.set(key(c), c); k++; }
  return shuffle(rng, [...set.values()]);
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
  keys?: Template["keys"],
): Template {
  return {
    id, version: 1, skillId, representations, keys,
    generate(rng, d, rep) {
      const params = choose(rng, d);
      const m = build(params);
      const base = { templateId: id, templateVersion: 1, skillId, representation: rep, params, difficulty: d, answer: m.answer };
      if (rep === "choice") return { ...base, prompt: m.prompt, input: "choice", choices: distractors(rng, m.answer, m.near, keys === "neg" || keys === "both") };
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


// ── Åk 4–6, del 2: decimaltal, negativa tal och bråk ──

/** Plus och minus med decimaltal. Tal i tiondelar, och i hundradelar när svårigheten är hög. */
function decimalTemplate(): Template {
  return procTemplate("ma.tal.decimal.v1", "ma.tal.decimal", ["symbol", "choice"],
    (rng, d) => {
      const hundredths = d >= 0.6 ? 1 : 0;
      const sc = hundredths ? 100 : 10;
      const hi = Math.round(sc * (4 + d * 12));
      let x = int(rng, sc + 2, hi), y = int(rng, sc / 10 + 1, Math.max(sc / 10 + 2, Math.round(hi * 0.8)));
      const minus = rng() < 0.5 ? 1 : 0;
      for (let i = 0; i < 50 && (x % 10 === 0 || y % 10 === 0 || (minus && y >= x)); i++) {
        x = int(rng, sc + 2, hi); y = int(rng, sc / 10 + 1, Math.max(sc / 10 + 2, Math.round(hi * 0.8)));
      }
      if (x % 10 === 0 || y % 10 === 0 || (minus && y >= x)) { x = 37; y = 14; }
      return { x, y, minus, sc };
    },
    ({ x, y, minus, sc }) => {
      const a = x / sc, b = y / sc;
      const ans = (minus ? x - y : x + y) / sc;
      const unit = sc === 10 ? "tiondelar" : "hundradelar";
      return {
        prompt: `${fmt(a)} ${minus ? "−" : "+"} ${fmt(b)} = ?`, answer: ans,
        near: [ans + 1 / sc, ans - 1 / sc, ans + 1, ans - 1, (minus ? x + y : x + y) / sc / 10],
        hints: [
          "Ställ upp talen med kommatecken under kommatecken. Räkna som vanliga tal och behåll kommat på samma ställe.",
          `Tänk ${unit}: ${x} ${unit} ${minus ? "minus" : "plus"} ${y} ${unit}. Gör om till kommatal efteråt.`,
          `${fmt(a)} ${minus ? "−" : "+"} ${fmt(b)} = ${fmt(ans)}. Svaret är ${fmt(ans)}.`,
        ],
      };
    }, "dec");
}

/** Gånger och delat med decimaltal: 1,5 × 4, 0,6 × 10, 7,2 ÷ 4. */
function decimalMulTemplate(): Template {
  return procTemplate("ma.mul.decimal.v1", "ma.mul.decimal", ["symbol", "choice"],
    (rng, d) => {
      const div = rng() < 0.3 ? 1 : 0;
      const b = div ? int(rng, 2, 9) : rng() < 0.2 ? 10 : int(rng, 2, 3 + Math.round(d * 6));
      let q = int(rng, 2, 8 + Math.round(d * 40));
      let x = div ? b * q : int(rng, 2, 9 + Math.round(d * 40));
      for (let i = 0; i < 60 && x % 10 === 0; i++) {
        if (div) { q++; x = b * q; } else x++;
      }
      return { x, b, div };
    },
    ({ x, b, div }) => {
      const a = x / 10;
      const ans = div ? x / b / 10 : (x * b) / 10;
      return {
        prompt: `${fmt(a)} ${div ? "÷" : "×"} ${b} = ?`, answer: ans,
        near: div ? [ans * 10, ans + 0.1, ans - 0.1, ans / 10] : [ans * 10, ans / 10, ans + 0.1, ans - 0.1, ans + 1],
        hints: !div && b === 10 ? [
          "Gånger tio gör varje siffra tio gånger mer värd.",
          "Kommatecknet flyttar ett steg åt höger. Fyll på med noll om det behövs.",
          `${fmt(a)} × 10 = ${fmt(ans)}. Svaret är ${fmt(ans)}.`,
        ] : [
          div ? "Dela som om det vore ett vanligt tal. Sätt ut kommatecknet på samma ställe." : "Gångra som om kommatecknet inte fanns. Räkna sedan ut hur många decimaler svaret ska ha.",
          div ? `${x} ÷ ${b} = ${x / b}. Hur många decimaler har ${fmt(a)}?` : `${x} × ${b} = ${x * b}. ${fmt(a)} har en decimal, så svaret får också en.`,
          `${fmt(a)} ${div ? "÷" : "×"} ${b} = ${fmt(ans)}. Svaret är ${fmt(ans)}.`,
        ],
      };
    }, "dec");
}

/** Negativa tal på tallinjen: 4 − 9, −3 + 8, −2 − 5. */
function negativeTemplate(): Template {
  return procTemplate("ma.tal.negativa.v1", "ma.tal.negativa", ["symbol", "choice"],
    (rng, d) => {
      const form = d < 0.35 ? 0 : pick(rng, [0, 1, 2]);
      const hi = 6 + Math.round(d * 14);
      let a = int(rng, 1, hi), b = int(rng, 1, hi);
      for (let i = 0; i < 30; i++) {
        const v = form === 0 ? a - b : form === 1 ? -a + b : -a - b;
        if (v !== 0) break;
        b = int(rng, 1, hi);
      }
      if ((form === 0 ? a - b : form === 1 ? -a + b : -a - b) === 0) b = a + 1;
      return { form, a, b };
    },
    ({ form, a, b }) => {
      const ans = form === 0 ? a - b : form === 1 ? -a + b : -a - b;
      const prompt = form === 0 ? `${a} − ${b} = ?` : form === 1 ? `−${a} + ${b} = ?` : `−${a} − ${b} = ?`;
      return {
        prompt, answer: ans, near: [-ans, a + b, -(a + b), ans + 1, ans - 1, b - a],
        hints: [
          "Tänk dig en tallinje. Plus går åt höger och minus åt vänster. Under noll är talen negativa.",
          form === 0 ? `Du startar på ${a} och går ${b} steg åt vänster. Passerar du noll?`
            : form === 1 ? `Du startar på −${a} (under noll) och går ${b} steg åt höger.`
            : `Du startar på −${a} (under noll) och går ${b} steg till åt vänster.`,
          `${prompt.replace("?", fmt(ans))}. Svaret är ${fmt(ans)}.`,
        ],
      };
    }, "neg");
}

/** Bråk av ett antal: 3/4 av 20. */
const PARTS: [number, number][] = [[1, 2], [1, 4], [1, 3], [1, 5], [1, 10], [3, 4], [2, 3], [2, 5], [3, 10]];
function fractionOfTemplate(): Template {
  return procTemplate("ma.tal.brak_del.v1", "ma.tal.brak_del", ["symbol", "choice", "story"],
    (rng, d) => {
      const i = pick(rng, d < 0.3 ? [0, 1, 2] : d < 0.65 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8]);
      let unit = int(rng, 2, 4 + Math.round(d * 12));
      if (unit * PARTS[i][0] === PARTS[i][1]) unit++;
      return { i, unit };
    },
    ({ i, unit }) => {
      const [n, dd] = PARTS[i];
      const total = dd * unit, ans = n * unit;
      return {
        prompt: `${n}/${dd} av ${total} = ?`, answer: ans, near: [unit, total - ans, ans + unit, total / 2],
        hints: [
          `Nämnaren ${dd} säger i hur många lika delar helheten delas. Täljaren säger hur många delar du tar.`,
          `Dela först ${total} i ${dd} lika delar${n > 1 ? `, och ta sedan ${n} av delarna` : ""}.`,
          `${total} ÷ ${dd} = ${unit}${n > 1 ? ` och ${unit} × ${n} = ${ans}` : ""}. Svaret är ${ans}.`,
        ],
        storyFact: undefined,
      };
    });
}

/** Likvärdiga bråk: 1/2 = ?/8 eller 2/3 = 6/?. */
function equivalentFractionTemplate(): Template {
  return procTemplate("ma.tal.brak_likvardiga.v1", "ma.tal.brak_likvardiga", ["symbol", "choice"],
    (rng, d) => {
      const dd = int(rng, 2, 5 + Math.round(d * 5));
      const n = int(rng, 1, dd - 1);
      return { n, dd, k: int(rng, 2, 3 + Math.round(d * 5)), askBottom: rng() < 0.4 ? 1 : 0 };
    },
    ({ n, dd, k, askBottom }) => {
      const ans = askBottom ? dd * k : n * k;
      return {
        prompt: askBottom ? `${n}/${dd} = ${n * k}/?` : `${n}/${dd} = ?/${dd * k}`, answer: ans,
        near: [askBottom ? n * k + dd : n + k, ans + 1, ans - 1, askBottom ? dd + k : dd * k],
        hints: [
          "Ett bråk blir lika mycket värt om du gångrar täljare och nämnare med samma tal.",
          askBottom ? `Täljaren blev ${n * k} från ${n}. Gångra nämnaren ${dd} med samma tal.` : `Nämnaren blev ${dd * k} från ${dd}. Gångra täljaren ${n} med samma tal.`,
          `Båda gångras med ${k}: ${n}/${dd} = ${n * k}/${dd * k}. Svaret är ${ans}.`,
        ],
      };
    });
}

// ── Åk 3–6, del 3: mått, tid, pengar, statistik, proportion och berättelser i flera steg ──

const REPS2: Representation[] = ["symbol", "choice"];

/** Omkrets: rektangel, kvadrat, och baklänges (omkretsen är given, hitta bredden). */
function perimeterTemplate(): Template {
  return procTemplate("ma.geo.omkrets.v1", "ma.geo.omkrets", REPS2,
    (rng, d) => {
      const form = d < 0.3 ? pick(rng, [0, 1]) : d < 0.65 ? pick(rng, [0, 1, 0]) : pick(rng, [0, 1, 2]);
      const hi = 5 + Math.round(d * 25);
      return { form, a: int(rng, 3, hi), b: int(rng, 2, Math.max(3, hi - 1)) };
    },
    ({ form, a, b }) => {
      if (form === 1) {
        const ans = 4 * a;
        return { prompt: `En kvadrat har sidan ${a} cm. Hur lång är omkretsen i cm?`, answer: ans, near: [2 * a, a * a, ans + a, ans - a],
          hints: ["Omkretsen är hela sträckan runt figuren. En kvadrat har fyra lika långa sidor.", `Lägg ihop alla fyra sidor, eller tänk ${a} gånger något.`, `4 × ${a} = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 2) {
        const p = 2 * (a + b);
        return { prompt: `En rektangel har omkretsen ${p} cm och är ${a} cm lång. Hur bred är den i cm?`, answer: b, near: [p - a, p / 2, b + 1, b - 1, a + b],
          hints: ["Omkretsen är längd + bredd + längd + bredd. Två längder och två bredder.", "Halva omkretsen är en längd plus en bredd. Ta bort längden därifrån.", `Halva omkretsen är ${a + b}. ${a + b} − ${a} = ${b}. Svaret är ${b}.`] };
      }
      const ans = 2 * (a + b);
      return { prompt: `En rektangel är ${a} cm lång och ${b} cm bred. Hur lång är omkretsen i cm?`, answer: ans, near: [a + b, a * b, ans + 2, ans - 2],
        hints: ["Omkretsen är hela sträckan runt figuren. En rektangel har två långsidor och två kortsidor.", "Lägg ihop längd och bredd, och ta det två gånger.", `2 × (${a} + ${b}) = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Area: rektangel, triangel, kvadrat och baklänges. */
function areaTemplate(): Template {
  return procTemplate("ma.geo.area.v1", "ma.geo.area", REPS2,
    (rng, d) => {
      const form = d < 0.3 ? pick(rng, [0, 2]) : d < 0.65 ? pick(rng, [0, 2, 1]) : pick(rng, [0, 1, 3]);
      const hi = 4 + Math.round(d * 14);
      let a = int(rng, 3, hi), b = int(rng, 2, Math.max(3, hi - 1));
      if (form === 1 && (a * b) % 2 === 1) b++;
      return { form, a, b };
    },
    ({ form, a, b }) => {
      if (form === 1) {
        const ans = (a * b) / 2;
        return { prompt: `En triangel har basen ${a} cm och höjden ${b} cm. Hur stor är arean i kvadratcentimeter?`, answer: ans, near: [a * b, ans + a, ans - 1, ans + 1],
          hints: ["En triangel är hälften så stor som rektangeln med samma bas och höjd.", "Gångra basen med höjden och dela sedan med två.", `${a} × ${b} ÷ 2 = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 2) {
        const ans = a * a;
        return { prompt: `En kvadrat har sidan ${a} cm. Hur stor är arean i kvadratcentimeter?`, answer: ans, near: [4 * a, 2 * a, ans + a, ans - a],
          hints: ["Arean är hur många rutor som ryms inuti. I en kvadrat är raderna lika många som rutorna i varje rad.", "Gångra sidan med sig själv.", `${a} × ${a} = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 3) {
        const A = a * b;
        return { prompt: `En rektangel har arean ${A} kvadratcentimeter och är ${a} cm lång. Hur bred är den i cm?`, answer: b, near: [A - a, b + 1, b - 1, a + b],
          hints: ["Arean är längd × bredd. Här känner du arean och längden.", "Tänk tvärtom: dela arean med längden.", `${A} ÷ ${a} = ${b}. Svaret är ${b}.`] };
      }
      const ans = a * b;
      return { prompt: `En rektangel är ${a} cm lång och ${b} cm bred. Hur stor är arean i kvadratcentimeter?`, answer: ans, near: [2 * (a + b), a + b, ans + a, ans - b],
        hints: ["Arean är hur många rutor som ryms inuti figuren.", "Gångra längden med bredden.", `${a} × ${b} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Byta enhet. Längd (km, m, cm) eller vikt och volym (kg, g, liter, dl, ml). Svaret är alltid ett heltal. */
const UNITS: Record<number, { from: string; to: string; factor: number }[]> = {
  0: [{ from: "m", to: "cm", factor: 100 }, { from: "km", to: "m", factor: 1000 }, { from: "cm", to: "mm", factor: 10 }],
  1: [{ from: "kg", to: "g", factor: 1000 }, { from: "l", to: "dl", factor: 10 }, { from: "l", to: "ml", factor: 1000 }, { from: "dl", to: "ml", factor: 100 }],
};
function unitTemplate(kind: 0 | 1): Template {
  const id = kind === 0 ? "ma.geo.enhetsbyte" : "ma.mat.volym_vikt";
  return procTemplate(`${id}.v1`, id, REPS2,
    (rng, d) => ({ i: int(rng, 0, UNITS[kind].length - 1), n: int(rng, 2, 4 + Math.round(d * 16)), down: d < 0.3 ? 0 : rng() < 0.5 ? 1 : 0 }),
    ({ i, n, down }) => {
      const u = UNITS[kind][i];
      // Uppåt: 3 m = ? cm. Neråt: 300 cm = ? m.
      const ans = down ? n : n * u.factor;
      const prompt = down ? `${n * u.factor} ${u.to} = ? ${u.from}` : `${n} ${u.from} = ? ${u.to}`;
      const [big, small] = [u.from, u.to];
      return {
        prompt, answer: ans, near: down ? [n * u.factor, n * 10, n + 1, n - 1] : [n, n * u.factor * 10, n * u.factor / 10, ans + u.factor],
        hints: [
          `${big} är större än ${small}. Det går åt flera ${small} för varje ${big}.`,
          down ? `Du går från mindre enhet till större: dela. Hur många ${small} är en ${big}?` : `Du går från större enhet till mindre: gångra. Hur många ${small} är en ${big}?`,
          down ? `${n * u.factor} ÷ ${u.factor} = ${n}. Svaret är ${n}.` : `${n} × ${u.factor} = ${ans}. Svaret är ${ans}.`,
        ],
      };
    });
}

const two = (n: number) => String(n).padStart(2, "0");

/** Hur länge: från en klockslag till ett annat, eller timmar och minuter till minuter. */
function timeTemplate(): Template {
  return procTemplate("ma.mat.tidsskillnad.v1", "ma.mat.tidsskillnad", REPS2,
    (rng, d) => {
      const kind = d < 0.35 ? pick(rng, [0, 1]) : pick(rng, [0, 0, 1]);
      const h1 = int(rng, 7, 16);
      const m1 = pick(rng, d < 0.5 ? [15, 30, 45] : [5, 10, 20, 25, 35, 40, 50, 55]);
      const len = d < 0.5 ? int(rng, 20, 100) : int(rng, 35, 190);
      let total = h1 * 60 + m1 + len;
      if (total % 60 === 0) total += 5;
      const m2 = total % 60;
      return { kind, h1, m1, h2: Math.floor(total / 60), m2, h: int(rng, 1, 3 + Math.round(d * 3)), m: int(rng, 5, 55) };
    },
    ({ kind, h1, m1, h2, m2, h, m }) => {
      if (kind === 1) {
        const ans = h * 60 + m;
        return { prompt: `${h} timmar och ${m} minuter = ? minuter`, answer: ans, near: [h + m, h * 100 + m, ans + 60, ans - 60],
          hints: ["En timme är 60 minuter.", `Gångra timmarna med 60 och lägg sedan till minuterna.`, `${h} × 60 = ${h * 60} och ${h * 60} + ${m} = ${ans}. Svaret är ${ans}.`] };
      }
      const ans = (h2 * 60 + m2) - (h1 * 60 + m1);
      return {
        prompt: `Filmen börjar ${two(h1)}:${two(m1)} och slutar ${two(h2)}:${two(m2)}. Hur många minuter varar den?`, answer: ans,
        near: [ans + 10, ans - 10, ans + 60, ans - 60, (h2 - h1) * 60],
        hints: [
          "Räkna först fram till nästa hela timme. Sedan resten av tiden.",
          `Från ${two(h1)}:${two(m1)} till ${two(h1 + 1)}:00 är ${60 - m1} minuter. Räkna sedan vidare till ${two(h2)}:${two(m2)}.`,
          `Från ${two(h1)}:${two(m1)} till ${two(h2)}:${two(m2)} är ${ans} minuter. Svaret är ${ans}.`,
        ],
      };
    });
}

const THINGS2 = ["en glass", "en bulle", "ett suddgummi", "en tidning", "en bok", "ett äpple"];

/** Pengar: växel, flera saker, och vad som blir kvar. */
function moneyTemplate(): Template {
  return procTemplate("ma.mat.pengar.v1", "ma.mat.pengar", REPS2,
    (rng, d) => {
      const form = pick(rng, d < 0.4 ? [0, 0, 1] : [0, 1, 2]);
      const p = int(rng, 3, 15 + Math.round(d * 60));
      const q = int(rng, 3, 12 + Math.round(d * 40));
      const n = int(rng, 2, 4 + Math.round(d * 6));
      const pay = (form === 2 ? p + q : form === 1 ? p * n : p) + int(rng, 3, 40 + Math.round(d * 60));
      return { form, p, q, n, pay, th: int(rng, 0, THINGS2.length - 1) };
    },
    ({ form, p, q, n, pay, th }) => {
      if (form === 1) {
        const ans = p * n;
        return { prompt: `${n} saker kostar ${p} kr styck. Hur många kronor blir det tillsammans?`, answer: ans, near: [p + n, ans + p, ans - p, ans + 10],
          hints: ["Det är lika många kronor för varje sak. Det är gånger.", `Gångra priset för en sak med antalet.`, `${n} × ${p} = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 2) {
        const ans = pay - p - q;
        return { prompt: `Du har ${pay} kr. Du köper något för ${p} kr och något för ${q} kr. Hur många kronor har du kvar?`, answer: ans, near: [pay - p, pay - q, pay + p + q, ans + 10, ans - 10],
          hints: ["Lägg först ihop vad du köper. Ta sedan bort det från det du hade.", `Först: ${p} + ${q}. Sedan: ${pay} minus det.`, `${p} + ${q} = ${p + q} och ${pay} − ${p + q} = ${ans}. Svaret är ${ans}.`] };
      }
      const ans = pay - p;
      return { prompt: `Du köper ${THINGS2[th]} för ${p} kr och betalar med ${pay} kr. Hur många kronor får du tillbaka?`, answer: ans, near: [pay + p, ans + 10, ans - 10, p],
        hints: ["Växeln är det du betalar minus vad det kostar.", `Räkna uppåt från ${p} till ${pay}, eller ta ${pay} − ${p}.`, `${pay} − ${p} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Medelvärde, median och typvärde. Medelvärdet är alltid ett heltal. */
function statTemplate(): Template {
  const list = (xs: number[]) => xs.length > 1 ? `${xs.slice(0, -1).join(", ")} och ${xs[xs.length - 1]}` : String(xs[0]);
  return procTemplate("ma.stat.medelvarde.v1", "ma.stat.medelvarde", REPS2,
    (rng, d) => {
      const kind = d < 0.35 ? pick(rng, [0, 2]) : pick(rng, [0, 1, 2]);
      const n = kind === 1 ? pick(rng, [3, 5]) : int(rng, 3, 4 + Math.round(d * 2));
      const mean = int(rng, 4, 8 + Math.round(d * 20));
      const xs: number[] = [];
      // Medelvärde: tal runt medelvärdet som tillsammans blir exakt n × mean.
      let left = n * mean;
      for (let i = 0; i < n - 1; i++) { const x = Math.max(1, Math.min(left - (n - 1 - i), mean + int(rng, -3, 3))); xs.push(x); left -= x; }
      xs.push(Math.max(1, left));
      const nums: Record<string, number> = { kind, n, mean };
      xs.forEach((x, i) => { nums[`x${i}`] = x; });
      // Typvärde: ett tal som förekommer flest gånger.
      return nums;
    },
    (p) => {
      const n = p.n;
      let xs = Array.from({ length: n }, (_, i) => p[`x${i}`]);
      if (p.kind === 0) {
        const s = xs.reduce((a, b) => a + b, 0), ans = s / n;
        return { prompt: `Medelvärdet av ${list(xs)} = ?`, answer: ans, near: [s, ans + 1, ans - 1, Math.max(...xs)],
          hints: ["Medelvärdet är det tal alla skulle ha om de var lika många.", `Lägg ihop alla talen. Dela sedan summan med hur många tal det är.`, `Summan är ${s}. ${s} ÷ ${n} = ${ans}. Svaret är ${ans}.`] };
      }
      if (p.kind === 1) {
        xs = [...xs];
        const sorted = [...xs].sort((a, b) => a - b), ans = sorted[(n - 1) / 2];
        return { prompt: `Medianen av ${list(xs)} = ?`, answer: ans, near: [Math.max(...xs), Math.min(...xs), xs[0], xs.reduce((a, b) => a + b, 0) / n | 0],
          hints: ["Medianen är talet i mitten när talen står i storleksordning.", "Ordna talen från minst till störst. Ta det som står mitt emellan.", `I storleksordning: ${sorted.join(", ")}. Mitten är ${ans}. Svaret är ${ans}.`] };
      }
      // Typvärde: bygg om till en lista där ett tal upprepas.
      const base = [...new Set(xs)].slice(0, 3);
      const mode = base[0];
      const rest = [...base.slice(1), ...base.slice(1)].filter((x) => x !== mode).slice(0, Math.max(1, n - 2));
      const all = [mode, mode, ...rest, mode].slice(0, Math.max(n, 4));
      const shown = all.map((x, i) => (i % 2 ? x : all[all.length - 1 - i])).concat([]);
      void shown;
      const arr = [mode, ...rest.slice(0, 1), mode, ...rest.slice(1), mode];
      return { prompt: `Typvärdet av ${list(arr)} = ?`, answer: mode, near: [rest[0] ?? mode + 1, mode + 1, mode - 1, arr.length],
        hints: ["Typvärdet är det tal som förekommer flest gånger.", "Räkna hur många gånger varje tal finns med.", `${mode} finns med flest gånger. Svaret är ${mode}.`] };
    });
}

/** Proportion: om tre saker kostar så mycket, vad kostar fem? */
function proportionTemplate(): Template {
  return procTemplate("ma.samb.proportionalitet.v1", "ma.samb.proportionalitet", REPS2,
    (rng, d) => {
      const n = int(rng, 2, 5), m = int(rng, 2, 8 + Math.round(d * 8));
      return { n, m: m === n ? m + 1 : m, unit: int(rng, 2, 8 + Math.round(d * 30)), th: int(rng, 0, 3) };
    },
    ({ n, m, unit, th }) => {
      const what = ["bullar", "äpplen", "pennor", "klistermärken"][th];
      const total = n * unit, ans = m * unit;
      return {
        prompt: `${n} ${what} kostar ${total} kr. Vad kostar ${m} ${what}?`, answer: ans, near: [total + m, total * m, ans + unit, ans - unit, unit],
        hints: [
          "Ta reda på vad en enda kostar först.",
          `Dela ${total} med ${n}. Gångra sedan med ${m}.`,
          `${total} ÷ ${n} = ${unit} och ${unit} × ${m} = ${ans}. Svaret är ${ans}.`,
        ],
      };
    });
}

/** Berättelser i två steg: gånger och minus, plus och delat, gånger och växel. */
function twoStepTemplate(): Template {
  return procTemplate("ma.prob.textuppgift_flera.v1", "ma.prob.textuppgift_flera", REPS2,
    (rng, d) => {
      const form = pick(rng, d < 0.4 ? [0, 1] : [0, 1, 2]);
      const a = int(rng, 2, 5 + Math.round(d * 6)), b = int(rng, 2, 6 + Math.round(d * 6));
      return { form, a, b, nm: int(rng, 0, NAMES.length - 1), c: int(rng, 2, 6), k: int(rng, 1, 9 + Math.round(d * 10)) };
    },
    ({ form, a, b, nm, c, k }) => {
      const name = NAMES[nm];
      if (form === 1) {
        // (a + b) delas lika mellan c: gör summan jämnt delbar.
        const share = Math.max(1, Math.floor((a + b) / c)) , tot = share * c;
        const a2 = tot - b > 0 ? tot - b : a, b2 = tot - a2;
        return { prompt: `${name} har ${a2} bär och får ${b2} till. De delas lika mellan ${c} kompisar. Hur många bär får var och en?`, answer: share,
          near: [tot, share + 1, share - 1, a2 - b2],
          hints: ["Det är två steg. Ta först reda på hur många bär det är i alla.", `Lägg ihop bären. Dela sedan med antalet kompisar.`, `${a2} + ${b2} = ${tot} och ${tot} ÷ ${c} = ${share}. Svaret är ${share}.`] };
      }
      if (form === 2) {
        const pay = a * b + k;
        return { prompt: `${name} köper ${a} böcker för ${b} kr styck och betalar med ${pay} kr. Hur många kronor får ${name} tillbaka?`, answer: k,
          near: [a * b, pay - b, k + 1, k - 1 < 0 ? k + 2 : k - 1, pay],
          hints: ["Räkna först ut vad allt kostar. Växeln är det du betalar minus det.", `Gångra antalet med priset. Ta sedan betalningen minus det.`, `${a} × ${b} = ${a * b} och ${pay} − ${a * b} = ${k}. Svaret är ${k}.`] };
      }
      const eat = Math.min(k, a * b - 1);
      const ans = a * b - eat;
      return { prompt: `${name} har ${a} påsar med ${b} bär i varje. ${name} äter ${eat} bär. Hur många bär är kvar?`, answer: ans,
        near: [a * b, a + b - eat, ans + 1, ans - 1],
        hints: ["Det är två steg. Ta först reda på hur många bär det är från början.", `Gångra påsarna med bären i varje. Ta sedan bort de som äts.`, `${a} × ${b} = ${a * b} och ${a * b} − ${eat} = ${ans}. Svaret är ${ans}.`] };
    });
}

// ── Åk 1–6, del 4: platsvärde, huvudräkning, mönster, former, klockan, data och logik ──

/** Platsvärde till 100. */
function place100Template(): Template {
  return procTemplate("ma.tal.positionssystem100.v1", "ma.tal.positionssystem100", REPS2,
    (rng, d) => ({ form: int(rng, 0, 2), t: int(rng, 1, d < 0.4 ? 5 : 9), e: int(rng, 1, 9) }),
    ({ form, t, e }) => {
      const n = t * 10 + e;
      if (form === 1) return { prompt: `Hur många tiotal har talet ${n}?`, answer: t, near: [e, t + 1, t - 1, n],
        hints: ["Tiotalen är siffran längst till vänster i ett tvåsiffrigt tal.", "Titta på siffran på tiotalsplatsen.", `${n} har ${t} tiotal och ${e} ental. Svaret är ${t}.`] };
      if (form === 2) return { prompt: `Hur många ental har talet ${n}?`, answer: e, near: [t, e + 1, e - 1, n],
        hints: ["Entalen är siffran längst till höger.", "Titta på siffran på entalsplatsen.", `${n} har ${t} tiotal och ${e} ental. Svaret är ${e}.`] };
      return { prompt: `Vilket tal är ${t} tiotal och ${e} ental?`, answer: n, near: [t + e, e * 10 + t, n + 10, n - 10],
        hints: ["Ett tiotal är tio. Skriv tiotalen först, sedan entalen.", "Tiotalen blir siffran på tiotalsplatsen och entalen siffran på entalsplatsen.", `${t} tiotal är ${t * 10}. ${t * 10} + ${e} = ${n}. Svaret är ${n}.`] };
    });
}

/** Platsvärde till 1 000. Siffrorna är olika och aldrig noll så att «siffran X» är entydig. */
function place1000Template(): Template {
  return procTemplate("ma.tal.positionssystem1000.v1", "ma.tal.positionssystem1000", REPS2,
    (rng, d) => {
      const ds = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
      return { form: int(rng, 0, d < 0.3 ? 1 : 2), h: ds[0], t: ds[1], e: ds[2], pl: int(rng, 0, 2) };
    },
    ({ form, h, t, e, pl }) => {
      const n = h * 100 + t * 10 + e;
      if (form === 1) return { prompt: `Vilken siffra står på tiotalsplatsen i ${n}?`, answer: t, near: [h, e, t + 1, t - 1],
        hints: ["Platserna är hundratal, tiotal och ental, från vänster till höger.", "Tiotalsplatsen är i mitten.", `I ${n} står ${t} i mitten. Svaret är ${t}.`] };
      if (form === 2) {
        const x = [e, t, h][pl], val = x * 10 ** pl;
        return { prompt: `Hur mycket är siffran ${x} värd i ${n}?`, answer: val, near: [x, x * 10, x * 100, x * 1000, val + 10].filter((v) => v !== val),
          hints: ["En siffra är värd olika mycket beroende på var den står.", "Titta på vilken plats siffran står på: ental, tiotal eller hundratal.", `Siffran ${x} står på ${["entalsplatsen", "tiotalsplatsen", "hundratalsplatsen"][pl]} i ${n}, så den är värd ${val}. Svaret är ${val}.`] };
      }
      return { prompt: `Vilket tal är ${h} hundratal, ${t} tiotal och ${e} ental?`, answer: n, near: [h + t + e, e * 100 + t * 10 + h, n + 100, n - 10],
        hints: ["Ett hundratal är hundra och ett tiotal är tio.", "Skriv hundratalen först, sedan tiotalen och sist entalen.", `${h * 100} + ${t * 10} + ${e} = ${n}. Svaret är ${n}.`] };
    });
}

/** Stora tal upp till en miljon. */
function placeBigTemplate(): Template {
  return procTemplate("ma.tal.positionssystem_stora.v1", "ma.tal.positionssystem_stora", REPS2,
    (rng, d) => {
      const form = int(rng, 0, 1);
      const hi = d < 0.5 ? 99 : 999;
      return { form, x: int(rng, 2, hi), y: int(rng, 11, 989), n: int(rng, 12, 90) * 1000 + int(rng, 0, 9) * 100 + int(rng, 1, 9), step: pick(rng, [100, 1000, 10000]), down: int(rng, 0, 1) };
    },
    ({ form, x, y, n, step, down }) => {
      if (form === 1) {
        const m = down ? n + step : n; // «mindre än»: se till att svaret inte blir negativt
        const ans = down ? m - step : m + step;
        return { prompt: `Vilket tal är ${step} ${down ? "mindre" : "mer"} än ${m}?`, answer: ans, near: [down ? m + step : m - step, ans + step, ans - step, ans + 10 * step],
          hints: ["Ta reda på vilken siffra som ändras. Det beror på om du tar hundra, tusen eller tiotusen.", `Lägg ${down ? "bort" : "till"} ${step} på rätt plats och låt de andra siffrorna vara.`, `${m} ${down ? "−" : "+"} ${step} = ${ans}. Svaret är ${ans}.`] };
      }
      const ans = x * 1000 + y;
      return { prompt: `Vilket tal är ${x} tusen och ${y}?`, answer: ans, near: [x + y, x * 100 + y, x * 10000 + y, ans + 1000, ans - 1000],
        hints: ["Tusen är tre nollor efter. Hundratalen, tiotalen och entalen kommer efter tusentalen.", "Skriv först tusentalen, sedan det som är över.", `${x * 1000} + ${y} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Jämföra bråk med samma nämnare eller samma täljare. Svaret är ett tal ur bråken. */
function fracCompareTemplate(): Template {
  return procTemplate("ma.tal.brak_jamfora.v1", "ma.tal.brak_jamfora", REPS2,
    (rng, d) => {
      const a = int(rng, 2, 4 + Math.round(d * 8));
      let b = int(rng, 2, 4 + Math.round(d * 8));
      if (b === a) b = a + 1;
      const den = int(rng, 5, 12), x = int(rng, 1, den - 2);
      return { form: int(rng, 0, 1), a, b, den, x, y: x + int(rng, 1, Math.min(3, den - 1 - x)) };
    },
    ({ form, a, b, den, x, y }) => {
      if (form === 1) return { prompt: `Vilket bråk är störst, ${x}/${den} eller ${y}/${den}? Skriv talet över strecket.`, answer: y, near: [x, den, y + 1, y - 1],
        hints: ["Bitarna är lika stora, eftersom nämnaren är lika.", "Då är det bråket med flest bitar störst.", `${y} bitar är fler än ${x} bitar. Svaret är ${y}.`] };
      const ans = Math.min(a, b);
      return { prompt: `Vilket bråk är störst, 1/${a} eller 1/${b}? Skriv talet under strecket.`, answer: ans, near: [Math.max(a, b), a + b, ans + 1, ans - 1],
        hints: ["Hela delas i lika många delar som talet under strecket visar.", "Ju fler delar något delas i, desto mindre blir varje del.", `${ans} är det minsta talet under strecket, så det är den största biten. Svaret är ${ans}.`] };
    });
}

const roundTen = (n: number) => Math.round(n / 10) * 10;

/** Överslag: avrunda och räkna. Ingen tiondel slutar på 5. */
function estimateTemplate(): Template {
  return procTemplate("ma.rakna.overslag.v1", "ma.rakna.overslag", REPS2,
    (rng, d) => {
      const pickNo5 = (lo: number, hi: number) => { let v = int(rng, lo, hi); if (v % 10 === 5) v++; return v; };
      const op = int(rng, 0, d < 0.4 ? 1 : 2);
      const hi = 40 + Math.round(d * 160);
      let a = pickNo5(24, hi), b = pickNo5(14, Math.max(30, hi - 20));
      if (op === 1 && roundTen(a) - roundTen(b) < 10) { a = roundTen(b) + 30 + int(rng, 1, 4); }
      return { op, a, b, c: int(rng, 3, 9) };
    },
    ({ op, a, b, c }) => {
      const ra = roundTen(a), rb = roundTen(b);
      if (op === 2) {
        const ans = ra * c;
        return { prompt: `Gör ett överslag: ${a} × ${c} ≈ ?`, answer: ans, near: [a * c, ra + c, ans + 10, ans - c * 10],
          hints: ["Avrunda det stora talet till närmaste tiotal.", "Gångra det avrundade talet med det andra talet.", `${a} blir ${ra}. ${ra} × ${c} = ${ans}. Svaret är ${ans}.`] };
      }
      const sign = op === 0 ? "+" : "−";
      const ans = op === 0 ? ra + rb : ra - rb;
      return { prompt: `Gör ett överslag: ${a} ${sign} ${b} ≈ ?`, answer: ans, near: [a + b, a - b, ans + 10, ans - 10],
        hints: ["Avrunda båda talen till närmaste tiotal.", "Räkna sedan med de avrundade talen.", `${a} blir ${ra} och ${b} blir ${rb}. ${ra} ${sign} ${rb} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Smarta sätt att räkna i huvudet. */
function mentalTemplate(): Template {
  return procTemplate("ma.rakna.huvudrakning.v1", "ma.rakna.huvudrakning", REPS2,
    (rng, d) => ({ form: int(rng, 0, d < 0.3 ? 1 : 3), a: int(rng, 24, 40 + Math.round(d * 160)), k: int(rng, 1, 3 + Math.round(d * 3)), m: int(rng, 12, 20 + Math.round(d * 30)) }),
    ({ form, a, k, m }) => {
      const near9 = 10 * k - 1;
      if (form === 0) {
        const ans = a + near9;
        return { prompt: `Räkna i huvudet: ${a} + ${near9} = ?`, answer: ans, near: [a + 10 * k, ans + 2, ans - 2, ans + 10],
          hints: ["Det är nästan ett jämnt tiotal. Räkna med det jämna talet först.", `Lägg till ${10 * k}. Dra sedan bort 1.`, `${a} + ${10 * k} = ${a + 10 * k} och ${a + 10 * k} − 1 = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 1) {
        const a2 = a + 10 * k + 10, ans = a2 - near9;
        return { prompt: `Räkna i huvudet: ${a2} − ${near9} = ?`, answer: ans, near: [a2 - 10 * k, ans + 2, ans - 2, ans - 10],
          hints: ["Det är nästan ett jämnt tiotal. Räkna med det jämna talet först.", `Dra bort ${10 * k}. Lägg sedan till 1.`, `${a2} − ${10 * k} = ${a2 - 10 * k} och ${a2 - 10 * k} + 1 = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 2) {
        const ans = m * 5;
        return { prompt: `Räkna i huvudet: ${m} × 5 = ?`, answer: ans, near: [m * 4, m * 6, ans + 5, ans - 5],
          hints: ["Gånger fem är hälften av gånger tio.", "Gångra med tio först. Ta sedan hälften.", `${m} × 10 = ${m * 10} och hälften av det är ${ans}. Svaret är ${ans}.`] };
      }
      const ans = m * 4;
      return { prompt: `Räkna i huvudet: ${m} × 4 = ?`, answer: ans, near: [m * 2, m * 3, m * 5, ans + 4],
        hints: ["Gånger fyra är dubbelt, och sedan dubbelt igen.", "Dubbla talet. Dubbla sedan resultatet.", `${m} dubblat är ${m * 2}, dubblat igen är ${ans}. Svaret är ${ans}.`] };
    });
}

/** Mönster: lika steg, växande steg och dubblering. */
function patternTemplate(): Template {
  return procTemplate("ma.alg.monster.v1", "ma.alg.monster", REPS2,
    (rng, d) => ({ form: int(rng, 0, d < 0.35 ? 0 : 2), s: int(rng, 2, 3 + Math.round(d * 8)), x: int(rng, 1, 5 + Math.round(d * 20)), g: int(rng, 1, 3) }),
    ({ form, s, x, g }) => {
      if (form === 1) {
        // Stegen växer med 1 varje gång: x, x+g, x+g+(g+1), ...
        const seq = [x]; let step = g;
        for (let i = 0; i < 5; i++) { seq.push(seq[i] + step); step++; }
        const ans = seq[5];
        return { prompt: `Fortsätt mönstret: ${seq.slice(0, 5).join(", ")}, ?`, answer: ans, near: [seq[4] + (seq[4] - seq[3]), ans + 1, ans - 1, seq[4] + step - 2],
          hints: ["Titta på hur mycket talen ökar mellan varje steg.", "Ökningen blir större för varje steg. Hur mycket större?", `Steget var ${seq[4] - seq[3]} och blir ${ans - seq[4]}. ${seq[4]} + ${ans - seq[4]} = ${ans}. Svaret är ${ans}.`] };
      }
      if (form === 2) {
        const seq = [x, x * 2, x * 4, x * 8], ans = x * 16;
        return { prompt: `Fortsätt mönstret: ${seq.join(", ")}, ?`, answer: ans, near: [seq[3] + seq[1], seq[3] + seq[3] / 2, ans + x, ans - x],
          hints: ["Titta på hur varje tal förhåller sig till det före.", "Varje tal är det dubbla av talet före.", `${seq[3]} × 2 = ${ans}. Svaret är ${ans}.`] };
      }
      const seq = [x, x + s, x + 2 * s, x + 3 * s], ans = x + 4 * s;
      return { prompt: `Fortsätt mönstret: ${seq.join(", ")}, ?`, answer: ans, near: [seq[3] + 1, seq[3] + s + 1, ans + 1, ans - 1],
        hints: ["Titta på hur mycket talen ökar mellan varje steg.", "Räkna skillnaden mellan två tal som står bredvid varandra.", `Talen ökar med ${s} varje gång. ${seq[3]} + ${s} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Lika mycket på båda sidor om likhetstecknet. */
function equalSignTemplate(): Template {
  return procTemplate("ma.alg.likhetstecken.v1", "ma.alg.likhetstecken", REPS2,
    (rng, d) => {
      const hi = 6 + Math.round(d * 40);
      const a = int(rng, 2, hi), b = int(rng, 2, hi), c = int(rng, 1, a + b - 1);
      return { form: int(rng, 0, 1), a, b, c };
    },
    ({ form, a, b, c }) => {
      const ans = a + b - c;
      const near = [a + b, a, b, ans + 1, ans - 1, c];
      const hints: [string, string, string] = ["Likhetstecknet betyder att det är lika mycket på båda sidor.", `Räkna först ut vad ${a} + ${b} är. Vad behövs för att nå dit?`, `${a} + ${b} = ${a + b} och ${a + b} − ${c} = ${ans}. Svaret är ${ans}.`];
      return form === 1
        ? { prompt: `? + ${c} = ${a} + ${b}`, answer: ans, near, hints }
        : { prompt: `${a} + ${b} = ${c} + ?`, answer: ans, near, hints };
    });
}

/** Uttryck med en bokstav: om n är 4, vad är 3n + 2? */
function expressionTemplate(): Template {
  return procTemplate("ma.alg.uttryck.v1", "ma.alg.uttryck", REPS2,
    (rng, d) => {
      const n = int(rng, 2, 5 + Math.round(d * 7)), k = int(rng, 2, 4 + Math.round(d * 5));
      return { n, k, c: int(rng, 1, Math.min(k * n - 1, 3 + Math.round(d * 12))), minus: int(rng, 0, 1) };
    },
    ({ n, k, c, minus }) => {
      const ans = minus ? k * n - c : k * n + c;
      return { prompt: `Om n = ${n}, vad är ${k}n ${minus ? "−" : "+"} ${c}?`, answer: ans, near: [k + n + (minus ? -c : c), k * n, ans + c, ans - 1, ans + 1],
        hints: ["Byt ut bokstaven mot talet den står för.", `${k}n betyder ${k} gånger n. Räkna det först.`, `${k} × ${n} = ${k * n} och ${k * n} ${minus ? "−" : "+"} ${c} = ${ans}. Svaret är ${ans}.`] };
    });
}

const SHAPES: Record<string, number> = { triangel: 3, kvadrat: 4, rektangel: 4, femhörning: 5, sexhörning: 6, åttahörning: 8 };
const SHAPE_NAMES = Object.keys(SHAPES);

/** Hörn och sidor på plana figurer. */
function shapeTemplate(): Template {
  return procTemplate("ma.geo.former.v1", "ma.geo.former", REPS2,
    (rng, d) => ({ i: int(rng, 0, d < 0.4 ? 3 : SHAPE_NAMES.length - 1), side: int(rng, 0, 1) }),
    ({ i, side }) => {
      const f = SHAPE_NAMES[i], n = SHAPES[f], what = side ? "sidor" : "hörn";
      return { prompt: `Hur många ${what} har en ${f}?`, answer: n, near: [n + 1, n - 1, n + 2, n * 2],
        hints: [side ? "Sidor är de raka linjerna runt figuren." : "Hörn är där två sidor möts.", "En figur har lika många hörn som sidor. Räkna den ena.", `En ${f} har ${n} ${what}. Svaret är ${n}.`] };
    });
}

/** [hörn, kanter, sidoytor] */
const BODIES: Record<string, [number, number, number]> = { kub: [8, 12, 6], rätblock: [8, 12, 6], "fyrsidig pyramid": [5, 8, 5], triangelprisma: [6, 9, 5] };
const BODY_NAMES = Object.keys(BODIES);
const BODY_PARTS = ["hörn", "kanter", "sidoytor"];

/** Hörn, kanter och sidoytor på kroppar. */
function bodyTemplate(): Template {
  return procTemplate("ma.geo.kroppar.v1", "ma.geo.kroppar", REPS2,
    (rng, d) => ({ i: int(rng, 0, d < 0.4 ? 1 : BODY_NAMES.length - 1), p: int(rng, 0, 2) }),
    ({ i, p }) => {
      const b = BODY_NAMES[i], n = BODIES[b][p], part = BODY_PARTS[p];
      const art = b === "kub" ? "en" : b === "rätblock" ? "ett" : "en";
      return { prompt: `Hur många ${part} har ${art} ${b}?`, answer: n, near: [n + 1, n - 1, n + 2, n * 2],
        hints: ["Sidoytor är de platta ytorna, kanter är där två ytor möts och hörn är där kanter möts.", "Rita kroppen eller tänk på en ask och räkna en sort i taget.", `${art[0].toUpperCase() + art.slice(1)} ${b} har ${n} ${part}. Svaret är ${n}.`] };
    });
}

const SYM: Record<string, number> = { kvadrat: 4, rektangel: 2, "liksidig triangel": 3, "regelbunden femhörning": 5, "regelbunden sexhörning": 6, hjärta: 1 };
const SYM_NAMES = Object.keys(SYM);

/** Symmetrilinjer. */
function symmetryTemplate(): Template {
  return procTemplate("ma.geo.symmetri.v1", "ma.geo.symmetri", REPS2,
    (rng, d) => ({ i: int(rng, 0, d < 0.4 ? 2 : SYM_NAMES.length - 1) }),
    ({ i }) => {
      const f = SYM_NAMES[i], n = SYM[f];
      return { prompt: `Hur många symmetrilinjer har ${f === "hjärta" ? "ett hjärta" : f === "rektangel" ? "en rektangel" : "en " + f}?`, answer: n, near: [n + 1, n - 1, n + 2, n * 2],
        hints: ["En symmetrilinje delar figuren i två halvor som är spegelbilder av varandra.", "Prova att vika figuren på olika sätt så att halvorna täcker varandra.", `${n} sätt att vika fungerar. Svaret är ${n}.`] };
    });
}

/** Längd med cm: skillnad, sammanlagd längd och steg. */
function lengthTemplate(): Template {
  return procTemplate("ma.geo.langd.v1", "ma.geo.langd", REPS2,
    (rng, d) => ({ form: int(rng, 0, 2), a: int(rng, 8, 20 + Math.round(d * 60)), b: int(rng, 3, 7 + Math.round(d * 30)), n: int(rng, 2, 4 + Math.round(d * 5)) }),
    ({ form, a, b, n }) => {
      const long = a + b;
      if (form === 1) return { prompt: `Två pinnar är ${a} cm och ${b} cm. De läggs efter varandra. Hur lång blir raden i cm?`, answer: long, near: [a, a * b, long + 1, long - 1],
        hints: ["När de läggs efter varandra blir det längre. Det är plus.", "Lägg ihop längderna på pinnarna.", `${a} + ${b} = ${long}. Svaret är ${long}.`] };
      if (form === 2) return { prompt: `Ett steg är ${b} cm. Hur långt är ${n} steg i cm?`, answer: b * n, near: [b + n, b * n + b, b * n - b, b * n + 10],
        hints: ["Varje steg är lika långt. Det är gånger.", "Gångra längden på ett steg med antalet steg.", `${n} × ${b} = ${b * n}. Svaret är ${b * n}.`] };
      return { prompt: `Ett snöre är ${long} cm. Ett annat är ${b} cm. Hur många cm längre är det längre snöret?`, answer: a, near: [long + b, long, a + 1, a - 1],
        hints: ["Hur mycket längre är en skillnad. Det är minus.", "Ta det längre snöret minus det kortare.", `${long} − ${b} = ${a}. Svaret är ${a}.`] };
    });
}

/** Vinklar och grader. */
function angleTemplate(): Template {
  return procTemplate("ma.geo.vinklar.v1", "ma.geo.vinklar", REPS2,
    (rng, d) => ({ form: int(rng, 0, d < 0.3 ? 1 : 3), a: int(rng, 25, 80), b: int(rng, 20, 70), n: int(rng, 2, 4), c: int(rng, 10, 85) }),
    ({ form, a, b, n, c }) => {
      if (form === 1) return { prompt: `Två vinklar bildar tillsammans en rät vinkel. Den ena är ${c}°. Hur stor är den andra i grader?`, answer: 90 - c, near: [c, 90 + c, 180 - c, 90 - c + 10],
        hints: ["En rät vinkel är 90 grader.", "Ta det som saknas upp till en rät vinkel.", `90 − ${c} = ${90 - c}. Svaret är ${90 - c}.`] };
      if (form === 2) return { prompt: `Hur många grader är ${n} räta vinklar tillsammans?`, answer: 90 * n, near: [90 + n, 90 * (n + 1), 90 * (n - 1), 180],
        hints: ["En rät vinkel är 90 grader.", "Gångra 90 med antalet vinklar.", `${n} × 90 = ${90 * n}. Svaret är ${90 * n}.`] };
      if (form === 3) return { prompt: `Två vinklar bildar tillsammans en rak vinkel. Den ena är ${c + 5}°. Hur stor är den andra i grader?`, answer: 175 - c, near: [c + 5, 180 + c, 90 - c, 175 - c + 10],
        hints: ["En rak vinkel är en rak linje. Den är 180 grader.", "Ta det som saknas upp till 180 grader.", `180 − ${c + 5} = ${175 - c}. Svaret är ${175 - c}.`] };
      return { prompt: `Två vinklar i en triangel är ${a}° och ${b}°. Hur stor är den tredje vinkeln i grader?`, answer: 180 - a - b, near: [a + b, 180 - a, 180 - b, 180 - a - b + 10],
        hints: ["Alla tre vinklar i en triangel är tillsammans 180 grader.", "Lägg ihop de två vinklarna du vet. Ta sedan det som saknas upp till 180.", `${a} + ${b} = ${a + b} och 180 − ${a + b} = ${180 - a - b}. Svaret är ${180 - a - b}.`] };
    });
}

/** Skala: 1:k betyder att 1 cm på ritningen är k cm på riktigt. */
function scaleTemplate(): Template {
  return procTemplate("ma.geo.skala.v1", "ma.geo.skala", REPS2,
    (rng, d) => ({ form: int(rng, 0, 1), k: pick(rng, d < 0.5 ? [2, 5, 10] : [10, 20, 25, 50, 100]), n: int(rng, 2, 6 + Math.round(d * 12)) }),
    ({ form, k, n }) => {
      if (form === 1) return { prompt: `Skalan är 1:${k}. Sträckan är ${n * k} cm i verkligheten. Hur lång är den på ritningen i cm?`, answer: n, near: [n * k * k, n * k + k, n + 1, n - 1, k],
        hints: ["Skalan 1 till något betyder att allt är så många gånger mindre på ritningen.", "Dela den verkliga längden med talet i skalan.", `${n * k} ÷ ${k} = ${n}. Svaret är ${n}.`] };
      return { prompt: `Skalan är 1:${k}. Sträckan på ritningen är ${n} cm. Hur lång är den i verkligheten i cm?`, answer: n * k, near: [n + k, n * k * 10, n * k - k, n * k + k],
        hints: ["Skalan 1 till något betyder att 1 cm på ritningen är så många cm på riktigt.", "Gångra längden på ritningen med talet i skalan.", `${n} × ${k} = ${n * k}. Svaret är ${n * k}.`] };
    });
}

/** Klockan: hela och halva timmar. */
function clockHalfTemplate(): Template {
  return procTemplate("ma.mat.klockan_hel.v1", "ma.mat.klockan_hel", REPS2,
    (rng, d) => ({ form: int(rng, 0, 1), h: int(rng, 1, 11), n: int(rng, 1, 2 + Math.round(d * 4)) }),
    ({ form, h, n }) => {
      if (form === 1) return { prompt: `Hur många halvtimmar är det på ${n} ${n === 1 ? "timme" : "timmar"}?`, answer: 2 * n, near: [n, n + 2, 2 * n + 1, 2 * n - 1],
        hints: ["En halvtimme är hälften av en timme.", "Det går två halvtimmar på en timme.", `${n} × 2 = ${2 * n}. Svaret är ${2 * n}.`] };
      const ans = ((h + n - 1) % 12) + 1;
      return { prompt: `Klockan är ${h}. Vad är klockan efter ${n} ${n === 1 ? "timme" : "timmar"}? Skriv timmen.`, answer: ans, near: [h + n + 1, h - n > 0 ? h - n : h + 1, ans + 1, ans - 1 > 0 ? ans - 1 : 12],
        hints: ["Lägg till timmarna. Efter tolv börjar klockan om på ett.", "Räkna framåt timme för timme från klockslaget.", `${h} + ${n} = ${h + n}${h + n > 12 ? `, och efter tolv börjar man om, så det blir ${ans}` : ""}. Svaret är ${ans}.`] };
    });
}

/** Klockan på minuten: tid kvar till hel timme, och minuter som går. */
function clockMinuteTemplate(): Template {
  return procTemplate("ma.mat.klockan_minut.v1", "ma.mat.klockan_minut", REPS2,
    (rng, d) => ({ form: int(rng, 0, 1), h: int(rng, 1, 12), m: int(rng, 5, 55), p: int(rng, 5, 30 + Math.round(d * 25)) }),
    ({ form, h, m, p }) => {
      if (form === 1) {
        const ans = (m + p) % 60;
        return { prompt: `Klockan är ${h}:${two(m)}. Efter ${p} minuter, vilka minuter visar klockan? Skriv bara minutdelen.`, answer: ans, near: [m + p, p, m, ans + 5, ans - 5 < 0 ? ans + 10 : ans - 5],
          hints: ["Lägg till minuterna. En timme är 60 minuter.", "Blir det mer än 60 börjar minutvisaren om från noll.", `${m} + ${p} = ${m + p}${m + p >= 60 ? `. Ta bort 60 och det blir ${ans}` : ""}. Svaret är ${ans}.`] };
      }
      const ans = 60 - m;
      return { prompt: `Klockan är ${h}:${two(m)}. Hur många minuter är det kvar till nästa hela timme?`, answer: ans, near: [m, 100 - m, ans + 5, ans - 5],
        hints: ["En hel timme är 60 minuter.", "Ta 60 minus minuterna som har gått.", `60 − ${m} = ${ans}. Svaret är ${ans}.`] };
    });
}

const COLORS = ["Röd", "Blå", "Gul"] as const;
const PLURAL = ["röda", "blå", "gula"] as const;

/** Läsa tabeller: skillnad, summa och största minus minsta. */
function tableTemplate(): Template {
  return procTemplate("ma.stat.tabeller.v1", "ma.stat.tabeller", REPS2,
    (rng, d) => {
      const hi = 8 + Math.round(d * 40);
      const v = shuffle(rng, [int(rng, 2, hi), int(rng, 2, hi), int(rng, 2, hi)]);
      if (v[0] === v[1]) v[1]++; if (v[1] === v[2] || v[0] === v[2]) v[2] += 2;
      return { form: int(rng, 0, 1), a: v[0], b: v[1], c: v[2], p: int(rng, 0, 2), q: int(rng, 1, 2) };
    },
    ({ form, a, b, c, p, q }) => {
      const v = [a, b, c], head = `Tabellen visar antal bilar: ${COLORS[0]} ${a}, ${COLORS[1]} ${b}, ${COLORS[2]} ${c}.`;
      if (form === 1) { const ans = a + b + c; return { prompt: `${head} Hur många bilar är det tillsammans?`, answer: ans, near: [a + b, b + c, a + c, ans + 1, ans - 1],
        hints: ["Tillsammans betyder att allt ska läggas ihop.", "Läs av alla tre siffror och lägg ihop dem.", `${a} + ${b} + ${c} = ${ans}. Svaret är ${ans}.`] }; }
      const x = p, y = (p + q) % 3, hi = v[x] > v[y] ? x : y, lo = hi === x ? y : x, ans = v[hi] - v[lo];
      return { prompt: `${head} Hur många fler är ${PLURAL[hi]} än ${PLURAL[lo]}?`, answer: ans, near: [v[hi] + v[lo], v[hi], v[lo], ans + 1, ans - 1],
        hints: ["Hur många fler är en skillnad. Det är minus.", `Läs av ${PLURAL[hi]} och ${PLURAL[lo]} bilar i tabellen. Ta det större minus det mindre.`, `${v[hi]} − ${v[lo]} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Chans: «x av ?». */
function chanceTemplate(): Template {
  return procTemplate("ma.stat.chans.v1", "ma.stat.chans", REPS2,
    (rng, d) => {
      const hi = 3 + Math.round(d * 9);
      return { form: int(rng, 0, 1), r: int(rng, 1, hi), b: int(rng, 1, hi), c: int(rng, 1, hi), n: int(rng, 4, 8 + Math.round(d * 12)), k: 0 };
    },
    ({ form, r, b, c, n }) => {
      if (form === 1) { const k = Math.max(1, Math.min(n - 1, r)); return { prompt: `Ett lyckohjul har ${n} lika stora fält. ${k} av dem är röda. Chansen att få rött är ${k} av ?`, answer: n, near: [n + 1, n - 1, n - k, k + n],
        hints: ["Chansen är hur många som passar av alla som finns.", "Alla fält är lika stora. Räkna alla fält, inte bara de röda.", `Det finns ${n} fält. Svaret är ${n}.`] }; }
      const ans = r + b + c;
      return { prompt: `I en påse finns ${r} röda, ${b} blå och ${c} gula kulor. Chansen att få en gul är ${c} av ?`, answer: ans, near: [r + b, ans + 1, ans - 1, r + b + c + 2],
        hints: ["Chansen är hur många som passar av alla som finns.", "Räkna alla kulor i påsen, av alla färger.", `${r} + ${b} + ${c} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Koordinater: flytta en punkt, eller avstånd på samma rad. */
function coordTemplate(): Template {
  return procTemplate("ma.samb.koordinater.v1", "ma.samb.koordinater", REPS2,
    (rng, d) => ({ form: int(rng, 0, 2), x: int(rng, 0, 4 + Math.round(d * 8)), y: int(rng, 0, 4 + Math.round(d * 8)), dx: int(rng, 2, 3 + Math.round(d * 6)) }),
    ({ form, x, y, dx }) => {
      if (form === 2) return { prompt: `Punkterna (${x}, ${y}) och (${x + dx}, ${y}) ligger på samma rad. Hur många steg är det mellan dem?`, answer: dx, near: [x + dx, x + dx + y, dx + 1, dx - 1],
        hints: ["Punkterna har samma y-värde, så de ligger på en rad.", "Skillnaden mellan x-värdena är avståndet.", `${x + dx} − ${x} = ${dx}. Svaret är ${dx}.`] };
      const up = form === 1, ans = (up ? y : x) + dx;
      return { prompt: `En punkt är (${x}, ${y}). Den flyttas ${dx} steg åt ${up ? "upp" : "höger"}. Vilket ${up ? "y" : "x"}-värde har den då?`, answer: ans, near: [up ? x : y, ans + 1, ans - 1, x + y + dx],
        hints: [up ? "Första talet är x, det andra är y. Uppåt ändrar y-värdet." : "Första talet är x, det andra är y. Åt höger ändrar x-värdet.", "Ta det värde som ändras och lägg till stegen.", `${up ? y : x} + ${dx} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Korta berättelser i ett steg: plus, minus, gånger och delat. */
function oneStepTemplate(): Template {
  return procTemplate("ma.prob.textuppgift_ett.v1", "ma.prob.textuppgift_ett", REPS2,
    (rng, d) => {
      const hi = 5 + Math.round(d * 30);
      return { form: int(rng, 0, d < 0.3 ? 1 : 3), a: int(rng, 2, hi), b: int(rng, 2, hi), nm: int(rng, 0, NAMES.length - 1), g: int(rng, 2, 3 + Math.round(d * 6)) };
    },
    ({ form, a, b, nm, g }) => {
      const name = NAMES[nm];
      if (form === 1) { const tot = a + b; return { prompt: `${name} har ${tot} bär. ${name} äter ${b}. Hur många bär har ${name} kvar?`, answer: a, near: [tot + b, a + 1, a - 1 < 0 ? a + 2 : a - 1, b],
        hints: ["Äter betyder att det blir färre. Det är minus.", `Ta det ${name} hade från början minus det ${name} åt.`, `${tot} − ${b} = ${a}. Svaret är ${a}.`] }; }
      if (form === 2) { return { prompt: `${name} har ${g} påsar med ${b} bär i varje påse. Hur många bär är det tillsammans?`, answer: g * b, near: [g + b, g * b + b, g * b - b, g * b + 10],
        hints: ["Det är lika många i varje påse. Det är gånger.", "Gångra antalet påsar med antalet bär i varje.", `${g} × ${b} = ${g * b}. Svaret är ${g * b}.`] }; }
      if (form === 3) { const tot = g * b; return { prompt: `${name} delar ${tot} bär lika på ${g} påsar. Hur många bär blir det i varje påse?`, answer: b, near: [tot - g, b + 1, b - 1, g],
        hints: ["Lika många i varje påse. Det är delat.", "Dela alla bären med antalet påsar.", `${tot} ÷ ${g} = ${b}. Svaret är ${b}.`] }; }
      const ans = a + b;
      return { prompt: `${name} har ${a} bär. ${name} får ${b} till. Hur många bär har ${name} nu?`, answer: ans, near: [a * b, ans + 1, ans - 1, a],
        hints: ["Får till betyder att det blir fler. Det är plus.", `Lägg ihop bären ${name} hade med de ${name} fick.`, `${a} + ${b} = ${ans}. Svaret är ${ans}.`] };
    });
}

/** Tänk-på-ett-tal: logik baklänges. */
function logicTemplate(): Template {
  return procTemplate("ma.prob.logik.v1", "ma.prob.logik", REPS2,
    (rng, d) => ({ form: int(rng, 0, d < 0.3 ? 0 : 2), n: int(rng, 2, 8 + Math.round(d * 25)), a: int(rng, 2, 4 + Math.round(d * 12)) }),
    ({ form, n, a }) => {
      if (form === 1) { const c = 2 * n + a; return { prompt: `Jag tänker på ett tal. Jag dubblar det och lägger till ${a}. Då får jag ${c}. Vilket tal tänker jag på?`, answer: n, near: [c - a, c - 2 * a, n + 1, n - 1 < 0 ? n + 2 : n - 1, c / 2 | 0],
        hints: ["Gör som när du löser en gåta. Gå baklänges, ett steg i taget.", "Ta bort det som lades till först. Dela sedan med två.", `${c} − ${a} = ${c - a} och ${c - a} ÷ 2 = ${n}. Svaret är ${n}.`] }; }
      if (form === 2) { const c = n; return { prompt: `Jag tänker på ett tal. Jag tar bort ${a} och får ${c}. Vilket tal tänker jag på?`, answer: n + a, near: [n - a < 0 ? n + 2 * a : n - a, a, n + 1, n + a + 1],
        hints: ["Gå baklänges. Gör motsatsen till det som gjordes.", "Att ta bort är minus. Motsatsen är plus.", `${c} + ${a} = ${n + a}. Svaret är ${n + a}.`] }; }
      const c = n + a;
      return { prompt: `Jag tänker på ett tal. Jag lägger till ${a} och får ${c}. Vilket tal tänker jag på?`, answer: n, near: [c + a, a, n + 1, n - 1 < 0 ? n + 2 : n - 1],
        hints: ["Gå baklänges. Gör motsatsen till det som gjordes.", "Att lägga till är plus. Motsatsen är minus.", `${c} − ${a} = ${n}. Svaret är ${n}.`] };
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
  decimalTemplate(),
  decimalMulTemplate(),
  negativeTemplate(),
  fractionOfTemplate(),
  equivalentFractionTemplate(),
  perimeterTemplate(),
  areaTemplate(),
  unitTemplate(0),
  unitTemplate(1),
  timeTemplate(),
  moneyTemplate(),
  statTemplate(),
  proportionTemplate(),
  twoStepTemplate(),
  place100Template(),
  place1000Template(),
  placeBigTemplate(),
  fracCompareTemplate(),
  estimateTemplate(),
  mentalTemplate(),
  patternTemplate(),
  equalSignTemplate(),
  expressionTemplate(),
  shapeTemplate(),
  bodyTemplate(),
  symmetryTemplate(),
  lengthTemplate(),
  angleTemplate(),
  scaleTemplate(),
  clockHalfTemplate(),
  clockMinuteTemplate(),
  tableTemplate(),
  chanceTemplate(),
  coordTemplate(),
  oneStepTemplate(),
  logicTemplate(),
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
