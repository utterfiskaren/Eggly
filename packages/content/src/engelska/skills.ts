import type { Skill, SkillKind } from "../types";

/**
 * Kunskapskarta v0 för engelska, åk 1–6. Ordförråd i teman och grundläggande grammatik, allt som flervalsuppgifter
 * med säkert facit. Lyssna och tala kommer med ljud senare. Följer kursplanen i engelska (Lgr22).
 */

type Strand = "ordforrad" | "grammatik";

function tags(strand: Strand, gradeMin: number, gradeMax: number): string[] {
  const t: string[] = [];
  if (gradeMin <= 3) t.push(`lgr22:en:1-3:${strand}`);
  if (gradeMax >= 4 && gradeMin <= 6) t.push(`lgr22:en:4-6:${strand}`);
  return t;
}

function s(id: string, strand: Strand, title: string, kidTitle: string, gradeMin: number, gradeMax: number, kind: SkillKind, prereqs: string[] = []): Skill {
  return {
    id: `en.${id}`, subject: "engelska", strand, title, kidTitle, gradeMin, gradeMax,
    curriculum: tags(strand, gradeMin, gradeMax), kind, prereqs: prereqs.map((p) => `en.${p}`), contentVersion: 1,
  };
}

export const englishSkills: Skill[] = [
  s("ord.farger", "ordforrad", "Ordförråd: färger", "Färger på engelska", 1, 3, "fact"),
  s("ord.siffror", "ordforrad", "Ordförråd: tal 1–20 och tiotal", "Siffror på engelska", 1, 3, "fact"),
  s("ord.djur", "ordforrad", "Ordförråd: djur", "Djur på engelska", 1, 3, "fact"),
  s("ord.familj", "ordforrad", "Ordförråd: familjen", "Familjen på engelska", 1, 3, "fact"),
  s("ord.kropp", "ordforrad", "Ordförråd: kroppen", "Kroppen på engelska", 1, 3, "fact"),
  s("ord.mat", "ordforrad", "Ordförråd: mat och dryck", "Mat på engelska", 1, 3, "fact"),
  s("ord.klader", "ordforrad", "Ordförråd: kläder", "Kläder på engelska", 2, 4, "fact"),
  s("ord.skola", "ordforrad", "Ordförråd: skolan", "Skolan på engelska", 2, 4, "fact"),
  s("ord.natur", "ordforrad", "Ordförråd: natur och väder", "Natur och väder på engelska", 3, 5, "fact"),
  s("ord.tid", "ordforrad", "Ordförråd: veckodagar och månader", "Dagar och månader", 2, 4, "fact", ["ord.siffror"]),
  s("ord.verb", "ordforrad", "Ordförråd: vanliga verb", "Görord på engelska", 3, 5, "fact", ["ord.djur"]),
  s("ord.adjektiv", "ordforrad", "Ordförråd: adjektiv", "Egenskapsord på engelska", 3, 5, "fact", ["ord.farger"]),
  s("ord.motsatser", "ordforrad", "Motsatser på engelska", "Motsatser på engelska", 3, 5, "fact", ["ord.adjektiv"]),
  s("gram.aan", "grammatik", "A eller an", "A eller an?", 3, 4, "procedure"),
  s("gram.pronomen", "grammatik", "Personliga pronomen", "He, she, it, we, they", 3, 4, "concept"),
  s("gram.tobe", "grammatik", "Verbet to be (am, is, are)", "Am, is eller are?", 3, 5, "procedure", ["gram.pronomen"]),
  s("gram.have", "grammatik", "Verbet to have (have, has)", "Have eller has?", 3, 5, "procedure", ["gram.pronomen"]),
  s("gram.plural", "grammatik", "Plural av substantiv", "En eller flera?", 3, 5, "fact"),
  s("gram.presens", "grammatik", "Presens: s i tredje person", "Verb med s", 4, 6, "procedure", ["gram.pronomen"]),
  s("gram.preteritum", "grammatik", "Preteritum: regelbundna och oregelbundna verb", "Verb i dåtid", 5, 6, "fact", ["gram.presens"]),
  s("gram.prepositioner", "grammatik", "Prepositioner: in, on, under med flera", "In, on, under och de andra", 4, 6, "concept", ["ord.skola"]),
];
