import { describe, expect, it } from "vitest";
import { mathSkills, validateSkills, skillDepths } from "../src";

describe("kunskapskartan för matte", () => {
  it("har inga fel", () => {
    expect(validateSkills(mathSkills)).toEqual([]);
  });
  it("täcker alla sex områden i kursplanen", () => {
    const strands = new Set(mathSkills.map((s) => s.strand));
    expect([...strands].sort()).toEqual(
      ["algebra", "geometri", "problemlosning", "samband", "statistik", "taluppfattning"],
    );
  });
  it("har färdigheter för varje årskurs 1–6", () => {
    for (let g = 1; g <= 6; g++) {
      expect(mathSkills.some((s) => s.gradeMin <= g && s.gradeMax >= g)).toBe(true);
    }
  });
  it("upptäcker en cirkel", () => {
    const broken = mathSkills.map((s) => (s.id === "ma.add.inom10" ? { ...s, prereqs: ["ma.add.inom20_med"] } : s));
    expect(validateSkills(broken).some((e) => e.startsWith("cirkel"))).toBe(true);
  });
  it("räknar djup i kartan", () => {
    const d = skillDepths(mathSkills);
    expect(d.get("ma.tal.antal10")).toBe(0);
    expect(d.get("ma.alg.ekvation")!).toBeGreaterThan(2);
  });
});
