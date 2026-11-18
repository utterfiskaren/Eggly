import { swedishTemplates } from "./sv";
import { englishTemplates } from "./en";
import type { TextTemplate } from "./types";

export * from "./types";
export { textTemplate, planTextRound, isTextCorrect } from "./build";
export { textToQuestion, textToPlanned } from "./adapt";
export { swedishTemplates, englishTemplates };

export const languageTemplates: TextTemplate[] = [...swedishTemplates, ...englishTemplates];

export const LANGUAGE_SKILLS_WITH_TEMPLATES: string[] = languageTemplates.map((t) => t.skillId);

export function textTemplatesForSkill(skillId: string): TextTemplate[] {
  return languageTemplates.filter((t) => t.skillId === skillId);
}
