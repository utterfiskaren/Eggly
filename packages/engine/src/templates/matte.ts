import type { Question, Representation, Template } from "../question";
import { int, pick, shuffle } from "../rng";

/**
 * Frågemallar för matte, version 1. Varje mall räknar ut facit själv: inga svar skrivs för hand och
 * inget genereras fritt av AI. Svårigheten 0–1 väljer bland talen, från lätt till svårt.
 */

const NAMES = ["Mochi", "Pudding", "Bubbel", "Kanelbulle", "Dimma", "Plopp", "Tuss", "Mango"] as const;
const THINGS = [
  ["bär", "bär"], ["kulor", "kulor"], ["stjärnor", "stjärnor"], ["ägg", "ägg"], ["knappar", "knappar"],
] as const;

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
  const [thing] = pick(rng, THINGS);
  switch (f.op) {
    case "+": return `${name} har ${f.a} ${thing} och hittar ${f.b} till. Hur många ${thing} har ${name} nu?`;
    case "−": return `${name} har ${f.a} ${thing} och ger bort ${f.b}. Hur många ${thing} har ${name} kvar?`;
    case "×": return `${f.a} klämmisar har ${f.b} ${thing} var. Hur många ${thing} är det tillsammans?`;
    case "÷": return `${name} delar ${f.a} ${thing} lika mellan ${f.b} kompisar. Hur många får var och en?`;
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
];

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
