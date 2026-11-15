import { describe, expect, it } from "vitest";
import { cleanPracticeSpec, practicePlan, seededRng } from "../src";

describe("Öva", () => {
  it("tabeller: varje uppgift hör till en vald tabell, och de är olika", () => {
    const plan = practicePlan(seededRng(1), { kind: "tables", tables: [7] }, 10);
    expect(plan).toHaveLength(10);
    const prompts = new Set(plan.map((p) => p.question.prompt));
    expect(prompts.size).toBe(10);
    for (const p of plan) {
      const nums = (p.question.factKey ?? "").split("×").map(Number);
      expect(nums.includes(7), p.question.prompt).toBe(true);
    }
  });
  it("plus och minus upp till 10 håller sig inom 10", () => {
    for (const kind of ["add", "sub"] as const) {
      for (const p of practicePlan(seededRng(2), { kind, max: 10 }, 8)) {
        const nums = (p.question.prompt.match(/\d+/g) ?? []).map(Number);
        expect(Math.max(...nums), p.question.prompt).toBeLessThanOrEqual(10);
      }
    }
  });
  it("blandat ger bara valda räknesätt", () => {
    const plan = practicePlan(seededRng(3), { kind: "mix", ops: ["mul"] }, 12);
    for (const p of plan) expect(p.question.skillId.startsWith("ma.mul"), p.question.skillId).toBe(true);
  });
  it("rensar val utifrån", () => {
    expect(cleanPracticeSpec({ kind: "tables", tables: [1, 7, 7, 99, "x", 10] })).toEqual({ kind: "tables", tables: [7, 10] });
    expect(cleanPracticeSpec({ kind: "tables", tables: [] })).toBeNull();
    expect(cleanPracticeSpec({ kind: "add", max: 50 })).toBeNull();
    expect(cleanPracticeSpec({ kind: "add", max: 100 })).toEqual({ kind: "add", max: 100 });
    expect(cleanPracticeSpec({ kind: "mix", ops: ["add", "pow"] })).toEqual({ kind: "mix", ops: ["add"] });
    expect(cleanPracticeSpec(null)).toBeNull();
  });
});
