import { describe, expect, it } from "vitest";
import { ARCADE_LEVELS, ARCADE_OPS, TIER_ORDER, arcadeEggTier, arcadeLives, arcadeOps, arcadeSkills, mathSkills } from "../src";

describe("Alla spel", () => {
  it("har en nivå per kartstopp plus de för åk 4–6, och Blandat finns på alla", () => {
    expect(ARCADE_LEVELS).toHaveLength(20);
    for (const l of ARCADE_LEVELS) {
      expect(arcadeOps(l.level)).toContain("mix");
      expect(arcadeSkills(l.level, "mix").length).toBeGreaterThan(0);
    }
  });
  it("matteslagen ger bara färdigheter av rätt slag, och de finns", () => {
    const ids = new Set(mathSkills.map((s) => s.id));
    for (const l of ARCADE_LEVELS) for (const o of ARCADE_OPS) {
      for (const k of arcadeSkills(l.level, o.id)) {
        expect(ids.has(k), k).toBe(true);
        expect(k.startsWith(o.prefix), `${l.level} ${o.id} ${k}`).toBe(true);
      }
    }
  });
  it("matteslag dyker upp när de hör hemma: plus först, gånger senare", () => {
    expect(arcadeOps(1)).toEqual(["mix"]);
    expect(arcadeOps(2)).toEqual(["mix", "add", "sub"]);
    expect(arcadeOps(6)).toContain("mul");
    expect(arcadeOps(8)).toContain("div");
    expect(arcadeOps(10)).toContain("mul");
    expect(arcadeOps(11)).toContain("div");
  });
  it("ägget blir bättre med nivå och tempo, men utan klocka högst plats 6", () => {
    const rank = (t: number) => TIER_ORDER.indexOf(t);
    expect(rank(arcadeEggTier(1, 0))).toBe(0);
    expect(rank(arcadeEggTier(8, 0))).toBeLessThanOrEqual(5);
    expect(rank(arcadeEggTier(8, 4))).toBeGreaterThan(rank(arcadeEggTier(8, 1)));
    expect(rank(arcadeEggTier(3, 2))).toBeGreaterThan(rank(arcadeEggTier(3, 1)));
    for (let l = 1; l <= 8; l++) for (let t = 0; t <= 4; t++) expect(TIER_ORDER).toContain(arcadeEggTier(l, t));
  });
  it("hjärtan minskar med nivån", () => {
    expect(arcadeLives(1)).toBe(5);
    expect(arcadeLives(8)).toBe(2);
    for (const l of ARCADE_LEVELS) expect(arcadeLives(l.level)).toBeGreaterThanOrEqual(2);
  });
});
