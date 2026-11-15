import { describe, expect, it } from "vitest";
import { MATTE_STOPS, SQUISHIES, eggsAvailable, hatchPick, mathSkills, openStops, stopStars } from "../src";

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

  it("ett avslutat pass ger alltid minst en stjärna", () => {
    expect(stopStars(0, 0, 8)).toBe(1);
    expect(stopStars(6, 3, 8)).toBe(2);
    expect(stopStars(7, 5, 8)).toBe(3);
    expect(stopStars(8, 2, 8)).toBe(2);
  });

  it("öppnar stopp i ordning efter årskurs, stjärnor och kunskap", () => {
    expect(openStops({ grade: 1, stars: {}, skillStatus: {} })).toBe(1);
    expect(openStops({ grade: 3, stars: {}, skillStatus: {} })).toBe(5);
    expect(openStops({ grade: 1, stars: { prickstranden: 2 }, skillStatus: {} })).toBe(2);
    expect(openStops({ grade: 1, stars: { prickstranden: 1 }, skillStatus: {} })).toBe(1);
    // Stjärnor på ett stopp som inte är öppet öppnar ingenting.
    expect(openStops({ grade: 1, stars: { plusviken: 3 }, skillStatus: {} })).toBe(1);
    const knows = { "ma.tal.antal10": "secure", "ma.tal.ordning20": "mastered", "ma.tal.jamfora": "secure" };
    expect(openStops({ grade: 1, stars: {}, skillStatus: knows })).toBe(2);
    expect(openStops({ grade: 1, stars: {}, skillStatus: {}, teacherOpened: ["tiobron"] })).toBe(5);
  });
});

describe("ägg och klämmisar", () => {
  it("räknar ägg som tjänats in men inte kläckts", () => {
    expect(eggsAvailable(24, 0)).toBe(0);
    expect(eggsAvailable(25, 0)).toBe(1);
    expect(eggsAvailable(80, 2)).toBe(1);
    expect(eggsAvailable(10, 5)).toBe(0);
  });

  it("ger ingen dubblett förrän samlingen är komplett", () => {
    const owned: string[] = [];
    for (let i = 0; i < SQUISHIES.length; i++) owned.push(hatchPick(owned, (i * 0.37) % 1).id);
    expect(new Set(owned).size).toBe(SQUISHIES.length);
    expect(SQUISHIES.map((s) => s.id)).toContain(hatchPick(owned, 0.5).id);
  });

  it("klämmisarna har unika id", () => {
    expect(new Set(SQUISHIES.map((s) => s.id)).size).toBe(SQUISHIES.length);
  });
});
