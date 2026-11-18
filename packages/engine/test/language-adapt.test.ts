import { describe, expect, it } from "vitest";
import { emptySkill, languageTemplates, newSession, recordAnswer, seededRng, textToPlanned, type ChildModel } from "../src";

describe("språkuppgifter i motorn", () => {
  it("uppdaterar färdighetens modell när svar registreras", () => {
    const t = languageTemplates.find((x) => x.skillId === "en.ord.djur")!;
    const rng = seededRng(11);
    let child: ChildModel = { entryGrade: 3, skills: {} };
    let session = newSession("s1", "aventyr");
    for (let i = 0; i < 8; i++) {
      const q = t.generate(rng, 0.5);
      const prev = child.skills[q.skillId] ?? emptySkill(q.skillId);
      const out = recordAnswer(child, session, textToPlanned(q), true, 0, 1_000_000 + i);
      child = out.child; session = out.session;
      expect(child.skills[q.skillId].attempts).toBe(prev.attempts + 1);
    }
    const sk = child.skills["en.ord.djur"];
    expect(sk.correct).toBe(8);
    expect(sk.rating).toBeGreaterThan(0);
    expect(sk.status).not.toBe("not_seen");
    // Faktumen (uppgiftens nyckel) följs av minnesmodellen.
    expect(Object.keys(sk.cards).length).toBeGreaterThan(0);
  });

  it("sänker skattningen vid fel svar", () => {
    const t = languageTemplates.find((x) => x.skillId === "sv.gram.plural")!;
    const rng = seededRng(3);
    let child: ChildModel = { entryGrade: 3, skills: {} };
    const session = newSession("s2", "aventyr");
    for (let i = 0; i < 6; i++) child = recordAnswer(child, session, textToPlanned(t.generate(rng, 0.5)), false, 0, 2_000_000 + i).child;
    expect(child.skills["sv.gram.plural"].rating).toBeLessThan(0);
  });
});
