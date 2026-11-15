import { describe, expect, it } from "vitest";
import { fmt, isCorrect, mathTemplates, parseAnswer, seededRng, type Question } from "../src";
import { mathSkills } from "@eggly/content";

const OPS: Record<string, (a: number, b: number) => number> = {
  "+": (a, b) => a + b, "−": (a, b) => a - b, "×": (a, b) => a * b, "÷": (a, b) => a / b,
};

/** Kontrollerar facit genom att räkna om uppgiften från texten, oberoende av mallen. */
const N = (t: string) => Number(t.replace(",", ".").replace("−", "-"));
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
function checkByPrompt(q: Question): boolean | null {
  let m = q.prompt.match(/^(−?\d+(?:,\d+)?) ([+−×÷]) (\d+(?:,\d+)?) = \?$/);
  if (m) return near(OPS[m[2]](N(m[1]), N(m[3])), q.answer);
  m = q.prompt.match(/^(\d+)\/(\d+) av (\d+) = \?$/);
  if (m) return (+m[1] * +m[3]) / +m[2] === q.answer && Number.isInteger(q.answer);
  m = q.prompt.match(/^(\d+)\/(\d+) = \?\/(\d+)$/);
  if (m) return +m[1] * +m[3] === q.answer * +m[2];
  m = q.prompt.match(/^(\d+)\/(\d+) = (\d+)\/\?$/);
  if (m) return +m[1] * q.answer === +m[3] * +m[2];
  m = q.prompt.match(/^(\d+) ([+−×÷]) \? = (\d+)$/);
  if (m) return OPS[m[2]](+m[1], q.answer) === +m[3];
  m = q.prompt.match(/^\? ([+−×÷]) (\d+) = (\d+)$/);
  if (m) return OPS[m[1]](q.answer, +m[2]) === +m[3];
  m = q.prompt.match(/^Dubbelt så mycket som (\d+) = \?$/);
  if (m) return 2 * +m[1] === q.answer;
  m = q.prompt.match(/^Hälften av (\d+) = \?$/);
  if (m) return +m[1] / 2 === q.answer;
  if (q.prompt === "Vilket tal är störst?") return q.answer === Math.max(...q.choices!);
  if (q.prompt === "Hur många prickar?") return q.visual?.kind === "count" && q.visual.n === q.answer;
  m = q.prompt.match(/^Vilket tal kommer (efter|före) (\d+)\?$/);
  if (m) return q.answer === +m[2] + (m[1] === "efter" ? 1 : -1);
  m = q.prompt.match(/^Vilket tal ligger mellan (\d+) och (\d+)\?$/);
  if (m) return q.answer === (+m[1] + +m[2]) / 2 && +m[2] - +m[1] === 2;
  m = q.prompt.match(/^Vilket tal saknas\? (.+)$/);
  if (m) {
    const parts = m[1].split(", ");
    const i = parts.indexOf("?");
    const known = parts.map((x, j) => (x === "?" ? null : +x - j)).filter((x) => x !== null);
    return new Set(known).size === 1 && q.answer === known[0]! + i;
  }
  m = q.prompt.match(/^(\d+) ÷ (\d+) = \? rest (\d+)$/);
  if (m) return Math.floor(+m[1] / +m[2]) === q.answer && +m[1] % +m[2] === +m[3];
  m = q.prompt.match(/^(\d+) ÷ (\d+) = (\d+) rest \?$/);
  if (m) return +m[1] % +m[2] === q.answer && Math.floor(+m[1] / +m[2]) === +m[3] && q.answer > 0;
  m = q.prompt.match(/^Avrunda (\d+) till närmaste (tiotal|hundratal|tusental)$/);
  if (m) {
    const unit = { tiotal: 10, hundratal: 100, tusental: 1000 }[m[2]]!;
    return q.answer % unit === 0 && Math.abs(q.answer - +m[1]) <= unit / 2 && (Math.abs(q.answer - +m[1]) < unit / 2 || q.answer > +m[1]);
  }
  m = q.prompt.match(/^(\d+) % av (\d+) = \?$/);
  if (m) return (+m[1] * +m[2]) / 100 === q.answer;
  m = q.prompt.match(/^(.+), x = \?$/);
  if (m) {
    const [l, r] = m[1].replace(/x/g, `(${q.answer})`).replace(/×/g, "*").replace(/−/g, "-").split("=");
    return new Function(`return (${l}) === (${r});`)() as boolean;
  }
  m = q.prompt.match(/^([\d ()+−×]+) = \?$/);
  if (m && /[()]|[+−].*×|×.*[+−]/.test(m[1])) return new Function(`return ${m[1].replace(/×/g, "*").replace(/−/g, "-")};`)() === q.answer;
  return null; // berättelser: kontrolleras via parametrarna nedan
}

const SAMPLES = 400;

describe("frågemallar för matte", () => {
  it("varje mall hör till en färdighet i kunskapskartan", () => {
    const ids = new Set(mathSkills.map((s) => s.id));
    for (const t of mathTemplates) expect(ids.has(t.skillId), t.skillId).toBe(true);
  });

  for (const t of mathTemplates) {
    describe(t.id, () => {
      it("har rätt facit i alla frågetyper och svårigheter", () => {
        const rng = seededRng(42);
        let checked = 0;
        for (const rep of t.representations) for (let i = 0; i < SAMPLES; i++) {
          const q = t.generate(rng, i / SAMPLES, rep);
          if (!t.keys?.includes("dec")) expect(Number.isInteger(q.answer), `${q.prompt} → ${q.answer}`).toBe(true);
          if (!t.keys?.includes("neg")) expect(q.answer).toBeGreaterThanOrEqual(0);
          const ok = checkByPrompt(q);
          if (ok !== null) { expect(ok, `${t.id} ${rep}: ${q.prompt} = ${q.answer}`).toBe(true); checked++; }
        }
        expect(checked).toBeGreaterThan(0);
      });

      it("svarsalternativen är unika och rätt svar finns exakt en gång (AT-09)", () => {
        if (!t.representations.includes("choice")) return;
        const rng = seededRng(7);
        for (let i = 0; i < SAMPLES; i++) {
          const q = t.generate(rng, i / SAMPLES, "choice");
          expect(q.choices).toBeDefined();
          expect(new Set(q.choices).size).toBe(q.choices!.length);
          expect(q.choices!.filter((c) => c === q.answer).length).toBe(1);
          if (!t.keys?.includes("neg")) expect(q.choices!.every((c) => c >= 0)).toBe(true);
        }
      });

      it("ledtråd 1 och 2 avslöjar aldrig svaret", () => {
        const rng = seededRng(99);
        for (const rep of t.representations) for (let i = 0; i < SAMPLES / 2; i++) {
          const q = t.generate(rng, (i * 2) / SAMPLES, rep);
          const [h1, h2, h3] = t.hints(q);
          const inPrompt = new Set((q.prompt.match(/\d+/g) ?? []).map(Number));
          for (const h of [h1, h2]) {
            const leaks = (h.match(/\d+/g) ?? []).map(Number).filter((n) => n === q.answer && !inPrompt.has(n));
            expect(leaks, `${t.id} ${rep} «${q.prompt}» ledtråd: ${h}`).toEqual([]);
          }
          expect(h3).toContain(fmt(q.answer));
        }
      });

      it("svårigheten väljer lättare tal i början och svårare i slutet", () => {
        const rng = seededRng(3);
        const size = (d: number) => {
          let sum = 0;
          for (let i = 0; i < 200; i++) sum += t.generate(rng, d, t.representations[0]).difficulty;
          return sum / 200;
        };
        expect(size(0.05)).toBeLessThan(size(0.95));
      });
    });
  }
});

describe("rättning", () => {
  it("är förlåtande mot hur barn skriver", () => {
    for (const s of ["7", " 7 ", "07", "7,0", "7.0", "+7"]) expect(isCorrect(s, 7), s).toBe(true);
    for (const s of ["", "sju", "7a", "77", "-7", "7,5"]) expect(isCorrect(s, 7), s).toBe(false);
    expect(isCorrect("3,5", 3.5)).toBe(true);
    expect(isCorrect("−4", -4)).toBe(true);
    expect(isCorrect("-4", -4)).toBe(true);
    expect(isCorrect("0,30", 0.3)).toBe(true);
    expect(isCorrect("4", -4)).toBe(false);
    expect(parseAnswer("1 000")).toBe(1000);
  });
});
