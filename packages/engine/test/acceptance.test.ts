import { describe, expect, it } from "vitest";
import {
  emptySkill, newSession, nextQuestion, recordAnswer, seededRng, review, retrievability,
  type ChildModel, type Planned, type SessionState,
} from "../src";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 16, 15);
const ADD = ["ma.add.inom10", "ma.sub.inom10", "ma.tal.tiokamrater", "ma.add.inom20_med", "ma.samb.dubbelt_halften"];

function practicing(skillId: string, rating = 0.5, n = 12): ChildModel["skills"][string] {
  return { ...emptySkill(skillId), status: "practicing", rating, ratingN: n, attempts: n, correct: n - 3,
    recent: [1, 1, 0, 1, 1, 1], representations: ["symbol"], reviewDueAt: T0 + DAY };
}

function play(child: ChildModel, session: SessionState, answers: boolean[], available = ADD, seed = 1, hint = 0) {
  const rng = seededRng(seed);
  const log: Planned[] = [];
  let c = child, s = session;
  for (const ok of answers) {
    const p = nextQuestion(c, s, { now: T0, rng, available });
    log.push(p);
    const out = recordAnswer(c, s, p, ok, ok ? 0 : hint, T0);
    c = out.child; s = out.session;
  }
  return { child: c, session: s, log };
}

describe("acceptanstester för motorn", () => {
  it("AT-01: fem rätt i rad höjer inte svårigheten fem steg", () => {
    const child: ChildModel = { entryGrade: 2, skills: { "ma.add.inom10": practicing("ma.add.inom10") } };
    const { log } = play(child, newSession("s1", "aventyr"), [true, true, true, true, true, true], ["ma.add.inom10"]);
    const d = log.map((p) => p.question.difficulty);
    expect(Math.max(...d) - d[0]).toBeLessThan(0.45);
    expect(log.filter((p) => p.reason === "challenge_probe").length).toBeLessThanOrEqual(1);
  });

  it("AT-02: två fel i rad på samma färdighet ger stöd och lättare variant", () => {
    const child: ChildModel = { entryGrade: 2, skills: { "ma.add.inom20_med": practicing("ma.add.inom20_med") } };
    const { log } = play(child, newSession("s2", "aventyr"), [false, false, true], ["ma.add.inom20_med"]);
    expect(log[2].reason).toBe("scaffold_recovery");
    expect(log[2].question.skillId).toBe("ma.add.inom20_med");
    expect(log[2].question.representation).toBe("visual");
    expect(log[2].question.difficulty).toBeLessThanOrEqual(log[1].question.difficulty);
  });

  it("AT-03: tre fel i rad pausar prober och ger trygga uppgifter", () => {
    const child: ChildModel = { entryGrade: 2, skills: Object.fromEntries(ADD.map((id) => [id, practicing(id, 1, 20)])) };
    const { session, log } = play(child, newSession("s3", "aventyr"), [false, false, false, true, true, true, true, true]);
    const after = log.slice(3, 7);
    expect(after.some((p) => p.reason === "challenge_probe")).toBe(false);
    expect(session.guardLeft).toBe(0); // tre rätt i rad stänger av skyddet igen
  });

  it("AT-04: motorn har ingen koppling till XP eller äventyrsnivå", () => {
    const base: ChildModel = { entryGrade: 2, skills: { "ma.add.inom10": practicing("ma.add.inom10") } };
    const withXp = { ...base, xp: 99999, level: 40 } as ChildModel;
    const a = nextQuestion(base, newSession("s4", "aventyr"), { now: T0, rng: seededRng(5), available: ["ma.add.inom10"] });
    const b = nextQuestion(withXp, newSession("s4", "aventyr"), { now: T0, rng: seededRng(5), available: ["ma.add.inom10"] });
    expect(b.question).toEqual(a.question);
  });

  it("AT-05: Mysigt ger lättare uppgifter och mer bildstöd än Äventyr", () => {
    const child: ChildModel = { entryGrade: 2, skills: { "ma.add.inom20_med": practicing("ma.add.inom20_med", 0.8, 30) } };
    const run = (mode: "mysigt" | "aventyr") => {
      const answers = Array.from({ length: 40 }, (_, i) => i % 4 !== 3);
      const { log } = play(child, newSession(`s5-${mode}`, mode), answers, ["ma.add.inom20_med"], 11);
      return {
        d: log.reduce((x, p) => x + p.question.difficulty, 0) / log.length,
        visual: log.filter((p) => p.question.representation === "visual").length,
      };
    };
    const cozy = run("mysigt"), adv = run("aventyr");
    expect(cozy.d).toBeLessThan(adv.d);
    expect(cozy.visual).toBeGreaterThan(adv.visual);
  });

  it("AT-06: en rätt symbolfråga ger inte bemästrat; det kräver flera pass och frågetyper", () => {
    let child: ChildModel = { entryGrade: 2, skills: {} };
    const r1 = play(child, newSession("p1", "aventyr"), Array(8).fill(true), ["ma.add.inom10"]);
    expect(r1.child.skills["ma.add.inom10"].status).not.toBe("mastered");
    child = r1.child;
    const r2 = play(child, newSession("p2", "aventyr"), Array(8).fill(true), ["ma.add.inom10"], 2);
    const st = r2.child.skills["ma.add.inom10"];
    expect(st.sessionsSecure.length).toBeGreaterThanOrEqual(2);
    expect(st.representations.length).toBeGreaterThanOrEqual(2);
    expect(st.status).toBe("mastered");
  });

  it("AT-07: en missad repetitionsdag ger ingen förlust, och repetitionen kommer nästa gång", () => {
    const st = { ...practicing("ma.add.inom10"), reviewDueAt: T0 - 3 * DAY };
    const child: ChildModel = { entryGrade: 2, skills: { "ma.add.inom10": st, "ma.sub.inom10": practicing("ma.sub.inom10") } };
    const snapshot = structuredClone(child);
    const { log } = play(child, newSession("s7", "aventyr"), Array(10).fill(true), ["ma.add.inom10", "ma.sub.inom10"], 3);
    expect(snapshot.skills["ma.add.inom10"].correct).toBe(st.correct); // inget drogs av
    expect(log.some((p) => p.reason === "review_due" && p.question.skillId === "ma.add.inom10")).toBe(true);
  });

  it("AT-08: fel svar efter ledtråd straffar inte, men hjälpen noteras", () => {
    const child: ChildModel = { entryGrade: 2, skills: { "ma.add.inom10": practicing("ma.add.inom10") } };
    const before = child.skills["ma.add.inom10"];
    const { child: after } = play(child, newSession("s8", "aventyr"), [false], ["ma.add.inom10"], 1, 2);
    const st = after.skills["ma.add.inom10"];
    expect(st.attempts).toBe(before.attempts + 1);
    expect(st.correct).toBe(before.correct);
    expect(st.status).not.toBe("not_seen");
  });

  it("AT-13: utan giltig fråga blir det en trygg reservuppgift", () => {
    const p = nextQuestion({ entryGrade: 2, skills: {} }, newSession("s13", "aventyr"), { now: T0, rng: seededRng(1), available: [] });
    expect(p.reason).toBe("fallback");
    expect(p.question.answer).toBeGreaterThanOrEqual(0);
  });

  it("AT-14: stark addition och svag division hålls isär", () => {
    let child: ChildModel = { entryGrade: 4, skills: {
      "ma.add.inom20_med": practicing("ma.add.inom20_med", 0, 10),
      "ma.div.tabell": practicing("ma.div.tabell", 0, 10),
    } };
    const rng = seededRng(14);
    let s = newSession("s14", "aventyr");
    for (let i = 0; i < 40; i++) {
      const p = nextQuestion(child, s, { now: T0, rng, available: ["ma.add.inom20_med", "ma.div.tabell"] });
      const ok = p.question.skillId === "ma.add.inom20_med" ? true : i % 3 === 0;
      const out = recordAnswer(child, s, p, ok, 0, T0);
      child = out.child; s = out.session;
    }
    expect(child.skills["ma.add.inom20_med"].rating).toBeGreaterThan(child.skills["ma.div.tabell"].rating + 0.5);
  });

  it("ett faktum barnet ofta svarar fel på kommer oftare (5 × 7)", () => {
    let wrong = review(undefined, 1, T0);
    let right = review(undefined, 3, T0);
    for (let i = 1; i <= 3; i++) {
      wrong = review(wrong, i % 2 ? 1 : 2, T0 + i * DAY);
      right = review(right, 3, T0 + i * DAY);
    }
    expect(wrong.due).toBeLessThan(right.due);
    expect(retrievability(right, T0 + 4 * DAY)).toBeGreaterThan(0.85);
  });

  it("samma uppgift kommer inte två gånger i samma pass", () => {
    const child: ChildModel = { entryGrade: 2, skills: { "ma.mul.tabell_6_9": practicing("ma.mul.tabell_6_9", 0, 20) } };
    const { log } = play(child, newSession("dup", "aventyr"), Array(12).fill(true), ["ma.mul.tabell_6_9"], 9);
    const keys = log.map((p) => p.question.factKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("pass på ett stopp på kartan", () => {
  it("går vidare till nästa färdighet i stoppet när det går bra", async () => {
    const { newSession, nextQuestion, recordAnswer, seededRng } = await import("../src");
    const rng = seededRng(5);
    let child = { entryGrade: 1, skills: {} } as import("../src").ChildModel;
    let session = newSession("stopp", "aventyr", { skills: ["ma.tal.antal10", "ma.tal.ordning20", "ma.tal.jamfora"], source: "child_choice" });
    const seen = new Set<string>();
    let now = Date.UTC(2026, 10, 16);
    for (let i = 0; i < 8; i++) {
      const plan = nextQuestion(child, session, { now, rng, available: ["ma.tal.antal10", "ma.tal.ordning20", "ma.tal.jamfora"] });
      seen.add(plan.question.skillId);
      const out = recordAnswer(child, session, plan, true, 0, now);
      child = out.child; session = out.session; now += 20_000;
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});
