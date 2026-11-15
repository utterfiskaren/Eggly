import { describe, expect, it } from "vitest";
import { KIOSK_ITEMS, kioskLevel, kioskTask, krossMode, krossTile, krossValue, seededRng } from "../src";

describe("Kiosken", () => {
  it("ger ett heltal över noll på alla nivåer, och varan finns", () => {
    const ids = new Set(KIOSK_ITEMS.map((i) => i[0]));
    for (let level = 1; level <= 14; level++) {
      const rng = seededRng(level * 97);
      for (let i = 0; i < 300; i++) {
        const t = kioskTask(rng, level);
        expect(Number.isInteger(t.need), `${level}: ${t.say}`).toBe(true);
        expect(t.need, t.say).toBeGreaterThan(0);
        expect(ids.has(t.itemId)).toBe(true);
        expect(t.say.split("**").length % 2, t.say).toBe(1);
      }
    }
  });
  it("växeln stämmer med texten", () => {
    const rng = seededRng(5);
    for (let i = 0; i < 300; i++) {
      const t = kioskTask(rng, 6);
      const m = t.say.match(/kostar \*\*(\d+) kr\*\*\. Kunden ger dig (\d+) kr/);
      expect(m).not.toBeNull();
      expect(Number(m![2]) - Number(m![1])).toBe(t.need);
    }
  });
  it("nivån följer världen men stannar på 1–9", () => {
    expect(kioskLevel(0)).toBe(1);
    expect(kioskLevel(13)).toBe(9);
  });
});

describe("Talkross", () => {
  it("lägena växlar från plus till gånger", () => {
    expect(krossMode(1)).toEqual({ mul: false, k: 2, hi: 9 });
    expect(krossMode(3).k).toBe(3);
    expect(krossMode(5).mul).toBe(true);
    expect(krossMode(14)).toEqual({ mul: true, k: 3, hi: 5 });
  });
  it("rutorna håller sig inom talområdet och värdet räknas rätt", () => {
    const rng = seededRng(9);
    for (const level of [1, 3, 5, 8]) {
      const mode = krossMode(level);
      for (let i = 0; i < 200; i++) {
        const v = krossTile(rng, mode);
        expect(v).toBeGreaterThanOrEqual(mode.mul ? 2 : 1);
        expect(v).toBeLessThanOrEqual(mode.hi);
      }
    }
    expect(krossValue({ mul: false, k: 3, hi: 9 }, [2, 3, 4])).toBe(9);
    expect(krossValue({ mul: true, k: 2, hi: 9 }, [3, 4])).toBe(12);
  });
});

import { pickPartner } from "../src";

describe("Vem är störst?", () => {
  const pool = [{ answer: 10 }, { answer: 11 }, { answer: 40 }, { answer: 12 }];
  it("väljer oftast ett nära svar som inte är samma", () => {
    const rng = seededRng(1);
    let same = 0;
    for (let i = 0; i < 400; i++) {
      const at = pickPartner(rng, 10, pool, new Set());
      if (pool[at].answer === 10) same++;
      else expect([11, 12]).toContain(pool[at].answer);
    }
    expect(same / 400).toBeGreaterThan(0.05);
    expect(same / 400).toBeLessThan(0.25);
  });
  it("hoppar över upptagna platser och ger -1 när inget finns", () => {
    expect(pickPartner(() => 0.9, 10, pool, new Set([1, 3]))).toBe(2);
    expect(pickPartner(() => 0.9, 10, pool, new Set([0, 1, 2, 3]))).toBe(-1);
    expect(pickPartner(() => 0.9, 10, [{ answer: 10 }], new Set())).toBe(0);
  });
});

import { ARCADE_LEVELS, ARCADE_OPS, arcadeSkills } from "@eggly/content";
import { MATH_SKILLS_WITH_TEMPLATES } from "../src";

describe("Alla spel och mattemallarna", () => {
  it("varje färdighet på varje nivå har mallar", () => {
    const has = new Set(MATH_SKILLS_WITH_TEMPLATES);
    for (const l of ARCADE_LEVELS) for (const o of ARCADE_OPS) for (const k of arcadeSkills(l.level, o.id)) expect(has.has(k), `${l.level} ${o.id} ${k}`).toBe(true);
  });
});
