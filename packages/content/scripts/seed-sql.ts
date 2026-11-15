import { writeFileSync } from "node:fs";
import { mathSkills, skillsSeedSql, validateSkills } from "../src";

const errors = validateSkills(mathSkills);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const out = new URL("../../../supabase/seed/skills_matte.sql", import.meta.url);
writeFileSync(out, skillsSeedSql(mathSkills) + "\n");
console.log(`skrev ${mathSkills.length} färdigheter till supabase/seed/skills_matte.sql`);
