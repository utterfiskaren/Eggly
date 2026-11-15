import type { Skill, SkillKind } from "../types";

/**
 * Kunskapskarta v0 för matte, åk 1–6.
 * Områdena följer kursplanen i matematik (Lgr22): taluppfattning och tals användning, algebra,
 * geometri, sannolikhet och statistik, samband och förändring, problemlösning.
 * Gränserna mellan årskurser är rekommendationer. Lärare kan låsa upp tidigare eller senare.
 */

type Strand =
  | "taluppfattning"
  | "algebra"
  | "geometri"
  | "statistik"
  | "samband"
  | "problemlosning";

function curriculumTags(strand: Strand, gradeMin: number, gradeMax: number): string[] {
  const tags: string[] = [];
  if (gradeMin <= 3) tags.push(`lgr22:ma:1-3:${strand}`);
  if (gradeMax >= 4 && gradeMin <= 6) tags.push(`lgr22:ma:4-6:${strand}`);
  return tags;
}

function s(
  id: string,
  strand: Strand,
  title: string,
  kidTitle: string,
  gradeMin: number,
  gradeMax: number,
  kind: SkillKind,
  prereqs: string[] = [],
): Skill {
  return {
    id: `ma.${id}`,
    subject: "matte",
    strand,
    title,
    kidTitle,
    gradeMin,
    gradeMax,
    curriculum: curriculumTags(strand, gradeMin, gradeMax),
    kind,
    prereqs: prereqs.map((p) => `ma.${p}`),
    contentVersion: 1,
  };
}

export const mathSkills: Skill[] = [
  // ── Taluppfattning ──────────────────────────────────────────
  s("tal.antal10", "taluppfattning", "Antal och siffror 0–10", "Räkna saker upp till 10", 1, 1, "concept"),
  s("tal.ordning20", "taluppfattning", "Talens ordning 0–20", "Vilket tal kommer sen?", 1, 1, "concept", ["tal.antal10"]),
  s("tal.tiokamrater", "taluppfattning", "Tiokamrater", "Tiokompisar", 1, 2, "fact", ["tal.antal10"]),
  s("tal.positionssystem100", "taluppfattning", "Tiotal och ental upp till 100", "Tiotal och ental", 1, 2, "concept", ["tal.ordning20"]),
  s("tal.positionssystem1000", "taluppfattning", "Hundratal, tiotal och ental", "Stora tal upp till 1 000", 2, 3, "concept", ["tal.positionssystem100"]),
  s("tal.jamfora", "taluppfattning", "Jämföra och storleksordna tal", "Vilket tal är störst?", 1, 3, "concept", ["tal.ordning20"]),
  s("tal.avrunda", "taluppfattning", "Avrunda till tiotal och hundratal", "Ungefär hur mycket?", 3, 4, "procedure", ["tal.positionssystem1000"]),
  s("tal.positionssystem_stora", "taluppfattning", "Tal upp till en miljon", "Jättestora tal", 4, 5, "concept", ["tal.positionssystem1000"]),
  s("tal.negativa", "taluppfattning", "Negativa tal i vardagen", "Tal under noll", 5, 6, "concept", ["tal.jamfora"]),
  s("tal.brak_del", "taluppfattning", "Bråk som del av helhet", "Halva, tredjedel, fjärdedel", 2, 3, "concept", ["tal.antal10"]),
  s("tal.brak_jamfora", "taluppfattning", "Jämföra och storleksordna bråk", "Vilken bit är störst?", 4, 5, "concept", ["tal.brak_del"]),
  s("tal.brak_likvardiga", "taluppfattning", "Likvärdiga bråk", "Samma mängd, olika bråk", 5, 6, "concept", ["tal.brak_jamfora"]),
  s("tal.decimal", "taluppfattning", "Decimaltal (tiondelar och hundradelar)", "Tal med komma", 4, 5, "concept", ["tal.positionssystem1000", "tal.brak_del"]),
  s("tal.procent", "taluppfattning", "Procent som del av helhet", "Procent", 6, 6, "concept", ["tal.decimal", "tal.brak_likvardiga"]),

  // ── De fyra räknesätten ─────────────────────────────────────
  s("add.inom10", "taluppfattning", "Addition inom 10", "Plus upp till 10", 1, 1, "fact", ["tal.antal10"]),
  s("sub.inom10", "taluppfattning", "Subtraktion inom 10", "Minus upp till 10", 1, 1, "fact", ["tal.antal10"]),
  s("add.inom20_utan", "taluppfattning", "Addition inom 20 utan tiotalsövergång", "Plus upp till 20", 1, 2, "fact", ["add.inom10"]),
  s("add.inom20_med", "taluppfattning", "Addition inom 20 med tiotalsövergång", "Plus över tian", 1, 2, "fact", ["add.inom20_utan", "tal.tiokamrater"]),
  s("sub.inom20_utan", "taluppfattning", "Subtraktion inom 20 utan tiotalsövergång", "Minus upp till 20", 1, 2, "fact", ["sub.inom10"]),
  s("sub.inom20_med", "taluppfattning", "Subtraktion inom 20 med tiotalsövergång", "Minus över tian", 2, 2, "fact", ["sub.inom20_utan", "tal.tiokamrater"]),
  s("add.tvasiffrigt", "taluppfattning", "Addition med tvåsiffriga tal", "Plus med stora tal", 2, 3, "procedure", ["add.inom20_med", "tal.positionssystem100"]),
  s("sub.tvasiffrigt", "taluppfattning", "Subtraktion med tvåsiffriga tal", "Minus med stora tal", 2, 3, "procedure", ["sub.inom20_med", "tal.positionssystem100"]),
  s("add.uppstallning", "taluppfattning", "Addition med uppställning", "Plus på höjden", 3, 4, "procedure", ["add.tvasiffrigt", "tal.positionssystem1000"]),
  s("sub.uppstallning", "taluppfattning", "Subtraktion med uppställning och växling", "Minus på höjden", 3, 4, "procedure", ["sub.tvasiffrigt", "tal.positionssystem1000"]),
  s("mul.grupper", "taluppfattning", "Multiplikation som lika stora grupper", "Lika många i varje grupp", 2, 3, "concept", ["add.inom20_utan"]),
  s("mul.tabell_2_5_10", "taluppfattning", "Tabellerna 2, 5 och 10", "Gånger 2, 5 och 10", 2, 3, "fact", ["mul.grupper"]),
  s("mul.tabell_3_4", "taluppfattning", "Tabellerna 3 och 4", "Gånger 3 och 4", 3, 3, "fact", ["mul.tabell_2_5_10"]),
  s("mul.tabell_6_9", "taluppfattning", "Tabellerna 6–9", "Gånger 6, 7, 8 och 9", 3, 4, "fact", ["mul.tabell_3_4"]),
  s("div.likadelning", "taluppfattning", "Division som likadelning", "Dela lika", 2, 3, "concept", ["mul.grupper"]),
  s("div.tabell", "taluppfattning", "Division med tabellerna", "Dela med tabellerna", 3, 4, "fact", ["div.likadelning", "mul.tabell_3_4"]),
  s("mul.flersiffrigt", "taluppfattning", "Multiplikation med flersiffriga tal", "Gånger med stora tal", 4, 5, "procedure", ["mul.tabell_6_9", "add.uppstallning"]),
  s("div.kort", "taluppfattning", "Kort division", "Dela stora tal", 4, 5, "procedure", ["div.tabell", "sub.uppstallning"]),
  s("div.rest", "taluppfattning", "Division med rest", "Det som blir över", 4, 4, "concept", ["div.tabell"]),
  s("mul.decimal", "taluppfattning", "Räkna med decimaltal", "Räkna med komma", 5, 6, "procedure", ["tal.decimal", "mul.flersiffrigt"]),
  s("rakna.overslag", "taluppfattning", "Överslagsräkning och rimlighet", "Är svaret rimligt?", 3, 6, "procedure", ["tal.avrunda"]),
  s("rakna.huvudrakning", "taluppfattning", "Strategier för huvudräkning", "Smarta sätt att räkna i huvudet", 2, 6, "procedure", ["add.tvasiffrigt"]),

  // ── Algebra ─────────────────────────────────────────────────
  s("alg.monster", "algebra", "Mönster i talföljder och former", "Hitta mönstret", 1, 3, "concept"),
  s("alg.likhetstecken", "algebra", "Likhetstecknets betydelse", "Lika mycket på båda sidor", 1, 3, "concept", ["add.inom10"]),
  s("alg.saknat_tal", "algebra", "Hitta det saknade talet", "Vilket tal fattas?", 2, 4, "procedure", ["alg.likhetstecken"]),
  s("alg.uttryck", "algebra", "Enkla uttryck med obekanta", "Bokstäver som tal", 5, 6, "concept", ["alg.saknat_tal"]),
  s("alg.ekvation", "algebra", "Enkla ekvationer", "Lös gåtan med x", 6, 6, "procedure", ["alg.uttryck"]),
  s("alg.prioritering", "algebra", "Räkneordning och parenteser", "Vad räknar man först?", 4, 6, "procedure", ["mul.tabell_6_9"]),

  // ── Geometri och mätning ────────────────────────────────────
  s("geo.former", "geometri", "Grundläggande geometriska former", "Former", 1, 2, "concept"),
  s("geo.kroppar", "geometri", "Geometriska kroppar", "3D-former", 2, 4, "concept", ["geo.former"]),
  s("geo.symmetri", "geometri", "Symmetri", "Spegelbilder", 2, 4, "concept", ["geo.former"]),
  s("geo.langd", "geometri", "Längd och enheter", "Hur långt?", 1, 3, "procedure", ["tal.ordning20"]),
  s("geo.enhetsbyte", "geometri", "Byta mellan enheter", "Meter, decimeter, centimeter", 3, 5, "procedure", ["geo.langd", "tal.decimal"]),
  s("geo.omkrets", "geometri", "Omkrets", "Runt kanten", 3, 5, "procedure", ["geo.langd", "add.tvasiffrigt"]),
  s("geo.area", "geometri", "Area av rektanglar och trianglar", "Hur stor yta?", 4, 6, "procedure", ["geo.omkrets", "mul.tabell_6_9"]),
  s("geo.vinklar", "geometri", "Vinklar", "Spetsig, rät eller trubbig", 4, 6, "concept", ["geo.former"]),
  s("geo.skala", "geometri", "Skala", "Förstora och förminska", 6, 6, "concept", ["geo.enhetsbyte"]),
  s("mat.klockan_hel", "geometri", "Klockan: hel och halv timme", "Hel och halv", 1, 2, "fact"),
  s("mat.klockan_minut", "geometri", "Klockan: minuter, analog och digital", "Klockan på minuten", 2, 3, "fact", ["mat.klockan_hel"]),
  s("mat.tidsskillnad", "geometri", "Räkna med tid", "Hur lång tid tar det?", 3, 5, "procedure", ["mat.klockan_minut", "sub.tvasiffrigt"]),
  s("mat.pengar", "geometri", "Pengar och växel", "Handla och få tillbaka", 1, 3, "procedure", ["add.inom20_med", "sub.inom20_med"]),
  s("mat.volym_vikt", "geometri", "Volym och massa", "Liter och kilo", 3, 5, "procedure", ["geo.langd"]),

  // ── Sannolikhet och statistik ───────────────────────────────
  s("stat.tabeller", "statistik", "Läsa tabeller och diagram", "Läs diagrammet", 1, 3, "concept", ["tal.jamfora"]),
  s("stat.medelvarde", "statistik", "Medelvärde, median och typvärde", "Mitten och det vanligaste", 4, 6, "procedure", ["stat.tabeller", "div.tabell"]),
  s("stat.chans", "statistik", "Chans och risk", "Hur stor chans?", 4, 6, "concept", ["tal.brak_del"]),

  // ── Samband och förändring ──────────────────────────────────
  s("samb.dubbelt_halften", "samband", "Dubbelt och hälften", "Dubbelt och hälften", 1, 3, "fact", ["add.inom20_utan"]),
  s("samb.proportionalitet", "samband", "Proportionella samband", "Om 1 kostar …, vad kostar 4?", 4, 6, "procedure", ["mul.tabell_6_9"]),
  s("samb.koordinater", "samband", "Koordinatsystem", "Hitta punkten", 5, 6, "concept", ["tal.negativa"]),

  // ── Problemlösning ──────────────────────────────────────────
  s("prob.textuppgift_ett", "problemlosning", "Textuppgifter i ett steg", "Lös en kort berättelse", 1, 3, "problem", ["add.inom20_med", "sub.inom20_med"]),
  s("prob.textuppgift_flera", "problemlosning", "Textuppgifter i flera steg", "Lös en klurig berättelse", 3, 6, "problem", ["prob.textuppgift_ett", "mul.tabell_3_4"]),
  s("prob.logik", "problemlosning", "Logiska resonemang och strategier", "Tänk som en detektiv", 2, 6, "problem", ["alg.monster"]),
];
