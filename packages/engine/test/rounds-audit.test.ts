import { describe, expect, it } from "vitest";
import { ARCADE_LEVELS, ARCADE_OPS, STEPS, arcadeSkills } from "@eggly/content";
import { MATH_SKILLS_WITH_TEMPLATES, newSession, planRound, seededRng, type ChildModel, type Representation } from "../src";

/** De frågetyper som spelen tillåter (som GAME_CFG i appen). undefined = alla. */
const REP_SETS: (Representation[] | undefined)[] = [
  undefined,
  ["symbol", "missing", "story", "visual"],
  ["symbol"],
  ["symbol", "story"],
  ["symbol", "missing"],
  ["symbol", "missing", "story", "choice"],
];

const child = (grade: number): ChildModel => ({ entryGrade: grade, skills: {} });

function audit(label: string, skills: string[], seed: number) {
  for (const grade of [1, 4]) for (const reps of REP_SETS) {
    const rng = seededRng(seed);
    const ctx = { now: 1_700_000_000_000, rng, available: MATH_SKILLS_WITH_TEMPLATES, representations: reps };
    const plan = planRound(child(grade), newSession(`audit-${label}`, "aventyr", { skills, source: "child_choice" }), 12, ctx);
    expect(plan).toHaveLength(12);
    for (const p of plan) {
      const q = p.question, tag = `${label} [${reps?.join(",") ?? "alla"}] ${q.prompt}`;
      expect(p.reason, tag).not.toBe("fallback");
      expect(q.prompt.length, tag).toBeGreaterThan(0);
      expect(Number.isFinite(q.answer), tag).toBe(true);
      if (reps && !reps.includes("visual")) expect(q.visual, `bild i spel utan bilder: ${tag}`).toBeUndefined();
      if (q.input === "choice") {
        expect(new Set(q.choices).size, tag).toBe(q.choices!.length);
        expect(q.choices!.filter((c) => c === q.answer), tag).toHaveLength(1);
      }
    }
  }
}

describe("granskning av alla omgångar", () => {
  it("varje steg på kartan ger riktiga frågor i alla spel", () => {
    // Stegen delar färdigheter per stopp, så det räcker med en per unik färdighetslista.
    const seen = new Set<string>();
    for (const s of STEPS) {
      const key = s.skills.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      audit(`steg ${s.id}`, s.skills, s.index + 1);
    }
    expect(seen.size).toBeGreaterThanOrEqual(14);
  });

  it("varje nivå och matteslag i Alla spel ger riktiga frågor i alla spel", () => {
    for (const l of ARCADE_LEVELS) for (const o of ARCADE_OPS) {
      const skills = arcadeSkills(l.level, o.id);
      if (skills.length) audit(`nivå ${l.level} ${o.id}`, skills, l.level * 7);
    }
  });
});
