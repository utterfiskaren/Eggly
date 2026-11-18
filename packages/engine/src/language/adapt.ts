import type { Question } from "../question";
import { ENGINE_RULES, type Planned } from "../session";
import type { TextQuestion } from "./types";

/**
 * Gör en textuppgift till en `Question` som motorns Elo, FSRS och status kan räkna på. Svaret och alternativen
 * lämnas tomma: motorn behöver bara färdigheten, svårigheten och uppgiftens nyckel (som blir faktumet FSRS följer).
 * Frågetypen är alltid «choice», så språkfärdigheter når «säker» men inte «bemästrad» förrän det finns fler frågetyper.
 */
export function textToQuestion(q: TextQuestion): Question {
  return {
    templateId: q.templateId, templateVersion: q.templateVersion, skillId: q.skillId, representation: "choice",
    params: {}, prompt: q.prompt, input: "choice", choices: [], answer: 0, difficulty: q.difficulty, factKey: q.key,
  };
}

/** Samma som `textToQuestion`, med uppgiftens svårighet omräknad till Elo-skalan. */
export function textToPlanned(q: TextQuestion): Planned {
  return { question: textToQuestion(q), reason: "child_choice", itemRating: (q.difficulty - 0.5) * ENGINE_RULES.ratingSpan };
}
