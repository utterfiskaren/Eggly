import { describe, expect, it } from "vitest";
import { ARCADE_LEVELS, HATCHABLE, MATTE_STOPS, ORIGINAL_STOP_IDS, STEPS, SPECIES, TIER_ORDER, eggSvg, eggsAvailable, hatchRoll, mathSkills, openStops, squishySvg, stopStars } from "../src";

describe("Matteöns karta", () => {
  it("varje stopp har unikt id och färdigheter som finns i kunskapskartan", () => {
    const ids = new Set(mathSkills.map((s) => s.id));
    expect(new Set(MATTE_STOPS.map((s) => s.id)).size).toBe(MATTE_STOPS.length);
    for (const s of MATTE_STOPS) for (const k of s.skills) expect(ids.has(k), `${s.id}: ${k}`).toBe(true);
  });

  it("ingen färdighet ligger i två stopp", () => {
    const all = MATTE_STOPS.flatMap((s) => s.skills);
    expect(new Set(all).size).toBe(all.length);
  });

  it("varje stopp tränas av minst ett steg, och alla färdigheter på kartan förekommer i något steg", () => {
    const inSteps = new Set(STEPS.flatMap((st) => st.skills));
    for (const st of MATTE_STOPS) for (const k of st.skills) expect(inSteps.has(k), `${st.id}: ${k}`).toBe(true);
  });

  it("Alla spels första åtta nivåer är de ursprungliga stoppen, i samma ordning", () => {
    const originals = MATTE_STOPS.filter((st) => ORIGINAL_STOP_IDS.includes(st.id));
    expect(originals.map((st) => st.id)).toEqual(ORIGINAL_STOP_IDS);
    expect(ARCADE_LEVELS.slice(0, 8).map((l) => l.name)).toEqual(originals.map((st) => st.name));
  });

  it("ett avslutat pass ger alltid minst en stjärna", () => {
    expect(stopStars(0, 0, 8)).toBe(1);
    expect(stopStars(6, 3, 8)).toBe(2);
    expect(stopStars(7, 5, 8)).toBe(3);
    expect(stopStars(8, 2, 8)).toBe(2);
  });

  it("öppnar stopp i ordning efter årskurs, stjärnor och kunskap", () => {
    expect(openStops({ grade: 1, stars: {}, skillStatus: {} })).toBe(1);
    expect(openStops({ grade: 3, stars: {}, skillStatus: {} })).toBe(6);
    expect(openStops({ grade: 1, stars: { prickstranden: 2 }, skillStatus: {} })).toBe(2);
    expect(openStops({ grade: 1, stars: { prickstranden: 1 }, skillStatus: {} })).toBe(1);
    // Stjärnor på ett stopp som inte är öppet öppnar ingenting.
    expect(openStops({ grade: 1, stars: { plusviken: 3 }, skillStatus: {} })).toBe(1);
    const knows = { "ma.tal.antal10": "secure", "ma.tal.ordning20": "mastered", "ma.tal.jamfora": "secure" };
    expect(openStops({ grade: 1, stars: {}, skillStatus: knows })).toBe(2);
    expect(openStops({ grade: 1, stars: {}, skillStatus: {}, teacherOpened: ["tiobron"] })).toBe(6);
  });
});

describe("ägg och klämmisar", () => {
  it("räknar ägg som tjänats in men inte kläckts", () => {
    expect(eggsAvailable(24, 0)).toBe(0);
    expect(eggsAvailable(25, 0)).toBe(1);
    expect(eggsAvailable(80, 2)).toBe(1);
    expect(eggsAvailable(10, 5)).toBe(0);
  });

  it("kläcker aldrig bättre än barnets nivå och föredrar nya arter", () => {
    let x = 1;
    const rnd = () => { x = (x * 48271) % 2147483647; return x / 2147483647; };
    for (let top = 0; top < 8; top++) for (let i = 0; i < 200; i++) {
      const h = hatchRoll([], top, rnd);
      expect(TIER_ORDER.indexOf(h.tier)).toBeLessThanOrEqual(top);
      expect(HATCHABLE.some((s) => s.id === h.id)).toBe(true);
    }
  });

  it("alla arter och ägg går att rita", () => {
    for (const s of SPECIES) {
      const svg = squishySvg(s.id, {});
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).not.toMatch(/undefined|NaN/);
    }
    for (let t = 0; t < TIER_ORDER.length; t++) expect(eggSvg(t, 2)).not.toMatch(/undefined|NaN/);
  });
});
