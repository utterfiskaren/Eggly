import { describe, expect, it } from "vitest";
import { TIERS, TIER_ORDER, WORLD_BOSSES, bossSvg, squishyStats, tierBase } from "../src";

describe("Bossar och krafter", () => {
  it("varje värld har en boss som ritas", () => {
    expect(WORLD_BOSSES).toHaveLength(14);
    for (let t = 0; t < TIERS.length; t++) {
      const svg = bossSvg(t);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.length).toBeGreaterThan(500);
    }
  });
  it("grundstyrkan växer med världens plats", () => {
    const base = TIER_ORDER.map((t) => tierBase(t));
    for (let i = 1; i < base.length; i++) expect(base[i]).toBeGreaterThan(base[i - 1]);
    expect(base[0]).toBe(10);
    expect(base[13]).toBe(246);
  });
  it("krafterna är stabila för samma frö, och kläder ger bonus", () => {
    const a = squishyStats("mochi", 12345, {});
    const b = squishyStats("mochi", 12345, {});
    expect(a).toEqual(b);
    expect(a.kraft).toBe(a.mj + a.st + a.gl + a.kl);
    const dressed = squishyStats("mochi", 12345, { clothes: "guldrock" });
    expect(dressed.kraft).toBeGreaterThanOrEqual(a.kraft);
  });
});
