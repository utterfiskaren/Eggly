import type { Skill } from "./types";

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const arr = (vs: string[]) => `array[${vs.map(q).join(",")}]::text[]`;

/** SQL som för in kunskapskartan i schemat eggly. Kan köras om: befintliga rader uppdateras. */
export function skillsSeedSql(skills: Skill[]): string {
  const rows = skills.map((sk) =>
    `(${q(sk.id)},${q(sk.subject)},${q(sk.strand)},${q(sk.title)},${q(sk.kidTitle)},${sk.gradeMin},${sk.gradeMax},${arr(sk.curriculum)},${q(sk.kind)},${sk.contentVersion})`,
  );
  const prereqs = skills.flatMap((sk) => sk.prereqs.map((p) => `(${q(sk.id)},${q(p)})`));
  return [
    "begin;",
    "insert into eggly.skills (id, subject, strand, title, kid_title, grade_min, grade_max, curriculum, kind, content_version) values",
    rows.join(",\n") ,
    "on conflict (id) do update set subject = excluded.subject, strand = excluded.strand, title = excluded.title,",
    "  kid_title = excluded.kid_title, grade_min = excluded.grade_min, grade_max = excluded.grade_max,",
    "  curriculum = excluded.curriculum, kind = excluded.kind, content_version = excluded.content_version, active = true;",
    `delete from eggly.skill_prereqs where skill_id in (${skills.map((sk) => q(sk.id)).join(",")});`,
    prereqs.length ? `insert into eggly.skill_prereqs (skill_id, prereq_id) values\n${prereqs.join(",\n")};` : "",
    "commit;",
  ].join("\n");
}
