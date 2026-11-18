import { describe, expect, it } from "vitest";
import { englishSkills, languageSkills, swedishSkills, validateSkills } from "../src";

describe("kunskapskartorna för svenska och engelska", () => {
  it("har inga fel", () => {
    expect(validateSkills(languageSkills)).toEqual([]);
  });
  it("har rätt ämne och prefix", () => {
    for (const sk of swedishSkills) { expect(sk.subject).toBe("svenska"); expect(sk.id.startsWith("sv.")).toBe(true); }
    for (const sk of englishSkills) { expect(sk.subject).toBe("engelska"); expect(sk.id.startsWith("en.")).toBe(true); }
  });
  it("har bara förkunskaper i samma ämne", () => {
    const ids = new Set(languageSkills.map((s) => s.id));
    for (const sk of languageSkills) for (const p of sk.prereqs) expect(ids.has(p)).toBe(true);
  });
});
