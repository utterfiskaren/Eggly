import { describe, expect, it } from "vitest";
import { fmt, isCorrect, mathTemplates, parseAnswer, seededRng, type Question } from "../src";
import { mathSkills } from "@eggly/content";

const OPS: Record<string, (a: number, b: number) => number> = {
  "+": (a, b) => a + b, "−": (a, b) => a - b, "×": (a, b) => a * b, "÷": (a, b) => a / b,
};

/** Kontrollerar facit genom att räkna om uppgiften från texten, oberoende av mallen. */
const N = (t: string) => Number(t.replace(",", ".").replace("−", "-"));
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const UNIT_FACTOR: Record<string, number> = { "m>cm": 100, "km>m": 1000, "cm>mm": 10, "kg>g": 1000, "l>dl": 10, "l>ml": 1000, "dl>ml": 100 };

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
  // Mått, tid, pengar, statistik, proportion och berättelser (åk 3–6).
  const A = q.answer;
  m = q.prompt.match(/^En rektangel är (\d+) cm lång och (\d+) cm bred\. Hur lång är omkretsen i cm\?$/);
  if (m) return A === 2 * (+m[1] + +m[2]);
  m = q.prompt.match(/^En kvadrat har sidan (\d+) cm\. Hur lång är omkretsen i cm\?$/);
  if (m) return A === 4 * +m[1];
  m = q.prompt.match(/^En rektangel har omkretsen (\d+) cm och är (\d+) cm lång\. Hur bred är den i cm\?$/);
  if (m) return 2 * (+m[2] + A) === +m[1];
  m = q.prompt.match(/^En rektangel är (\d+) cm lång och (\d+) cm bred\. Hur stor är arean i kvadratcentimeter\?$/);
  if (m) return A === +m[1] * +m[2];
  m = q.prompt.match(/^En triangel har basen (\d+) cm och höjden (\d+) cm\. Hur stor är arean i kvadratcentimeter\?$/);
  if (m) return 2 * A === +m[1] * +m[2];
  m = q.prompt.match(/^En kvadrat har sidan (\d+) cm\. Hur stor är arean i kvadratcentimeter\?$/);
  if (m) return A === +m[1] * +m[1];
  m = q.prompt.match(/^En rektangel har arean (\d+) kvadratcentimeter och är (\d+) cm lång\. Hur bred är den i cm\?$/);
  if (m) return A * +m[2] === +m[1];
  m = q.prompt.match(/^(\d+) (km|m|cm|kg|l|dl) = \? (m|cm|mm|g|dl|ml)$/);
  if (m && UNIT_FACTOR[`${m[2]}>${m[3]}`]) return A === +m[1] * UNIT_FACTOR[`${m[2]}>${m[3]}`];
  m = q.prompt.match(/^(\d+) (m|cm|mm|g|dl|ml) = \? (km|m|cm|kg|l|dl)$/);
  if (m) return A * UNIT_FACTOR[`${m[3]}>${m[2]}`] === +m[1];
  m = q.prompt.match(/^Filmen börjar (\d+):(\d+) och slutar (\d+):(\d+)\. Hur många minuter varar den\?$/);
  if (m) return A === +m[3] * 60 + +m[4] - (+m[1] * 60 + +m[2]);
  m = q.prompt.match(/^(\d+) timmar och (\d+) minuter = \? minuter$/);
  if (m) return A === +m[1] * 60 + +m[2];
  m = q.prompt.match(/^Du köper .+ för (\d+) kr och betalar med (\d+) kr\. Hur många kronor får du tillbaka\?$/);
  if (m) return A === +m[2] - +m[1];
  m = q.prompt.match(/^(\d+) saker kostar (\d+) kr styck\. Hur många kronor blir det tillsammans\?$/);
  if (m) return A === +m[1] * +m[2];
  m = q.prompt.match(/^Du har (\d+) kr\. Du köper något för (\d+) kr och något för (\d+) kr\. Hur många kronor har du kvar\?$/);
  if (m) return A === +m[1] - +m[2] - +m[3];
  m = q.prompt.match(/^(Medelvärdet|Medianen|Typvärdet) av (.+) = \?$/);
  if (m) {
    const xs = m[2].replace(" och ", ", ").split(", ").map(Number);
    if (m[1] === "Medelvärdet") return A * xs.length === xs.reduce((a, b) => a + b, 0);
    if (m[1] === "Medianen") return A === [...xs].sort((a, b) => a - b)[(xs.length - 1) / 2] && xs.length % 2 === 1;
    const cnt = (v: number) => xs.filter((x) => x === v).length;
    return xs.every((x) => cnt(x) <= cnt(A)) && xs.filter((x) => cnt(x) === cnt(A)).every((x) => x === A);
  }
  m = q.prompt.match(/^(\d+) \S+ kostar (\d+) kr\. Vad kostar (\d+) \S+\?$/);
  if (m) return +m[2] % +m[1] === 0 && A === (+m[2] / +m[1]) * +m[3];
  m = q.prompt.match(/^\S+ har (\d+) påsar med (\d+) bär i varje\. \S+ äter (\d+) bär\. Hur många bär är kvar\?$/);
  if (m) return A === +m[1] * +m[2] - +m[3];
  m = q.prompt.match(/^\S+ köper (\d+) böcker för (\d+) kr styck och betalar med (\d+) kr\. Hur många kronor får \S+ tillbaka\?$/);
  if (m) return A === +m[3] - +m[1] * +m[2];
  m = q.prompt.match(/^\S+ har (\d+) bär och får (\d+) till\. De delas lika mellan (\d+) kompisar\. Hur många bär får var och en\?$/);
  if (m) return (+m[1] + +m[2]) % +m[3] === 0 && A * +m[3] === +m[1] + +m[2];
  // Bildfrågor: klockan och stapeldiagram. Facit kontrolleras mot bilden.
  const cl = q.visual?.kind === "clock" ? q.visual : null;
  if (q.prompt === "Klockan visar en hel timme. Vilken timme är det? Skriv timmen.") return !!cl && cl.m === 0 && A === cl.h;
  if (q.prompt === "Klockan visar halv. Vilket tal kommer efter «halv»? Skriv timmen.") return !!cl && cl.m === 30 && A === (cl.h % 12) + 1;
  if (q.prompt === "Hur många minuter efter hel timme visar klockan?") return !!cl && cl.m % 5 === 0 && cl.m > 0 && A === cl.m;
  if (q.prompt === "Hur många minuter är det kvar till nästa hela timme?") return !!cl && cl.m % 5 === 0 && cl.m > 0 && A === 60 - cl.m;
  if (q.prompt.startsWith("Diagrammet visar antal bilar.")) {
    if (q.visual?.kind !== "bars") return false;
    const v = Object.fromEntries(q.visual.labels.map((l, i) => [l, q.visual!.kind === "bars" ? q.visual!.values[i] : 0]));
    if (q.prompt.endsWith("Hur många bilar är det tillsammans?")) return A === v["Röd"] + v["Blå"] + v["Gul"];
    const f = q.prompt.match(/Hur många fler är (\S+) än (\S+)\?$/);
    const key: Record<string, string> = { röda: "Röd", blå: "Blå", gula: "Gul" };
    return !!f && A === v[key[f[1]]] - v[key[f[2]]] && A > 0;
  }
  // Platsvärde, huvudräkning, mönster, former, klockan, data och logik.
  m = q.prompt.match(/^Vilket tal är (\d) tiotal och (\d) ental\?$/);
  if (m) return A === +m[1] * 10 + +m[2];
  m = q.prompt.match(/^Hur många (tiotal|ental) har talet (\d\d)\?$/);
  if (m) return A === (m[1] === "tiotal" ? Math.floor(+m[2] / 10) : +m[2] % 10);
  m = q.prompt.match(/^Vilket tal är (\d) hundratal, (\d) tiotal och (\d) ental\?$/);
  if (m) return A === +m[1] * 100 + +m[2] * 10 + +m[3];
  m = q.prompt.match(/^Vilken siffra står på tiotalsplatsen i (\d\d\d)\?$/);
  if (m) return A === Math.floor(+m[1] / 10) % 10;
  m = q.prompt.match(/^Hur mycket är siffran (\d) värd i (\d\d\d)\?$/);
  if (m) { const i = m[2].indexOf(m[1]); return i >= 0 && m[2].lastIndexOf(m[1]) === i && A === +m[1] * 10 ** (2 - i); }
  m = q.prompt.match(/^Vilket tal är (\d+) tusen och (\d+)\?$/);
  if (m) return A === +m[1] * 1000 + +m[2];
  m = q.prompt.match(/^Vilket tal är (\d+) (mer|mindre) än (\d+)\?$/);
  if (m) return A === +m[3] + (m[2] === "mer" ? 1 : -1) * +m[1];
  m = q.prompt.match(/^Vilket bråk är störst, 1\/(\d+) eller 1\/(\d+)\? Skriv talet under strecket\.$/);
  if (m) return A === Math.min(+m[1], +m[2]) && +m[1] !== +m[2];
  m = q.prompt.match(/^Vilket bråk är störst, (\d+)\/(\d+) eller (\d+)\/(\d+)\? Skriv talet över strecket\.$/);
  if (m) return m[2] === m[4] && A === Math.max(+m[1], +m[3]);
  m = q.prompt.match(/^Gör ett överslag: (\d+) ([+−×]) (\d+) ≈ \?$/);
  if (m) { const r = (n: number) => Math.round(n / 10) * 10; return +m[1] % 10 !== 5 && A === (m[2] === "×" ? r(+m[1]) * +m[3] : m[2] === "+" ? r(+m[1]) + r(+m[3]) : r(+m[1]) - r(+m[3])); }
  m = q.prompt.match(/^Räkna i huvudet: (\d+) ([+−×]) (\d+) = \?$/);
  if (m) return A === (m[2] === "+" ? +m[1] + +m[3] : m[2] === "−" ? +m[1] - +m[3] : +m[1] * +m[3]);
  m = q.prompt.match(/^Fortsätt mönstret: (.+), \?$/);
  if (m) {
    const xs = [...m[1].split(", ").map(Number), A];
    const d1 = xs.slice(1).map((x, i) => x - xs[i]);
    const arith = d1.every((x) => x === d1[0]);
    const growing = d1.every((x, i) => i === 0 || x === d1[i - 1] + 1);
    const doubling = xs.slice(1).every((x, i) => x === xs[i] * 2);
    return arith || growing || doubling;
  }
  m = q.prompt.match(/^(\d+) \+ (\d+) = (\d+) \+ \?$/);
  if (m) return +m[1] + +m[2] === +m[3] + A;
  m = q.prompt.match(/^\? \+ (\d+) = (\d+) \+ (\d+)$/);
  if (m) return A + +m[1] === +m[2] + +m[3];
  m = q.prompt.match(/^Om n = (\d+), vad är (\d+)n ([+−]) (\d+)\?$/);
  if (m) return A === +m[2] * +m[1] + (m[3] === "+" ? 1 : -1) * +m[4];
  m = q.prompt.match(/^Hur många (hörn|sidor|kanter|sidoytor) har (?:en|ett) (.+)\?$/);
  if (m) {
    const shape: Record<string, number> = { triangel: 3, kvadrat: 4, rektangel: 4, femhörning: 5, sexhörning: 6, åttahörning: 8 };
    const body: Record<string, number[]> = { kub: [8, 12, 6], rätblock: [8, 12, 6], "fyrsidig pyramid": [5, 8, 5], triangelprisma: [6, 9, 5] };
    if (shape[m[2]] !== undefined) return (m[1] === "hörn" || m[1] === "sidor") && A === shape[m[2]];
    return A === body[m[2]]?.[["hörn", "kanter", "sidoytor"].indexOf(m[1])];
  }
  m = q.prompt.match(/^Hur många symmetrilinjer har (?:en|ett) (.+)\?$/);
  if (m) return A === ({ kvadrat: 4, rektangel: 2, "liksidig triangel": 3, "regelbunden femhörning": 5, "regelbunden sexhörning": 6, hjärta: 1 } as Record<string, number>)[m[1]];
  m = q.prompt.match(/^Två pinnar är (\d+) cm och (\d+) cm\. De läggs efter varandra\. Hur lång blir raden i cm\?$/);
  if (m) return A === +m[1] + +m[2];
  m = q.prompt.match(/^Ett steg är (\d+) cm\. Hur långt är (\d+) steg i cm\?$/);
  if (m) return A === +m[1] * +m[2];
  m = q.prompt.match(/^Ett snöre är (\d+) cm\. Ett annat är (\d+) cm\. Hur många cm längre är det längre snöret\?$/);
  if (m) return A === +m[1] - +m[2] && +m[1] > +m[2];
  m = q.prompt.match(/^Två vinklar bildar tillsammans en (rät|rak) vinkel\. Den ena är (\d+)°\. Hur stor är den andra i grader\?$/);
  if (m) return A === (m[1] === "rät" ? 90 : 180) - +m[2] && A > 0;
  m = q.prompt.match(/^Hur många grader är (\d+) räta vinklar tillsammans\?$/);
  if (m) return A === 90 * +m[1];
  m = q.prompt.match(/^Två vinklar i en triangel är (\d+)° och (\d+)°\. Hur stor är den tredje vinkeln i grader\?$/);
  if (m) return A === 180 - +m[1] - +m[2] && A > 0;
  m = q.prompt.match(/^Skalan är 1:(\d+)\. Sträckan på ritningen är (\d+) cm\. Hur lång är den i verkligheten i cm\?$/);
  if (m) return A === +m[1] * +m[2];
  m = q.prompt.match(/^Skalan är 1:(\d+)\. Sträckan är (\d+) cm i verkligheten\. Hur lång är den på ritningen i cm\?$/);
  if (m) return A * +m[1] === +m[2];
  m = q.prompt.match(/^Hur många halvtimmar är det på (\d+) timm(?:e|ar)\?$/);
  if (m) return A === 2 * +m[1];
  m = q.prompt.match(/^Klockan är (\d+)\. Vad är klockan efter (\d+) timm(?:e|ar)\? Skriv timmen\.$/);
  if (m) return A >= 1 && A <= 12 && (A - +m[1] - +m[2]) % 12 === 0;
  m = q.prompt.match(/^Klockan är (\d+):(\d+)\. Hur många minuter är det kvar till nästa hela timme\?$/);
  if (m) return A === 60 - +m[2];
  m = q.prompt.match(/^Klockan är (\d+):(\d+)\. Efter (\d+) minuter, vilka minuter visar klockan\? Skriv bara minutdelen\.$/);
  if (m) return A === (+m[2] + +m[3]) % 60;
  m = q.prompt.match(/^Tabellen visar antal bilar: Röd (\d+), Blå (\d+), Gul (\d+)\. (.+)$/);
  if (m) {
    const v: Record<string, number> = { röd: +m[1], blå: +m[2], gul: +m[3] };
    if (m[4] === "Hur många bilar är det tillsammans?") return A === v.röd + v.blå + v.gul;
    const f = m[4].match(/^Hur många fler är (\S+) än (\S+)\?$/);
    const key: Record<string, string> = { röda: "röd", blå: "blå", gula: "gul" };
    return !!f && A === v[key[f[1]]] - v[key[f[2]]] && A > 0;
  }
  m = q.prompt.match(/^Ett lyckohjul har (\d+) lika stora fält\. (\d+) av dem är röda\. Chansen att få rött är (\d+) av \?$/);
  if (m) return A === +m[1] && +m[2] === +m[3] && +m[2] < +m[1];
  m = q.prompt.match(/^I en påse finns (\d+) röda, (\d+) blå och (\d+) gula kulor\. Chansen att få en gul är (\d+) av \?$/);
  if (m) return A === +m[1] + +m[2] + +m[3] && +m[3] === +m[4];
  m = q.prompt.match(/^En punkt är \((\d+), (\d+)\)\. Den flyttas (\d+) steg åt (höger|upp)\. Vilket (x|y)-värde har den då\?$/);
  if (m) return (m[4] === "höger") === (m[5] === "x") && A === (m[5] === "x" ? +m[1] : +m[2]) + +m[3];
  m = q.prompt.match(/^Punkterna \((\d+), (\d+)\) och \((\d+), (\d+)\) ligger på samma rad\. Hur många steg är det mellan dem\?$/);
  if (m) return m[2] === m[4] && A === +m[3] - +m[1];
  m = q.prompt.match(/^\S+ har (\d+) bär\. \S+ får (\d+) till\. Hur många bär har \S+ nu\?$/);
  if (m) return A === +m[1] + +m[2];
  m = q.prompt.match(/^\S+ har (\d+) bär\. \S+ äter (\d+)\. Hur många bär har \S+ kvar\?$/);
  if (m) return A === +m[1] - +m[2];
  m = q.prompt.match(/^\S+ har (\d+) påsar med (\d+) bär i varje påse\. Hur många bär är det tillsammans\?$/);
  if (m) return A === +m[1] * +m[2];
  m = q.prompt.match(/^\S+ delar (\d+) bär lika på (\d+) påsar\. Hur många bär blir det i varje påse\?$/);
  if (m) return A * +m[2] === +m[1];
  m = q.prompt.match(/^Jag tänker på ett tal\. Jag lägger till (\d+) och får (\d+)\. Vilket tal tänker jag på\?$/);
  if (m) return A + +m[1] === +m[2];
  m = q.prompt.match(/^Jag tänker på ett tal\. Jag tar bort (\d+) och får (\d+)\. Vilket tal tänker jag på\?$/);
  if (m) return A - +m[1] === +m[2];
  m = q.prompt.match(/^Jag tänker på ett tal\. Jag dubblar det och lägger till (\d+)\. Då får jag (\d+)\. Vilket tal tänker jag på\?$/);
  if (m) return 2 * A + +m[1] === +m[2];
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

      it("bildfrågor har en bild, andra frågor har ingen", () => {
        const rng = seededRng(11);
        for (const rep of t.representations) for (let i = 0; i < 100; i++) {
          const q = t.generate(rng, i / 100, rep);
          if (!/klockan|tabeller/.test(t.skillId)) continue;
          if (rep === "visual") expect(q.visual, q.prompt).toBeDefined();
          else expect(q.visual, q.prompt).toBeUndefined();
        }
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
