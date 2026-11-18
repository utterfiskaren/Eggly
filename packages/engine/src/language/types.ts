/**
 * Uppgifter i svenska och engelska. Svaret är en text (ett ord, ett tecken eller en hel mening) och barnet väljer
 * bland alternativ. Facit står i listorna som mallarna bygger på: inget genereras fritt och inget skrivs av AI.
 */

export type Lang = "sv" | "en";

export interface TextQuestion {
  templateId: string;
  templateVersion: number;
  skillId: string;
  lang: Lang;
  /** Uppgiftens id i mallen. Används för att aldrig ge samma uppgift två gånger i en omgång. */
  key: string;
  prompt: string;
  /** Rad två: en svensk översättning eller en tilläggsförklaring (visas under uppgiften). */
  sub?: string;
  /** Två till fyra olika alternativ. */
  choices: string[];
  answer: string;
  /** 0–1 inom mallen (läget i listan, lätt först). */
  difficulty: number;
}

export interface TextItem {
  key: string;
  prompt: string;
  sub?: string;
  answer: string;
  /** Fel alternativ att välja bland. Alla ska vara klart fel. Tre slumpas fram om det finns fler. */
  wrong: string[];
  /** Vink. Får inte avslöja svaret. */
  hint1: string;
  /** Stöd som delar upp uppgiften. Får inte avslöja svaret. */
  hint2: string;
  /** Hela lösningen. Förval: «Rätt svar är …». */
  solution?: string;
}

export interface TextTemplate {
  id: string;
  version: number;
  skillId: string;
  lang: Lang;
  items: readonly TextItem[];
  /** Skapar en uppgift nära önskad svårighet. `exclude` är nycklar som redan använts i omgången. */
  generate(rng: () => number, difficulty: number, exclude?: ReadonlySet<string>): TextQuestion;
  hints(q: TextQuestion): [string, string, string];
}
