import { describe, expect, it } from "vitest";
import { STEPS, openUpTo, mathSkills } from "../src";

describe("Matteöns 300 steg", () => {
  it("har 300 steg med unika id:n, en boss sist i varje värld", () => {
    expect(STEPS).toHaveLength(300);
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(300);
    expect(STEPS.filter((s) => s.boss)).toHaveLength(14);
    expect(STEPS[3].id).toBe("b1"); // som i Eggly 1
  });
  it("tränar bara färdigheter som finns", () => {
    const ids = new Set(mathSkills.map((s) => s.id));
    for (const s of STEPS) for (const k of s.skills) expect(ids.has(k)).toBe(true);
  });
  it("öppnar stegen i ordning", () => {
    expect(openUpTo({})).toBe(0);
    expect(openUpTo({ [STEPS[0].id]: 3 })).toBe(1);
    expect(openUpTo({ [STEPS[124].id]: 2 })).toBe(125);
  });
});
