import { describe, expect, it } from "vitest";
import { englishSkills, languageSkills, swedishSkills } from "@eggly/content";
import {
  englishTemplates, isTextCorrect, languageTemplates, planTextRound, seededRng, swedishTemplates, textTemplatesForSkill,
  type TextItem, type TextTemplate,
} from "../src";

const words = (s: string) => (s.toLowerCase().match(/\p{L}+/gu) ?? []);
const hasLetters = (s: string) => /\p{L}/u.test(s);

describe("språkmallarnas listor", () => {
  it("har en mall för varje färdighet i kunskapskartan, och inga fler", () => {
    const skillIds = languageSkills.map((s) => s.id).sort();
    const templateIds = languageTemplates.map((t) => t.skillId).sort();
    expect(templateIds).toEqual(skillIds);
  });
  it("kopplar svenska mallar till svenska färdigheter och engelska till engelska", () => {
    expect(swedishTemplates.map((t) => t.skillId).sort()).toEqual(swedishSkills.map((s) => s.id).sort());
    expect(englishTemplates.map((t) => t.skillId).sort()).toEqual(englishSkills.map((s) => s.id).sort());
  });
  it("har unika nycklar i alla mallar", () => {
    const keys = languageTemplates.flatMap((t) => t.items.map((i) => i.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  for (const t of languageTemplates) {
    describe(t.skillId, () => {
      it("har minst åtta uppgifter", () => expect(t.items.length).toBeGreaterThanOrEqual(8));
      it("har fel alternativ som skiljer sig från rätt svar och från varandra", () => {
        for (const it of t.items) {
          expect(it.answer.trim(), it.key).not.toBe("");
          expect(it.wrong.length, it.key).toBeGreaterThanOrEqual(1);
          expect(it.wrong.includes(it.answer), `${it.key}: rätt svar bland felen`).toBe(false);
          expect(new Set(it.wrong).size, `${it.key}: dubbletter bland felen`).toBe(it.wrong.length);
          for (const w of it.wrong) expect(w.trim(), it.key).not.toBe("");
        }
      });
      it("har ledtrådar som inte avslöjar svaret i nivå 1 och 2", () => {
        for (const it of t.items) {
          expect(it.hint1.length, it.key).toBeGreaterThan(10);
          expect(it.hint2.length, it.key).toBeGreaterThan(10);
          if (!hasLetters(it.answer)) continue;
          const ans = it.answer.toLowerCase();
          for (const h of [it.hint1, it.hint2]) {
            const ws = words(h);
            const parts = words(ans);
            // Svaret får inte stå som egna ord i ledtråden (ensamma bokstäver hoppas över).
            if (parts.join(" ").length > 1) {
              expect(ws.join(" ").includes(` ${parts.join(" ")} `) || ` ${ws.join(" ")} `.includes(` ${parts.join(" ")} `), `${it.key}: «${h}» avslöjar «${it.answer}»`).toBe(false);
            }
          }
        }
      });
    });
  }
});

describe("uppgifter från språkmallarna", () => {
  const check = (t: TextTemplate, seed: number) => {
    const rng = seededRng(seed);
    for (let i = 0; i < 40; i++) {
      const d = rng();
      const q = t.generate(rng, d);
      expect(q.choices.length, `${t.skillId} ${q.key}`).toBeGreaterThanOrEqual(2);
      expect(q.choices.length).toBeLessThanOrEqual(4);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices).toContain(q.answer);
      expect(isTextCorrect(q, q.answer)).toBe(true);
      for (const c of q.choices) if (c !== q.answer) expect(isTextCorrect(q, c)).toBe(false);
      expect(q.difficulty).toBeGreaterThanOrEqual(0);
      expect(q.difficulty).toBeLessThanOrEqual(1);
      expect(t.hints(q)).toHaveLength(3);
    }
  };
  for (const t of languageTemplates) it(`ger riktiga uppgifter: ${t.skillId}`, () => { check(t, 7); check(t, 4242); });

  it("är förutsägbara: samma frö ger samma uppgift", () => {
    const t = textTemplatesForSkill("en.ord.djur")[0];
    expect(t.generate(seededRng(5), 0.5)).toEqual(t.generate(seededRng(5), 0.5));
  });

  it("följer svårigheten: lågt tal ger tidiga uppgifter och högt tal sena", () => {
    const t = textTemplatesForSkill("sv.gram.plural")[0];
    const rng = seededRng(1);
    const lo = Array.from({ length: 30 }, () => t.generate(rng, 0).difficulty);
    const hi = Array.from({ length: 30 }, () => t.generate(rng, 1).difficulty);
    expect(Math.max(...lo)).toBeLessThan(Math.min(...hi) + 0.5);
    expect(lo.reduce((a, b) => a + b) / 30).toBeLessThan(hi.reduce((a, b) => a + b) / 30);
  });

  it("planerar en omgång utan upprepningar", () => {
    for (const lang of [swedishTemplates, englishTemplates]) {
      for (let seed = 1; seed <= 30; seed++) {
        const round = planTextRound(seededRng(seed), lang, 12, (seed % 10) / 10);
        expect(round).toHaveLength(12);
        expect(new Set(round.map((q) => q.key)).size).toBe(12);
      }
    }
  });

  it("ger så många uppgifter som finns när listan är kortare än omgången", () => {
    const t = textTemplatesForSkill("sv.skrivtecken.storbokstav");
    const round = planTextRound(seededRng(3), t, 50, 0.5);
    expect(round.length).toBe(t[0].items.length);
    expect(new Set(round.map((q) => q.key)).size).toBe(round.length);
  });
});

/** Kontroller av facit som inte utgår från listans eget svar. */
describe("facit i språklistorna", () => {
  const items = (id: string): readonly TextItem[] => textTemplatesForSkill(id)[0].items;

  it("a/an följer vokalljud (med de kända undantagen)", () => {
    const exceptions: Record<string, "a" | "an"> = { hour: "an", university: "a", unicorn: "a" };
    for (const it of items("en.gram.aan")) {
      const word = it.prompt.replace(/^I have ___ /, "").replace(/\.$/, "");
      const want = exceptions[word] ?? (/^[aeiou]/.test(word) ? "an" : "a");
      expect(it.answer, word).toBe(want);
    }
  });

  it("vanliga plural på engelska följer reglerna, de oregelbundna är en fast lista", () => {
    const irregular = new Set(["child", "man", "woman", "foot", "tooth", "mouse", "sheep", "knife", "wolf"]);
    for (const it of items("en.gram.plural")) {
      const sing = it.prompt.replace("one ", "").replace(", two ___", "");
      if (irregular.has(sing)) continue;
      const regular = /(s|x|ch|sh|o)$/.test(sing) ? sing + "es" : /[^aeiou]y$/.test(sing) ? sing.slice(0, -1) + "ies" : sing + "s";
      expect(it.answer, sing).toBe(regular);
    }
  });

  it("regelbunden dåtid på engelska slutar på -ed, den oregelbundna är en fast lista", () => {
    const irregular = new Set(["went", "saw", "ate", "ran", "had", "bought", "took", "swam", "wrote", "drank", "came", "made", "gave", "slept"]);
    for (const it of items("en.gram.preteritum")) {
      if (irregular.has(it.answer)) continue;
      expect(it.answer.endsWith("ed"), it.answer).toBe(true);
    }
  });

  it("to be och to have passar subjektet", () => {
    const plural = /^(We|They|You|My brothers|My mum and dad|The children)\b/;
    for (const it of items("en.gram.tobe")) {
      const subj = it.prompt.split(" ___")[0];
      const want = subj === "I" ? "am" : plural.test(it.prompt) ? "are" : "is";
      expect(it.answer, it.prompt).toBe(want);
    }
    const haveOk = /^(I|You|We|They|My friends)\b/;
    for (const it of items("en.gram.have")) expect(it.answer, it.prompt).toBe(haveOk.test(it.prompt) ? "have" : "has");
  });

  it("frågor slutar på frågetecken och påståenden på punkt", () => {
    for (const it of items("sv.skrivtecken.slut")) {
      const sentence = it.sub ?? "";
      const isQuestion = /^«(Var|Vad|Vem|Hur|När|Har)\b/.test(sentence);
      expect(it.answer, sentence).toBe(isQuestion ? "?" : ".");
    }
  });

  it("svenska dåtidsformer är inte samma ord som nutid eller supinum", () => {
    for (const it of items("sv.gram.tempus")) {
      expect(it.wrong.includes(it.answer)).toBe(false);
      if (it.answer !== "var") expect(/(ar|er|or)$/.test(it.answer), it.answer).toBe(false);
    }
  });

  it("sammansatta ord börjar med första delen", () => {
    for (const it of items("sv.ord.sammansatta")) {
      const m = it.prompt.match(/«(.+)» och «(.+)»/)!;
      expect(it.answer.startsWith(m[1].slice(0, -1)), it.prompt).toBe(true);
      expect(it.answer.endsWith(m[2]), it.prompt).toBe(true);
    }
  });

  it("alla meningar med stor bokstav: rätt mening börjar med versal och månader och veckodagar är små", () => {
    for (const it of items("sv.skrivtecken.storbokstav")) {
      expect(/^\p{Lu}/u.test(it.answer), it.answer).toBe(true);
      expect(/ (Måndag|Fredag|Juli|Augusti)\b/.test(it.answer)).toBe(false);
    }
  });
});
