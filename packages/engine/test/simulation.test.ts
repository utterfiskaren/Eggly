import { describe, expect, it } from "vitest";
import { newSession, nextQuestion, recordAnswer, seededRng, type ChildModel, type Mode } from "../src";

/**
 * Simulerade elever med olika förmåga. Varje elev har en "sann" förmåga per färdighet som motorn
 * inte känner till, och lär sig lite av varje uppgift. Frågan: får eleverna lagom svåra uppgifter?
 *
 * Mått:
 *  - tooHard: andel uppgifter där eleven hade under 50 % chans att klara den.
 *  - streak4: andel elever som någon gång fick fyra för svåra uppgifter i rad, trots att lättare fanns.
 *  - floor: andel uppgifter som var för svåra fast de redan var de lättaste. Det är innehållets golv,
 *    inte motorns fel: de svagaste eleverna behöver färdigheter före addition inom 10 (antal, ordning).
 *  - meanP: genomsnittlig chans att klara uppgiften (målet är omkring 0,75–0,85).
 */

const SKILLS = [
  "ma.add.inom10", "ma.sub.inom10", "ma.tal.tiokamrater", "ma.add.inom20_utan", "ma.add.inom20_med",
  "ma.sub.inom20_utan", "ma.sub.inom20_med", "ma.samb.dubbelt_halften", "ma.mul.grupper", "ma.mul.tabell_2_5_10",
  "ma.mul.tabell_3_4", "ma.div.likadelning", "ma.alg.saknat_tal", "ma.tal.jamfora", "ma.tal.antal10", "ma.tal.ordning20",
];
const STUDENTS = 10_000;
const SESSIONS = 5;
const ITEMS = 10;
const DAY = 86_400_000;

function normal(rng: () => number): number {
  const u = Math.max(1e-9, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const logistic = (x: number) => 1 / (1 + Math.exp(-x));

function simulate(mode: Mode, seed: number) {
  const rng = seededRng(seed);
  let items = 0, floor = 0, tooHard = 0, sumP = 0, studentsWithStreak = 0, maxJump = 0;
  const byGroup = { weak: { n: 0, p: 0 }, mid: { n: 0, p: 0 }, strong: { n: 0, p: 0 } };

  for (let st = 0; st < STUDENTS; st++) {
    const level = normal(rng) * 1.2;   // elevens allmänna nivå
    const truth: Record<string, number> = {};
    for (const s of SKILLS) truth[s] = level + normal(rng) * 0.6;
    const group = level < -0.6 ? "weak" : level > 0.6 ? "strong" : "mid";
    let child: ChildModel = { entryGrade: 2, skills: {} };
    let hardStreak = 0, hadStreak = false;
    let now = Date.UTC(2026, 10, 16);

    for (let se = 0; se < SESSIONS; se++) {
      let session = newSession(`sim-${st}-${se}`, mode);
      const ds: number[] = [];
      for (let i = 0; i < ITEMS; i++) {
        const plan = nextQuestion(child, session, { now, rng, available: SKILLS });
        const skill = plan.question.skillId;
        const p = logistic(truth[skill] - plan.itemRating);
        items++; sumP += p; byGroup[group].n++; byGroup[group].p += p;
        // "Undvikbart för svår": en klart lättare uppgift i samma färdighet hade passat eleven.
        // Mått: lättaste uppgiften i mallen (svårighet 0) hade gett minst 60 % chans.
        const pEasiest = logistic(truth[skill] + 2);
        const avoidable = p < 0.5 && pEasiest >= 0.6;
        if (p < 0.5) tooHard++;
        if (avoidable) { hardStreak++; if (hardStreak >= 4) hadStreak = true; } else if (p >= 0.5) hardStreak = 0;
        if (p < 0.5 && !avoidable) floor++;
        let correct = rng() < p, hint = 0;
        if (!correct) { hint = 1; correct = rng() < Math.min(0.95, p + 0.3); if (!correct) hint = 2; }
        truth[skill] += hint ? 0.02 : 0.04;
        ds.push(plan.question.difficulty);
        const out = recordAnswer(child, session, plan, correct, hint, now);
        child = out.child; session = out.session;
        now += 30_000;
      }
      for (let k = 5; k < ds.length; k++) maxJump = Math.max(maxJump, ds[k] - ds[k - 5]);
      now += DAY;
    }
    if (hadStreak) studentsWithStreak++;
  }
  return {
    items, floor: floor / items, tooHard: tooHard / items, meanP: sumP / items, streak4: studentsWithStreak / STUDENTS, maxJump,
    weak: byGroup.weak.p / byGroup.weak.n, mid: byGroup.mid.p / byGroup.mid.n, strong: byGroup.strong.p / byGroup.strong.n,
  };
}

describe("simulering med 10 000 elever", () => {
  for (const mode of ["aventyr", "mysigt"] as Mode[]) {
    it(`ger lagom svåra uppgifter i läget ${mode}`, () => {
      const r = simulate(mode, mode === "aventyr" ? 1 : 2);
      const fmt = (x: number) => (x * 100).toFixed(1) + " %";
      console.log(`[${mode}] ${r.items} uppgifter · för svåra ${fmt(r.tooHard)} · snitt-chans ${fmt(r.meanP)} · ` +
        `för svåra fast lättast möjliga ${fmt(r.floor)} · 4 undvikbart för svåra i rad ${fmt(r.streak4)} av eleverna · svaga ${fmt(r.weak)} · mellan ${fmt(r.mid)} · starka ${fmt(r.strong)}`);
      expect(r.tooHard).toBeLessThan(0.10);
      expect(r.streak4).toBeLessThan(0.05);
      expect(r.meanP).toBeGreaterThan(0.65);
      expect(r.meanP).toBeLessThan(0.92);
      // Även svaga elever klarar de flesta uppgifterna. Simuleringen ger varje färdighet samma skala,
      // så mallarna för antal och ordning (2026-11-15) flyttar inte måttet: i simuleringen är de inte
      // lättare än plus. Hos riktiga barn är de det, och kartan låter barnet börja vid ett tidigare stopp.
      // Gränsen ligger kvar på 0,55 tills simuleringen har en egen svårighet per färdighet.
      expect(r.weak).toBeGreaterThan(0.55);
      expect(r.strong).toBeLessThan(0.95);   // och starka får fortfarande utmaning
    }, 120_000);
  }
});
