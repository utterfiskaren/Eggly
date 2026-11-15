import { describe, expect, it } from "vitest";
import { difficultyForTarget, pCorrect, updateElo } from "../src";

describe("Elo", () => {
  it("lika förmåga och svårighet ger 50 %", () => {
    expect(pCorrect(0, 0)).toBeCloseTo(0.5);
  });
  it("målsvårigheten ger rätt sannolikhet", () => {
    expect(pCorrect(1.2, difficultyForTarget(1.2, 0.75))).toBeCloseTo(0.75);
  });
  it("rätt svar höjer förmågan, fel sänker", () => {
    expect(updateElo(0, 0, 0, 0, true).theta).toBeGreaterThan(0);
    expect(updateElo(0, 0, 0, 0, false).theta).toBeLessThan(0);
  });
  it("rätt med ledtråd höjer mindre än rätt utan", () => {
    expect(updateElo(0, 5, 0, 5, true, 2).theta).toBeLessThan(updateElo(0, 5, 0, 5, true, 0).theta);
  });
  it("fem rätt i rad ger ingen stor språngökning (jfr AT-01)", () => {
    let theta = 0, n = 20;
    for (let i = 0; i < 5; i++) { theta = updateElo(theta, n, difficultyForTarget(theta), 50, true).theta; n++; }
    expect(theta).toBeLessThan(0.5);
  });
});
