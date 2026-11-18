import { englishSkills } from "./engelska/skills";
import { swedishSkills } from "./svenska/skills";

/** Alla färdigheter i språkämnena. Matte ligger kvar i `mathSkills` och rörs inte. */
export const languageSkills = [...swedishSkills, ...englishSkills];
