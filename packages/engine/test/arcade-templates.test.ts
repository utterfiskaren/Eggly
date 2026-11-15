import { describe, expect, it } from "vitest";
import { ARCADE_LEVELS, ARCADE_OPS, arcadeSkills } from "@eggly/content";
import { MATH_SKILLS_WITH_TEMPLATES } from "../src";

describe("Alla spel mot motorns mallar", () => {
  it("varje färdighet på varje nivå och matteslag har en frågemall", () => {
    for (const l of ARCADE_LEVELS) for (const o of ARCADE_OPS) for (const k of arcadeSkills(l.level, o.id)) {
      expect(MATH_SKILLS_WITH_TEMPLATES, `nivå ${l.level} ${o.id}: ${k}`).toContain(k);
    }
  });
});
