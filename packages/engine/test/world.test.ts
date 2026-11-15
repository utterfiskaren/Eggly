import { describe, expect, it } from "vitest";
import { ARCADE_LEVELS, MATTE_STOPS, arcadeSkills } from "@eggly/content";
import { MATH_SKILLS_WITH_TEMPLATES } from "../src";

describe("kartan och mallarna hänger ihop", () => {
  it("varje färdighet med mallar finns på kartan eller i Alla spel", () => {
    const onMap = new Set([...MATTE_STOPS.flatMap((s) => s.skills), ...ARCADE_LEVELS.flatMap((l) => arcadeSkills(l.level, "mix"))]);
    for (const id of MATH_SKILLS_WITH_TEMPLATES) expect(onMap.has(id), id).toBe(true);
  });
  it("varje stopp har mallar för alla sina färdigheter", () => {
    const has = new Set(MATH_SKILLS_WITH_TEMPLATES);
    for (const s of MATTE_STOPS) for (const k of s.skills) expect(has.has(k), `${s.id}: ${k}`).toBe(true);
  });
});
