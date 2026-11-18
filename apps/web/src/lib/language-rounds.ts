import "server-only";
import { englishSkills, swedishSkills } from "@eggly/content";
import {
  emptySkill, entryGradeFor, hashSeed, languageTemplates, newSession, planTextRound, recordAnswer, seededRng, textToPlanned, textTemplatesForSkill,
  type ChildModel, type SkillState, type TextQuestion,
} from "@eggly/engine";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Omgångar i Ordön (svenska) och Språkön (engelska). Samma tanke som matteomgångarna: servern planerar hela
 * omgången och skickar den med facit (uppgifterna rättas direkt i webbläsaren), och när omgången är slut kommer
 * bara rätt eller fel per uppgift tillbaka. Servern slår upp uppgifterna själv, räknar om barnets modell och
 * sparar. Barnets id kommer alltid från den verifierade inloggningen.
 */

export type Island = "svenska" | "engelska";

const SKILLS = { svenska: swedishSkills, engelska: englishSkills } as const;
const TITLE = new Map([...swedishSkills, ...englishSkills].map((s) => [s.id, s.kidTitle]));
const LEVEL_D = [0.15, 0.5, 0.85];
const ROUND_LENGTH = 10;

export interface LangRoundQuestion {
  key: string;
  skillId: string;
  skillTitle: string;
  lang: "sv" | "en";
  prompt: string;
  sub?: string;
  choices: string[];
  answer: string;
  /** Tre ledtrådar. Den tredje är hela lösningen och visas först efter svaret. */
  hints: [string, string, string];
}

export interface LangRound { roundId: string; island: Island; questions: LangRoundQuestion[] }
export interface LangAnswer { correct: boolean; hint?: number; i?: number }
export interface LangResult { right: number; wrong: number; stars: number }

async function loadChild(childId: string): Promise<ChildModel> {
  const db = supabaseAdmin();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    db.from("profiles").select("age_band").eq("id", childId).single(),
    db.from("child_skill_state").select("skill_id, model").eq("child_id", childId),
  ]);
  const skills: Record<string, SkillState> = {};
  for (const r of rows ?? []) {
    const m = r.model as Partial<SkillState>;
    if (m && m.skillId) skills[r.skill_id as string] = { ...emptySkill(r.skill_id as string), ...m };
  }
  return { entryGrade: entryGradeFor(profile?.age_band as string | undefined), skills };
}

function view(q: TextQuestion): LangRoundQuestion {
  const t = textTemplatesForSkill(q.skillId)[0];
  return {
    key: q.key, skillId: q.skillId, skillTitle: TITLE.get(q.skillId) ?? "", lang: q.lang, prompt: q.prompt,
    ...(q.sub ? { sub: q.sub } : {}), choices: q.choices, answer: q.answer, hints: t.hints(q),
  };
}

/** Startar en omgång. Null om valet inte stämmer (okänd ö, färdighet från andra ön eller fel nivå) eller om passet inte kunde sparas. */
export async function startLanguageRound(childId: string, spec: { island: string; skill: string; level: number }): Promise<LangRound | null> {
  const island = spec.island === "svenska" || spec.island === "engelska" ? spec.island : null;
  if (!island) return null;
  const level = Number(spec.level);
  if (!Number.isInteger(level) || level < 0 || level >= LEVEL_D.length) return null;
  const lang = island === "svenska" ? "sv" : "en";
  const pool = spec.skill === "mix"
    ? languageTemplates.filter((t) => t.lang === lang)
    : SKILLS[island].some((s) => s.id === spec.skill) ? textTemplatesForSkill(spec.skill) : [];
  if (!pool.length) return null;

  const db = supabaseAdmin();
  // Färdigheterna måste finnas i databasen (seed-filen skills_sprak.sql). Annars går det inte att spara, och sidan spelar i provläge.
  const ids = [...new Set(pool.map((t) => t.skillId))];
  const { data: known } = await db.from("skills").select("id").in("id", ids);
  if ((known?.length ?? 0) !== ids.length) return null;
  const { data: sess, error } = await db.from("play_sessions")
    .insert({ child_id: childId, subject: island, mode: "aventyr", activity: `sprak:${spec.skill}` })
    .select("id").single();
  if (error || !sess) return null;
  const roundId = sess.id as string;

  const questions = planTextRound(seededRng(hashSeed(roundId)), pool, ROUND_LENGTH, LEVEL_D[level]);
  if (!questions.length) return null;
  const { error: pendErr } = await db.from("pending_questions").insert({
    session_id: roundId, child_id: childId, item_index: 0, planned: { kind: "sprak", island, round: questions },
  });
  if (pendErr) return null;
  return { roundId, island, questions: questions.map(view) };
}

/**
 * Tar emot svaren. Varje uppgift räknas högst en gång och bara uppgifter som finns i omgången räknas. Ett andra försök
 * med samma omgång ger ingenting (den väntande omgången raderas första gången).
 */
export async function finishLanguageRound(childId: string, roundId: string, answers: LangAnswer[]): Promise<LangResult | null> {
  const db = supabaseAdmin();
  const { data: removed } = await db.from("pending_questions").delete()
    .eq("session_id", roundId).eq("child_id", childId).select("planned");
  const pending = removed?.[0]?.planned as { kind?: string; island?: Island; round: TextQuestion[] } | undefined;
  if (!pending || pending.kind !== "sprak" || !Array.isArray(pending.round)) return null;

  const plan = pending.round;
  const taken = new Set<number>();
  const given: (LangAnswer & { at: number })[] = [];
  answers.forEach((a, pos) => {
    const at = Number.isInteger(a.i) ? (a.i as number) : pos;
    if (at < 0 || at >= plan.length || taken.has(at)) return;
    taken.add(at);
    given.push({ ...a, at });
  });
  given.sort((x, y) => x.at - y.at);
  if (!given.length) return { right: 0, wrong: 0, stars: 0 };

  const now = Date.now();
  let child = await loadChild(childId);
  let session = newSession(roundId, "aventyr", { skills: [...new Set(plan.map((q) => q.skillId))], source: "child_choice" });
  const touched = new Set<string>();
  const attempts: Record<string, unknown>[] = [];
  for (const a of given) {
    const q = plan[a.at];
    const hint = Math.max(0, Math.min(3, Math.floor(a.hint ?? 0)));
    const out = recordAnswer(child, session, textToPlanned(q), !!a.correct, hint, now);
    child = out.child; session = out.session; touched.add(q.skillId);
    attempts.push({
      idempotency_key: `${roundId}:${a.at}`, session_id: roundId, child_id: childId, skill_id: q.skillId,
      template_id: q.templateId, template_version: q.templateVersion, params: { key: q.key },
      representation: "choice", reason: "child_choice", difficulty: q.difficulty,
      presented_at: new Date(now).toISOString(), answered_at: new Date(now).toISOString(), correct: !!a.correct, hint_level: hint,
    });
  }

  const right = given.filter((a) => a.correct).length;
  const first: PromiseLike<{ error: unknown }>[] = [];
  for (const id of touched) {
    const sk = child.skills[id];
    first.push(db.from("child_skill_state").upsert({
      child_id: childId, skill_id: id, status: sk.status, needs_review: sk.needsReview,
      rating: sk.rating, rating_n: sk.ratingN, attempts: sk.attempts, correct: sk.correct,
      hints_used: sk.hintsUsed, representations: sk.representations, sessions_secure: sk.sessionsSecure.length,
      review_due_at: sk.reviewDueAt ? new Date(sk.reviewDueAt).toISOString() : null,
      last_practiced_at: new Date(now).toISOString(), model: sk,
    }));
  }
  first.push(db.from("attempts").insert(attempts));
  // Fel i sparningen får inte döljas: då ska barnet få veta att omgången inte sparades.
  if ((await Promise.all(first)).some((r) => r.error)) return null;

  // En stjärna per rätt svar, som i matteomgångarna. Nyckeln gör att samma omgång aldrig ger stjärnor två gånger.
  const second: PromiseLike<{ error: unknown }>[] = [
    db.from("play_sessions").update({ state: session, items_done: given.length, ended_at: new Date(now).toISOString() }).eq("id", roundId),
  ];
  if (right > 0) second.push(db.from("reward_ledger").insert({ idempotency_key: `${roundId}:stars`, child_id: childId, kind: "stars", amount: right, reason: "omgång" }));
  const failed = (await Promise.all(second)).some((r) => r.error);
  return { right, wrong: given.length - right, stars: failed ? 0 : right };
}
