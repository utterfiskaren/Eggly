import type { Skill, SkillKind } from "../types";

/**
 * Kunskapskarta v0 för svenska, åk 1–6. Bara det som går att öva med flervalsuppgifter med säkert facit:
 * stavning, skiljetecken, ordklasser, böjning och ordförståelse. Läsförståelse och skrivande kommer med textuppgifter senare.
 * Följer kursplanen i svenska (Lgr22): skriva, språkbruk (ord och meningar).
 */

type Strand = "skriva" | "sprakbruk";

function tags(strand: Strand, gradeMin: number, gradeMax: number): string[] {
  const t: string[] = [];
  if (gradeMin <= 3) t.push(`lgr22:sv:1-3:${strand}`);
  if (gradeMax >= 4 && gradeMin <= 6) t.push(`lgr22:sv:4-6:${strand}`);
  return t;
}

function s(id: string, strand: Strand, title: string, kidTitle: string, gradeMin: number, gradeMax: number, kind: SkillKind, prereqs: string[] = []): Skill {
  return {
    id: `sv.${id}`, subject: "svenska", strand, title, kidTitle, gradeMin, gradeMax,
    curriculum: tags(strand, gradeMin, gradeMax), kind, prereqs: prereqs.map((p) => `sv.${p}`), contentVersion: 1,
  };
}

export const swedishSkills: Skill[] = [
  s("stav.dubbel", "skriva", "Stavning med dubbelteckning", "Ett eller två likadana?", 1, 3, "fact"),
  s("stav.ljud", "skriva", "Stavning av sj-, tj- och andra svåra ljud", "Svåra ljud: sj, tj, j", 2, 4, "fact", ["stav.dubbel"]),
  s("skrivtecken.slut", "skriva", "Punkt och frågetecken", "Punkt eller frågetecken?", 1, 2, "concept"),
  s("skrivtecken.storbokstav", "skriva", "Stor bokstav i början och på namn", "När ska det vara stor bokstav?", 1, 3, "concept", ["skrivtecken.slut"]),
  s("ord.sammansatta", "sprakbruk", "Sammansatta ord", "Sätta ihop ord", 2, 4, "concept"),
  s("ord.motsatser", "sprakbruk", "Motsatsord", "Motsatsord", 1, 3, "concept"),
  s("ord.synonymer", "sprakbruk", "Synonymer", "Ord som betyder nästan samma sak", 3, 5, "concept", ["ord.motsatser"]),
  s("gram.plural", "sprakbruk", "Böjning: singular och plural", "En eller flera?", 2, 4, "fact"),
  s("gram.tempus", "sprakbruk", "Verb i nutid och dåtid", "Nu och förut: verb", 3, 5, "fact", ["gram.ordklass"]),
  s("gram.ordklass", "sprakbruk", "Substantiv, verb och adjektiv", "Namn på saker, görord och egenskapsord", 2, 4, "concept"),
];
