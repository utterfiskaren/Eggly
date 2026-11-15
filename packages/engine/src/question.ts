/** En uppgift som den ser ut när motorn har skapat den. Allt som behövs för att rita, rätta och felsöka. */

export type Representation = "symbol" | "missing" | "choice" | "visual" | "story";

export type Visual =
  | { kind: "tenframe"; a: number; b: number; op: "+" | "−" }
  | { kind: "groups"; groups: number; per: number }
  | { kind: "share"; total: number; groups: number }
  /** Prickar att räkna. "frame" ligger i en tioruta, "scatter" ligger utspridda (positionerna kommer från seed). */
  | { kind: "count"; n: number; layout: "frame" | "scatter"; seed: number }
  /** En bit av tallinjen. Talet på platsen `hidden` visas som ett frågetecken. */
  | { kind: "numberline"; from: number; to: number; hidden: number };

export interface Question {
  templateId: string;
  templateVersion: number;
  skillId: string;
  representation: Representation;
  /** Talen uppgiften byggdes av. Sparas för felsökning och för att återskapa uppgiften. */
  params: Record<string, number>;
  /** Texten som visas. Använder × och − (inte x och -). */
  prompt: string;
  input: "number" | "choice";
  choices?: number[];
  answer: number;
  visual?: Visual;
  /** 0–1 inom mallen. Motorn väljer den, mallen översätter till tal. */
  difficulty: number;
  /** Minnesfakta som FSRS följer, t.ex. "7×8". Bara för faktafärdigheter. */
  factKey?: string;
}

export interface Template {
  id: string;
  version: number;
  skillId: string;
  representations: Representation[];
  /** Behöver knappsatsen komma (dec) eller minus (neg)? */
  keys?: "dec" | "neg" | "both";
  generate(rng: () => number, difficulty: number, representation: Representation, fact?: string): Question;
  /** Tre nivåer: en vink, ett stöd som delar upp, och hela lösningen. Nivå 1–2 får aldrig avslöja svaret. */
  hints(q: Question): [string, string, string];
  /** Alla fakta som mallen kan ge, för FSRS. Tom för mallar som inte är faktaträning. */
  facts?(): string[];
}
