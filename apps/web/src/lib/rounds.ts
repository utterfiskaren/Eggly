import "server-only";
import { STEPS, TEMPO, mathSkills, roundStars, type GameId, type Step } from "@eggly/content";
import {
  MATH_SKILLS_WITH_TEMPLATES, distractors, emptySkill, entryGradeFor, hashSeed, mathTemplates, newSession, planRound,
  recordAnswer, seededRng, type ChildModel, type Planned, type Representation, type SessionState, type SkillState, type Visual,
} from "@eggly/engine";
import { supabaseAdmin } from "./supabase/admin";
import { clearStep, openStep } from "./world";

/**
 * Omgångar på kartans steg. Minispelen måste kunna rätta direkt (fallande tal, bubblor, klocka),
 * så hela omgången planeras i förväg av motorn och skickas med facit. När omgången är slut skickar
 * webbläsaren bara vilka uppgifter som blev rätt eller fel. Servern räknar om allt annat själv:
 * vilka uppgifter det var, hur många hjärtan steget har, om steget är klarat och vad det ger.
 * Barnets id kommer alltid från den verifierade inloggningen.
 */

const KID_TITLE = new Map(mathSkills.map((s) => [s.id, s.kidTitle]));

/** Hjärtan per värld (i ordning), som i Eggly 1: fler fel tillåts i de första världarna. */
const LIVES = [5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2];
export const livesFor = (s: Step) => LIVES[Math.min(LIVES.length - 1, s.world)];

/** Spelen som är byggda. Ett steg vars spel inte finns än spelas som det närmaste som finns. */
export const BUILT: GameId[] = ["rakna", "bubbel", "sant"];
const STAND_IN: Record<GameId, GameId> = {
  rakna: "rakna", bubbel: "bubbel", sant: "sant", minne: "bubbel", fanga: "bubbel", kiosk: "rakna",
  krossa: "sant", storre: "bubbel", spurt: "rakna", strid: "rakna",
};
export const playedAs = (g: GameId): GameId => (BUILT.includes(g) ? g : STAND_IN[g]);

const GAME_CFG: Record<GameId, { reps?: Representation[]; n: number }> = {
  rakna: { reps: ["symbol", "missing", "story", "visual"], n: 10 },
  bubbel: { n: 10 }, sant: { n: 12 }, fanga: { n: 12 }, storre: { n: 10 }, krossa: { n: 10 },
  minne: { reps: ["symbol"], n: 6 }, kiosk: { reps: ["symbol", "story"], n: 6 },
  spurt: { reps: ["symbol", "missing"], n: 16 }, strid: { reps: ["symbol", "missing"], n: 12 },
};

export interface RoundQuestion {
  prompt: string;
  input: "number" | "choice";
  answer: number;
  /** Fyra svarsalternativ, alltid med (bubblor och rätt-eller-fel behöver dem). */
  choices: number[];
  visual?: Visual;
  skillTitle: string;
  hints: string[];
}

export interface Round {
  roundId: string;
  step: { id: string; title: string; game: GameId; played: GameId; tempo: number; seconds: number; lives: number; tier: number; index: number };
  questions: RoundQuestion[];
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
    if (m && m.skillId) skills[r.skill_id as string] = { ...emptySkill(r.skill_id as string), ...m };
  }
  return { entryGrade: entryGradeFor(profile?.age_band as string | undefined), skills };
}

function toRoundQuestion(p: Planned, rng: () => number): RoundQuestion {
  const q = p.question;
  const t = mathTemplates.find((x) => x.id === q.templateId);
  const choices = q.choices?.length ? q.choices : distractors(rng, q.answer, [q.answer + 1, q.answer - 1, q.answer + 10]);
  return {
    prompt: q.prompt, input: q.input, answer: q.answer, choices, visual: q.visual,
    skillTitle: KID_TITLE.get(q.skillId) ?? "", hints: t ? t.hints(q) : [],
  };
}

export async function startRound(childId: string, stepId: string): Promise<Round | null> {
  const step = await openStep(childId, stepId);
  if (!step) return null;
  const played = playedAs(step.game);
  const cfg = GAME_CFG[played];
  const db = supabaseAdmin();
  const { data: sess, error } = await db.from("play_sessions")
    .insert({ child_id: childId, subject: "matte", mode: "aventyr", activity: `steg:${step.id}` })
    .select("id").single();
  if (error || !sess) throw new Error("Omgången gick inte att starta");
  const child = await loadChild(childId);
  const session = newSession(sess.id, "aventyr", { skills: step.skills, source: "child_choice" });
  const rng = seededRng(hashSeed(`${sess.id}:${Date.now()}`));
  const n = step.n > 0 ? step.n : cfg.n;
  const plan = planRound(child, session, n, {
    now: Date.now(), rng, available: MATH_SKILLS_WITH_TEMPLATES, representations: cfg.reps,
  });
  await db.from("pending_questions").insert({
    session_id: sess.id, child_id: childId, item_index: 0, planned: { round: plan, step: step.id },
  });
  return {
    roundId: sess.id,
    step: {
      id: step.id, title: step.title, game: step.game, played, tempo: step.tempo, seconds: TEMPO[step.tempo].sec,
      lives: livesFor(step), tier: step.tier, index: step.index,
    },
    questions: plan.map((p) => toRoundQuestion(p, rng)),
  };
}

export interface RoundAnswer { correct: boolean; hint?: number }
export interface RoundResult {
  passed: boolean;
  right: number;
  wrong: number;
  stars: number;
  best: number;
  egg?: number;
  nextStepId?: string;
}

/**
 * Tar emot omgångens svar. Den väntande omgången tas bort först: skickas svaren två gånger hittar
 * andra försöket ingenting, och inget räknas dubbelt.
 */
export async function finishRound(childId: string, roundId: string, answers: RoundAnswer[], completed: boolean): Promise<RoundResult | null> {
  const db = supabaseAdmin();
  const { data: removed } = await db.from("pending_questions").delete()
    .eq("session_id", roundId).eq("child_id", childId).select("planned");
  const pending = removed?.[0]?.planned as { round: Planned[]; step: string } | undefined;
  if (!pending) return null;
  const step = STEPS.find((s) => s.id === pending.step);
  if (!step) return null;

  const plan = pending.round;
  const given = answers.slice(0, plan.length);
  const now = Date.now();
  let child = await loadChild(childId);
  let session: SessionState = newSession(roundId, "aventyr", { skills: step.skills, source: "child_choice" });
  const touched = new Set<string>();
  const attempts: Record<string, unknown>[] = [];
  given.forEach((a, i) => {
    const p = plan[i];
    const hint = Math.max(0, Math.min(3, Math.floor(a.hint ?? 0)));
    const out = recordAnswer(child, session, p, !!a.correct, hint, now);
    child = out.child; session = out.session; touched.add(p.question.skillId);
    attempts.push({
      idempotency_key: `${roundId}:${i}`, session_id: roundId, child_id: childId, skill_id: p.question.skillId,
      template_id: p.question.templateId, template_version: p.question.templateVersion, params: p.question.params,
      representation: p.question.representation, reason: p.reason, difficulty: p.question.difficulty,
      presented_at: new Date(now).toISOString(), answered_at: new Date(now).toISOString(), correct: !!a.correct, hint_level: hint,
    });
  });

  const right = given.filter((a) => a.correct).length;
  const wrong = given.length - right;
  const passed = completed && given.length > 0 && wrong < livesFor(step);

  const writes: PromiseLike<unknown>[] = [];
  for (const id of touched) {
    const sk = child.skills[id];
    writes.push(db.from("child_skill_state").upsert({
      child_id: childId, skill_id: id, status: sk.status, needs_review: sk.needsReview,
      rating: sk.rating, rating_n: sk.ratingN, attempts: sk.attempts, correct: sk.correct,
      hints_used: sk.hintsUsed, representations: sk.representations, sessions_secure: sk.sessionsSecure.length,
      review_due_at: sk.reviewDueAt ? new Date(sk.reviewDueAt).toISOString() : null,
      last_practiced_at: new Date(now).toISOString(), model: sk,
    }));
  }
  if (attempts.length) writes.push(db.from("attempts").insert(attempts));
  // En stjärna per rätt svar, som i Eggly 1.
  if (right > 0) writes.push(db.from("reward_ledger").insert({ idempotency_key: `${roundId}:stars`, child_id: childId, kind: "stars", amount: right, reason: "omgång" }));
  writes.push(db.from("play_sessions").update({ state: session, items_done: given.length, ended_at: new Date(now).toISOString() }).eq("id", roundId));
  await Promise.all(writes);

  const stars = roundStars(right, wrong);
  if (!passed) return { passed, right, wrong, stars: 0, best: 0 };
  const { best } = await clearStep(childId, step, stars, roundId);
  const next = STEPS[step.index + 1];
  return { passed, right, wrong, stars, best, egg: step.tier, nextStepId: next?.id };
}
