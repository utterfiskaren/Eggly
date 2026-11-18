import { writeFileSync } from "node:fs";
import { languageSkills, mathSkills, skillsSeedSql, validateSkills } from "../src";

const sets: [string, typeof mathSkills][] = [["skills_matte.sql", mathSkills], ["skills_sprak.sql", languageSkills]];
for (const [file, skills] of sets) {
  const errors = validateSkills(skills);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  writeFileSync(new URL(`../../../supabase/seed/${file}`, import.meta.url), skillsSeedSql(skills) + "\n");
  console.log(`skrev ${skills.length} färdigheter till supabase/seed/${file}`);
}
