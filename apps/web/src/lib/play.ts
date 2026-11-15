import "server-only";
import { mathSkills } from "@eggly/content";
import {
  MATH_SKILLS_WITH_TEMPLATES, emptySkill, entryGradeFor, hashSeed, isCorrect, mathTemplates, newSession,
  nextQuestion, recordAnswer, seededRng,
  type ChildModel, type Mode, type Planned, type SessionState, type SkillState, type Visual,
} from "@eggly/engine";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Spelomgången på servern. Barnets id kommer alltid från den verifierade inloggningen, aldrig från
 * webbläsaren. Facit stannar i eggly.pending_questions och skickas aldrig ut.
 */

export const ITEMS_PER_SESSION = 8;
const KID_TITLE = new Map(mathSkills.map((s) => [s.id, s.kidTitle]));

/** Det webbläsaren får se om en uppgift. Inget facit. */
export interface ClientQuestion {
  sessionId: string;
  index: number;
  total: number;
  skillTitle: string;
  prompt: string;
  input: "number" | "choice";
  choices?: number[];
  visual?: Visual;
  hintLevel: number;
  hints: string[];
}

export interface AnswerResult {
  status: "correct" | "try_again" | "revealed";
  message: string;
  hint?: string;
  hintLevel?: number;
  stars?: number;
  next?: ClientQuestion;
  summary?: SessionSummary;
}

export interface SessionSummary {
  correct: number;
  total: number;
  stars: number;
  skills: { title: string; correct: number; total: number }[];
}

interface PendingPlan { planned: Planned; tries: number }

function hintsFor(p: Planned, level: number): string[] {
  const t = mathTemplates.find((x) => x.id === p.question.templateId);
  if (!t || level === 0) return [];
  return t.hints(p.question).slice(0, level);
}

function toClient(sessionId: string, index: number, p: Planned, hintLevel = 0): ClientQuestion {
  const q = p.question;
  return {
    sessionId, index, total: ITEMS_PER_SESSION,
    skillTitle: KID_TITLE.get(q.skillId) ?? "",
    prompt: q.prompt, input: q.input, choices: q.choices, visual: q.visual,
    hintLevel, hints: hintsFor(p, hintLevel),
  };
}

async function loadChild(childId: string): Promise<ChildModel> {
  const db = supabaseAdmin();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    db.from("profiles").select("age_band").eq("id", childId).single(),
    db.from("child_skill_state").select("skill_id, model").eq("child_id", childId),
  ]);
  const skills: Record<string, SkillState> = {};
  for (const r of rows ?? []) {
    const m = r.model as Partial<SkillState>;
    if (m && m.skillId) skills[r.skill_id] = { ...emptySkill(r.skill_id), ...m };
  }
  return { entryGrade: entryGradeFor(profile?.age_band), skills };
}

function rngFor(sessionId: string, index: number) {
  return seededRng(hashSeed(`${sessionId}:${index}:${Date.now()}`));
}

/** Startar ett nytt pass och visar första uppgiften. */
export async function startSession(childId: string, mode: Mode): Promise<ClientQuestion> {
  const db = supabaseAdmin();
  const { data: sess, error } = await db.from("play_sessions")
    .insert({ child_id: childId, subject: "matte", mode, activity: "aggjakten" })
    .select("id").single();
  if (error || !sess) throw new Error("Passet gick inte att starta");
  const state = newSession(sess.id, mode);
  const child = await loadChild(childId);
  const planned = nextQuestion(child, state, { now: Date.now(), rng: rngFor(sess.id, 0), available: MATH_SKILLS_WITH_TEMPLATES });
  await db.from("play_sessions").update({ state }).eq("id", sess.id);
  await db.from("pending_questions").insert({ session_id: sess.id, child_id: childId, item_index: 0, planned: { planned, tries: 0 } });
  return toClient(sess.id, 0, planned);
}

async function loadPending(childId: string, sessionId: string) {
  const { data } = await supabaseAdmin().from("pending_questions")
    .select("item_index, planned, hint_level").eq("session_id", sessionId).eq("child_id", childId).maybeSingle();
  if (!data) return null;
  return { index: data.item_index as number, plan: data.planned as PendingPlan, hintLevel: data.hint_level as number };
}

/** Visar nästa ledtrådsnivå (högst 3). Nivå 3 är hela lösningen. */
export async function takeHint(childId: string, sessionId: string): Promise<{ hints: string[]; hintLevel: number } | null> {
  const pending = await loadPending(childId, sessionId);
  if (!pending) return null;
  const level = Math.min(3, pending.hintLevel + 1);
  await supabaseAdmin().from("pending_questions").update({ hint_level: level }).eq("session_id", sessionId);
  return { hints: hintsFor(pending.plan.planned, level), hintLevel: level };
}

/**
 * Rättar ett svar. Fel svar ger «prova igen» och efter andra felet en ledtråd automatiskt.
 * Svaret räknas när barnet svarat rätt, eller när barnet valt att se lösningen.
 */
export async function answerQuestion(childId: string, sessionId: string, raw: string, giveUp = false): Promise<AnswerResult | null> {
  const db = supabaseAdmin();
  const pending = await loadPending(childId, sessionId);
  if (!pending) return null;
  const { planned } = pending.plan;
  const ok = !giveUp && isCorrect(raw, planned.question.answer);

  if (!ok && !giveUp) {
    const tries = pending.plan.tries + 1;
    const autoHint = tries >= 2 && pending.hintLevel < 2 ? Math.min(2, pending.hintLevel + 1) : pending.hintLevel;
    await db.from("pending_questions").update({ planned: { planned, tries }, hint_level: autoHint }).eq("session_id", sessionId);
    return {
      status: "try_again",
      message: tries === 1 ? "Inte riktigt. Vill du prova igen?" : "Nästan! Titta på ledtråden.",
      hintLevel: autoHint,
      hint: autoHint > pending.hintLevel ? hintsFor(planned, autoHint).at(-1) : undefined,
    };
  }

  // Svaret räknas. Rätt efter fel försök räknas som rätt med hjälp.
  const hintLevel = giveUp ? 3 : Math.max(pending.hintLevel, pending.plan.tries > 0 ? 1 : 0);
  const correct = ok;
  const now = Date.now();
  const [{ data: sessRow }, child] = await Promise.all([
    db.from("play_sessions").select("state, mode, items_done").eq("id", sessionId).eq("child_id", childId).single(),
    loadChild(childId),
  ]);
  if (!sessRow) return null;
  const state = sessRow.state as SessionState;

  // Ta bort den väntande uppgiften först: ett dubbelklick hittar då ingenting och ger ingen dubbel belöning.
  const { data: removed } = await db.from("pending_questions").delete().eq("session_id", sessionId).select("session_id");
  if (!removed || removed.length === 0) return null;

  const out = recordAnswer(child, state, planned, correct, hintLevel, now);
  const skill = out.child.skills[planned.question.skillId];
  const idx = pending.index;
  // Samma grundbelöning i alla lägen: en stjärna för varje uppgift, två om den satt direkt.
  const stars = correct ? (hintLevel === 0 ? 2 : 1) : 1;

  await Promise.all([
    db.from("child_skill_state").upsert({
      child_id: childId, skill_id: skill.skillId, status: skill.status, needs_review: skill.needsReview,
      rating: skill.rating, rating_n: skill.ratingN, attempts: skill.attempts, correct: skill.correct,
      hints_used: skill.hintsUsed, representations: skill.representations, sessions_secure: skill.sessionsSecure.length,
      review_due_at: skill.reviewDueAt ? new Date(skill.reviewDueAt).toISOString() : null,
      last_practiced_at: new Date(now).toISOString(), model: skill,
    }),
    db.from("attempts").insert({
      idempotency_key: `${sessionId}:${idx}`, session_id: sessionId, child_id: childId, skill_id: skill.skillId,
      template_id: planned.question.templateId, template_version: planned.question.templateVersion,
      params: planned.question.params, representation: planned.question.representation, reason: planned.reason,
      difficulty: planned.question.difficulty, presented_at: new Date(now).toISOString(), answered_at: new Date(now).toISOString(),
      answer: giveUp ? null : raw.slice(0, 20), correct, hint_level: hintLevel,
    }),
    db.from("reward_ledger").insert({ idempotency_key: `${sessionId}:${idx}:stars`, child_id: childId, kind: "stars", amount: stars, reason: "uppgift" }),
  ]);

  const done = idx + 1;
  const message = giveUp ? `Så här blir det: ${hintsFor(planned, 3).at(-1)}` : correct && hintLevel === 0 ? "Rätt!" : "Rätt! Bra kämpat.";
  if (done >= ITEMS_PER_SESSION) {
    await db.from("play_sessions").update({ state: out.session, items_done: done, ended_at: new Date(now).toISOString() }).eq("id", sessionId);
    return { status: giveUp ? "revealed" : "correct", message, stars, summary: summarize(out.session) };
  }

  const nextPlanned = nextQuestion(out.child, out.session, { now, rng: rngFor(sessionId, done), available: MATH_SKILLS_WITH_TEMPLATES });
  await Promise.all([
    db.from("play_sessions").update({ state: out.session, items_done: done, challenge_probes: out.session.probes }).eq("id", sessionId),
    db.from("pending_questions").insert({ session_id: sessionId, child_id: childId, item_index: done, planned: { planned: nextPlanned, tries: 0 } }),
  ]);
  return { status: giveUp ? "revealed" : "correct", message, stars, next: toClient(sessionId, done, nextPlanned) };
}

function summarize(s: SessionState): SessionSummary {
  const by = new Map<string, { correct: number; total: number }>();
  for (const it of s.items) {
    const e = by.get(it.skillId) ?? { correct: 0, total: 0 };
    e.total++; if (it.correct) e.correct++;
    by.set(it.skillId, e);
  }
  const correct = s.items.filter((x) => x.correct).length;
  const stars = s.items.reduce((a, x) => a + (x.correct && x.hintLevel === 0 ? 2 : 1), 0);
  return {
    correct, total: s.items.length, stars,
    skills: [...by.entries()].map(([id, v]) => ({ title: KID_TITLE.get(id) ?? id, ...v })),
  };
}

export async function starTotal(childId: string): Promise<number> {
  const { data } = await supabaseAdmin().from("reward_totals").select("total").eq("child_id", childId).eq("kind", "stars").maybeSingle();
  return data?.total ?? 0;
}
