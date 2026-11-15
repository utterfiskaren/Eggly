import type { Planned } from "./session";
import type { Question, Template } from "./question";
import { mathTemplates } from "./templates/matte";
import { pick } from "./rng";

/**
 * Öva: barnet väljer själv vad som ska tränas. Tabeller (2–10), plus eller minus upp till 10, 20 eller 100,
 * eller en blandning. Uppgifterna kommer från samma mallar som resten av spelet, så rätt facit och
 * ledtrådar följer med, men ingen motor väljer svårighet: det är barnets val.
 */
export type PracticeSpec =
  | { kind: "tables"; tables: number[] }
  | { kind: "add"; max: 10 | 20 | 100 }
  | { kind: "sub"; max: 10 | 20 | 100 }
  | { kind: "mix"; ops: ("add" | "sub" | "mul")[] };

const byId = (id: string) => mathTemplates.find((t) => t.id === id) as Template;
const MUL_TEMPLATES = ["ma.mul.tabell_2_5_10.v1", "ma.mul.tabell_3_4.v1", "ma.mul.tabell_6_9.v1"].map(byId);
const ADD_BY_MAX = { 10: ["ma.add.inom10.v1"], 20: ["ma.add.inom10.v1", "ma.add.inom20_utan.v1", "ma.add.inom20_med.v1"], 100: ["ma.add.inom20_med.v1", "ma.add.tvasiffrigt.v1"] };
const SUB_BY_MAX = { 10: ["ma.sub.inom10.v1"], 20: ["ma.sub.inom10.v1", "ma.sub.inom20_utan.v1", "ma.sub.inom20_med.v1"], 100: ["ma.sub.inom20_med.v1", "ma.sub.tvasiffrigt.v1"] };

/** Alla gånger-fakta (som «7×8») med mallen som äger dem. */
function mulFacts(tables: number[]): { key: string; t: Template }[] {
  const out = new Map<string, Template>();
  for (const t of MUL_TEMPLATES) for (const key of t.facts?.() ?? []) {
    const [a, b] = key.split("×").map(Number);
    if (tables.includes(a) || tables.includes(b)) out.set(key, t);
  }
  return [...out].map(([key, t]) => ({ key, t }));
}

const REPS = ["symbol", "symbol", "missing", "choice"] as const;

function asPlanned(q: Question): Planned {
  return { question: q, reason: "child_choice", itemRating: 0 };
}

function fromTemplates(rng: () => number, ids: string[]): Planned {
  const t = byId(pick(rng, ids));
  const reps = REPS.filter((r) => t.representations.includes(r));
  return asPlanned(t.generate(rng, rng(), pick(rng, reps.length ? reps : t.representations)));
}

/** Gör `n` olika uppgifter för valet. Ger färre om valet inte räcker till (t.ex. plus upp till 10). */
export function practicePlan(rng: () => number, spec: PracticeSpec, n: number): Planned[] {
  const out: Planned[] = [];
  const seen = new Set<string>();
  const add = (p: Planned) => { if (seen.has(p.question.prompt)) return false; seen.add(p.question.prompt); out.push(p); return true; };
  const mulOne = (tables: number[]) => {
    const facts = mulFacts(tables);
    if (!facts.length) return null;
    const f = pick(rng, facts);
    const reps = REPS.filter((r) => f.t.representations.includes(r));
    return asPlanned(f.t.generate(rng, rng(), pick(rng, reps), f.key));
  };
  for (let tries = 0; out.length < n && tries < n * 30; tries++) {
    let p: Planned | null = null;
    if (spec.kind === "tables") p = mulOne(spec.tables);
    else if (spec.kind === "add") p = fromTemplates(rng, ADD_BY_MAX[spec.max]);
    else if (spec.kind === "sub") p = fromTemplates(rng, SUB_BY_MAX[spec.max]);
    else {
      const op = pick(rng, spec.ops.length ? spec.ops : ["add" as const]);
      p = op === "mul" ? mulOne([2, 3, 4, 5, 6, 7, 8, 9, 10]) : fromTemplates(rng, op === "add" ? ADD_BY_MAX[20].concat(["ma.add.tvasiffrigt.v1"]) : SUB_BY_MAX[20].concat(["ma.sub.tvasiffrigt.v1"]));
    }
    if (p) add(p);
  }
  return out;
}

/** Rensar ett val som kommer utifrån: okända värden blir null. */
export function cleanPracticeSpec(raw: unknown): PracticeSpec | null {
  const r = raw as { kind?: string; tables?: unknown; max?: unknown; ops?: unknown } | null;
  if (!r || typeof r !== "object") return null;
  if (r.kind === "tables") {
    const t = [...new Set((Array.isArray(r.tables) ? r.tables : []).map(Number).filter((x) => Number.isInteger(x) && x >= 2 && x <= 10))].slice(0, 9);
    return t.length ? { kind: "tables", tables: t } : null;
  }
  if (r.kind === "add" || r.kind === "sub") return [10, 20, 100].includes(Number(r.max)) ? { kind: r.kind, max: Number(r.max) as 10 | 20 | 100 } : null;
  if (r.kind === "mix") {
    const ops = [...new Set((Array.isArray(r.ops) ? r.ops : []).filter((o): o is "add" | "sub" | "mul" => o === "add" || o === "sub" || o === "mul"))];
    return ops.length ? { kind: "mix", ops } : null;
  }
  return null;
}

