import { describe, expect, it } from "vitest";
import { MATTE_STOPS } from "@eggly/content";
import { MATH_SKILLS_WITH_TEMPLATES } from "../src";

describe("kartan och mallarna hänger ihop", () => {
  it("varje färdighet med mallar har ett stopp på kartan", () => {
    const onMap = new Set(MATTE_STOPS.flatMap((s) => s.skills));
    for (const id of MATH_SKILLS_WITH_TEMPLATES) expect(onMap.has(id), id).toBe(true);
  });
  it("varje stopp har mallar för alla sina färdigheter", () => {
    const has = new Set(MATH_SKILLS_WITH_TEMPLATES);
    for (const s of MATTE_STOPS) for (const k of s.skills) expect(has.has(k), `${s.id}: ${k}`).toBe(true);
  });
});
