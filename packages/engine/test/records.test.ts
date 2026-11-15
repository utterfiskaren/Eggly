import { describe, expect, it } from "vitest";
import { gameRecords, parseArcadeActivity } from "../src";

const rows = (sessionId: string, activity: string, correct: boolean[]) => correct.map((c) => ({ sessionId, activity, correct: c }));

describe("egna rekord", () => {
  it("läser aktiviteten, även äldre utan nivå och tempo", () => {
    expect(parseArcadeActivity("fritt:bubbel:4:2")).toEqual({ game: "bubbel", level: 4, tempo: 2 });
    expect(parseArcadeActivity("fritt:sant")).toEqual({ game: "sant", level: undefined, tempo: undefined });
    expect(parseArcadeActivity("steg:n0_0")).toBeNull();
    expect(parseArcadeActivity("ova")).toBeNull();
  });

  it("tar flest rätt på en omgång per spel och räknar omgångarna", () => {
    const r = gameRecords([
      ...rows("a", "fritt:bubbel:2:1", [true, true, false]),
      ...rows("b", "fritt:bubbel:5:3", [true, true, true, true, false]),
      ...rows("c", "fritt:bubbel:1:0", [true]),
      ...rows("d", "fritt:sant:3:2", [true, true]),
      ...rows("e", "steg:n0_0", [true, true, true, true, true, true]),
      ...rows("f", "ova", [true, true, true]),
    ]);
    expect(r).toEqual([
      { game: "bubbel", best: 4, level: 5, tempo: 3, rounds: 3 },
      { game: "sant", best: 2, level: 3, tempo: 2, rounds: 1 },
    ]);
  });

  it("vid lika rekord gäller den högre nivån, och omgångar utan rätt ger inget rekord", () => {
    const r = gameRecords([
      ...rows("a", "fritt:rakna:2:1", [true, true]),
      ...rows("b", "fritt:rakna:7:1", [true, true]),
      ...rows("c", "fritt:minne:1:1", [false, false]),
    ]);
    expect(r).toEqual([{ game: "rakna", best: 2, level: 7, tempo: 1, rounds: 2 }]);
  });
});
