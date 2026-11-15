import { describe, expect, it } from "vitest";
import { tableProgress } from "../src";

const mul = (a: number, b: number, correct = true) => ({ skillId: "ma.mul.tabell_6_9", a, b, correct });

describe("framsteg i tabellerna", () => {
  it("räknar talen som kunnat, och 7×8 räknas för både 7:ans och 8:ans tabell", () => {
    const p = tableProgress([mul(7, 8)]);
    expect(p.find((x) => x.table === 7)!.known).toBe(1);
    expect(p.find((x) => x.table === 8)!.known).toBe(1);
    expect(p.find((x) => x.table === 6)!.known).toBe(0);
  });
  it("det senaste försöket vinner", () => {
    expect(tableProgress([mul(7, 8), mul(8, 7, false)]).find((x) => x.table === 7)!.known).toBe(0);
    expect(tableProgress([mul(7, 8, false), mul(7, 8)]).find((x) => x.table === 7)!.known).toBe(1);
  });
  it("delat räknas till samma tal: 56 ÷ 7 = 8", () => {
    const p = tableProgress([{ skillId: "ma.div.tabell", a: 56, b: 7, correct: true }]);
    expect(p.find((x) => x.table === 7)!.known).toBe(1);
    expect(p.find((x) => x.table === 8)!.known).toBe(1);
  });
  it("stjärnor: 5 → 1, 8 → 2, alla tio → 3", () => {
    const some = (n: number) => Array.from({ length: n }, (_, i) => mul(3, i + 1));
    expect(tableProgress(some(4)).find((x) => x.table === 3)!.stars).toBe(0);
    expect(tableProgress(some(5)).find((x) => x.table === 3)!.stars).toBe(1);
    expect(tableProgress(some(8)).find((x) => x.table === 3)!.stars).toBe(2);
    expect(tableProgress(some(10)).find((x) => x.table === 3)!.stars).toBe(3);
  });
  it("tal utanför tabellerna och andra färdigheter räknas inte", () => {
    const p = tableProgress([{ skillId: "ma.add.inom10", a: 3, b: 4, correct: true }, mul(12, 3), mul(0, 5)]);
    expect(p.every((x) => x.known === 0 && x.seen === 0)).toBe(true);
  });
});
