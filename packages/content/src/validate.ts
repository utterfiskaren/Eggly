import type { Skill } from "./types";

/** Kontrollerar kunskapskartan. Returnerar en lista med fel (tom lista = allt är i ordning). */
export function validateSkills(skills: Skill[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, Skill>();
  for (const sk of skills) {
    if (byId.has(sk.id)) errors.push(`dubblett: ${sk.id}`);
    byId.set(sk.id, sk);
  }
  for (const sk of skills) {
    if (!/^(ma|sv|en)\.[a-z0-9_.]+$/.test(sk.id)) errors.push(`ogiltigt id: ${sk.id}`);
    if (sk.gradeMin > sk.gradeMax) errors.push(`${sk.id}: gradeMin > gradeMax`);
    if (sk.curriculum.length === 0) errors.push(`${sk.id}: saknar koppling till kursplanen`);
    if (sk.kidTitle.length > 40) errors.push(`${sk.id}: barnets titel är för lång`);
    for (const p of sk.prereqs) {
      const pre = byId.get(p);
      if (!pre) { errors.push(`${sk.id}: okänd förkunskap ${p}`); continue; }
      if (pre.subject !== sk.subject) errors.push(`${sk.id}: förkunskap i annat ämne ${p}`);
      if (pre.gradeMin > sk.gradeMax) errors.push(`${sk.id}: förkunskapen ${p} ligger senare än färdigheten`);
    }
  }
  // Inga cirklar i förkunskaperna.
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string, path: string[]): void => {
    const st = state.get(id) ?? 0;
    if (st === 2) return;
    if (st === 1) { errors.push(`cirkel: ${[...path, id].join(" → ")}`); return; }
    state.set(id, 1);
    for (const p of byId.get(id)?.prereqs ?? []) if (byId.has(p)) visit(p, [...path, id]);
    state.set(id, 2);
  };
  for (const sk of skills) visit(sk.id, []);
  return errors;
}

/** Djup i kartan: antal steg från en färdighet utan förkunskaper. Används för kartans layout. */
export function skillDepths(skills: Skill[]): Map<string, number> {
  const byId = new Map(skills.map((sk) => [sk.id, sk]));
  const memo = new Map<string, number>();
  const depth = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const sk = byId.get(id)!;
    const d = sk.prereqs.length === 0 ? 0 : 1 + Math.max(...sk.prereqs.map(depth));
    memo.set(id, d);
    return d;
  };
  for (const sk of skills) depth(sk.id);
  return memo;
}
