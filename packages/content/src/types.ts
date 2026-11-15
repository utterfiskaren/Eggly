export type Subject = "matte" | "svenska" | "engelska";

/** fact = minnesfakta (t.ex. 7 × 8), procedure = metod, concept = förståelse, problem = tillämpning */
export type SkillKind = "fact" | "procedure" | "concept" | "problem";

export interface Skill {
  /** Stabilt id. Byts aldrig när en färdighet ändras – då höjs contentVersion i stället. */
  id: string;
  subject: Subject;
  /** Område i kursplanen, t.ex. "taluppfattning". */
  strand: string;
  /** För vuxna (lärare och föräldrar). */
  title: string;
  /** För barnet, kort och utan facktermer. */
  kidTitle: string;
  /** Rekommenderade årskurser. Bara en etikett: motorn styrs av barnets resultat, inte av årskursen. */
  gradeMin: number;
  gradeMax: number;
  /** Var färdigheten hör hemma i styrdokumenten, t.ex. "lgr22:ma:1-3:taluppfattning". */
  curriculum: string[];
  kind: SkillKind;
  /** Färdigheter som bör sitta innan denna introduceras. */
  prereqs: string[];
  contentVersion: number;
}
