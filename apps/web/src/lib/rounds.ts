import "server-only";
import {
  GAME_NAMES, STEPS, TEMPO, TIER_RANK, WORLD_BOSSES, ARCADE_LEVELS, arcadeEggTier, arcadeLives, arcadeSkills, bossSvg, eggSvg, mathSkills, roundStars,
  speciesById, squishySvg, squishyStats, tierBase,
  type ArcadeOp, type GameId, type Step, type Stats,
} from "@eggly/content";
import {
  MATH_SKILLS_WITH_TEMPLATES, distractors, emptySkill, entryGradeFor, fightNumbers, hashSeed, kioskLevel, kioskTask, krossMode,
  mathTemplates, minneClock, newSession, pickPartner, planRound, recordAnswer, seededRng, spurtPlan, spurtStars,
  type ChildModel, type FightNumbers, type KrossMode, type Planned, type Representation, type SessionState, type SkillState, type Visual,
} from "@eggly/engine";
import { supabaseAdmin } from "./supabase/admin";
import { clearStep, collection, openStep } from "./world";

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
export const BUILT: GameId[] = ["rakna", "bubbel", "sant", "fanga", "storre", "krossa", "kiosk", "minne", "spurt", "strid"];
const STAND_IN: Record<GameId, GameId> = {
  rakna: "rakna", bubbel: "bubbel", sant: "sant", minne: "minne", fanga: "fanga", kiosk: "kiosk",
  krossa: "krossa", storre: "storre", spurt: "spurt", strid: "strid",
};
export const playedAs = (g: GameId): GameId => (BUILT.includes(g) ? g : STAND_IN[g]);

const GAME_CFG: Record<GameId, { reps?: Representation[]; n: number }> = {
  rakna: { reps: ["symbol", "missing", "story", "visual"], n: 10 },
  bubbel: { n: 10 }, sant: { n: 12 }, fanga: { n: 10 }, storre: { reps: ["symbol"], n: 10 }, krossa: { n: 8 },
  minne: { reps: ["symbol"], n: 6 }, kiosk: { reps: ["symbol", "story"], n: 6 },
  // Spurten och Striden behöver många uppgifter i reserv: hur många som går åt beror på barnet.
  spurt: { reps: ["symbol", "missing"], n: 60 }, strid: { reps: ["symbol", "missing"], n: 40 },
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
  /** Vem är störst?: uppgiften att jämföra med (bara texten och svaret). */
  other?: { prompt: string; answer: number };
  /** Kiosken: texten (**fetstil**) och varans bild. Summan som ska läggas är `answer`. */
  kiosk?: { say: string; svg: string };
}

export interface Round {
  roundId: string;
  step: { id: string; title: string; game: GameId; played: GameId; tempo: number; seconds: number; lives: number; tier: number; index: number; world: number };
  questions: RoundQuestion[];
  /** Klämmisen som fångar i Fånga talen: barnets bästa (färdig SVG), eller null om samlingen är tom. */
  buddySvg?: string | null;
  /** Talkross: hur rutorna fungerar på det här steget. */
  kross?: KrossMode;
  /** Sant om omgången är ett spel från Alla spel och inte ett steg på kartan. */
  arcade?: boolean;
  /** Minnet och Spurten: hela klockan i sekunder (0 = ingen klocka). */
  clock?: number;
  /** Spurten: så många rätt krävs. */
  goal?: number;
  /** Striden: kämpen (barnets starkaste klämmis), bossen och siffrorna för kampen. */
  hero?: { svg: string; name: string; stats: Stats };
  boss?: { name: string; svg: string };
  fight?: FightNumbers;
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

/** Hur länge ett spel får ta per uppgift, jämfört med stegets tempo (som i Eggly 1). */
const SECONDS_X: Partial<Record<GameId, number>> = { storre: 1.5, kiosk: 2.4, krossa: 1.6 };

const blank = (): RoundQuestion => ({ prompt: "", input: "number", answer: 0, choices: [], skillTitle: "", hints: [] });
const EXPR = /=\s*\?$/;

/** Barnets bästa klämmis (högsta nivån), som fångar i Fånga talen. */
async function loadBuddy(childId: string): Promise<string | null> {
  const owned = await collection(childId);
  let best: (typeof owned)[number] | undefined;
  let bestRank = -1;
  for (const o of owned) {
    const rank = TIER_RANK[speciesById(o.squishyId)?.tier ?? 0] ?? 0;
    if (rank > bestRank) { best = o; bestRank = rank; }
  }
  return best ? squishySvg(best.squishyId, best.treats) : null;
}

/** Det en omgång behöver veta: kommer från ett steg på kartan eller från Alla spel. */
interface RoundSpec {
  id: string; title: string; game: GameId; tempo: number; n: number; skills: string[];
  world: number; lives: number; tier: number; index: number;
  arcade?: boolean;
}

/** Kämpen i Striden: barnets starkaste klämmis. Utan klämmis (inget ägg kläckt än) en startkatt. */
async function loadFighter(childId: string): Promise<{ svg: string; name: string; stats: Stats }> {
  const owned = await collection(childId);
  let best: { svg: string; name: string; stats: Stats } | undefined;
  for (const o of owned) {
    const stats = squishyStats(o.squishyId, o.seed, o.treats);
    if (!best || stats.kraft > best.stats.kraft) best = { svg: squishySvg(o.squishyId, o.treats), name: speciesById(o.squishyId)?.name ?? "Klämmis", stats };
  }
  if (best) return best;
  const treats = { bow: "rosett" };
  return { svg: squishySvg("mochi", treats), name: "Mochi-katten", stats: squishyStats("mochi", 0, treats) };
}

export async function startRound(childId: string, stepId: string): Promise<Round | null> {
  const step = await openStep(childId, stepId);
  if (!step) return null;
  return buildRound(childId, {
    id: step.id, title: step.title, game: step.game, tempo: step.tempo, n: step.n, skills: step.skills,
    world: step.world, lives: livesFor(step), tier: step.tier, index: step.index,
  });
}

export interface ArcadeChoice { game: GameId; op: ArcadeOp; level: number; tempo: number }

/** Alla spel: ett spel barnet valt själv. Null om valet inte stämmer (okänt spel, matteslag som inte finns på nivån). */
export async function startArcadeRound(childId: string, c: ArcadeChoice): Promise<Round | null> {
  const level = Math.round(c.level), tempo = Math.round(c.tempo);
  if (!BUILT.includes(c.game) || !(level >= 1 && level <= ARCADE_LEVELS.length) || !(tempo >= 0 && tempo <= 4)) return null;
  const skills = arcadeSkills(level, c.op);
  if (skills.length === 0) return null;
  return buildRound(childId, {
    id: `fritt:${c.game}`, title: GAME_NAMES[c.game], game: c.game, tempo, n: 0, skills,
    world: level - 1, lives: arcadeLives(level), tier: arcadeEggTier(level, tempo), index: -1, arcade: true,
  });
}

async function buildRound(childId: string, step: RoundSpec): Promise<Round | null> {
  let played = playedAs(step.game);
  const cfg = GAME_CFG[played];
  const db = supabaseAdmin();
  const { data: sess, error } = await db.from("play_sessions")
    .insert({ child_id: childId, subject: "matte", mode: "aventyr", activity: step.arcade ? step.id : `steg:${step.id}` })
    .select("id").single();
  if (error || !sess) throw new Error("Omgången gick inte att starta");
  const child = await loadChild(childId);
  const session = newSession(sess.id, "aventyr", { skills: step.skills, source: "child_choice" });
  const rng = seededRng(hashSeed(`${sess.id}:${Date.now()}`));
  const n = step.n > 0 ? step.n : cfg.n;
  const ctx = { now: Date.now(), rng, available: MATH_SKILLS_WITH_TEMPLATES, representations: cfg.reps };

  let plan: Planned[] = [];
  let questions: RoundQuestion[];
  let free = 0;
  let kross: KrossMode | undefined;
  let buddySvg: string | null | undefined;
  let clock: number | undefined, goal: number | undefined, noLives = false;
  let hero: Round["hero"], boss: Round["boss"], fight: FightNumbers | undefined;

  if (played === "kiosk") {
    free = n;
    questions = Array.from({ length: n }, () => {
      const t = kioskTask(rng, kioskLevel(step.world));
      return { ...blank(), answer: t.need, prompt: t.say.replaceAll("**", ""), kiosk: { say: t.say, svg: squishySvg(t.itemId) } };
    });
  } else if (played === "krossa") {
    free = n;
    kross = krossMode(step.world + 1);
    questions = Array.from({ length: n }, blank);
  } else if (played === "storre") {
    // Planera extra uppgifter och para ihop dem. Bara första uppgiften i varje par räknas för barnet.
    const pool = planRound(child, session, n * 4, ctx).filter((p) => EXPR.test(p.question.prompt) && !p.question.visual);
    const mine = pool.slice(0, n), rest = pool.slice(n);
    const taken = new Set<number>();
    const paired: { a: Planned; b: Planned }[] = [];
    for (const a of mine) {
      const at = pickPartner(rng, a.question.answer, rest.map((r) => ({ answer: r.question.answer })), taken);
      if (at < 0) continue;
      taken.add(at);
      paired.push({ a, b: rest[at] });
    }
    if (paired.length >= Math.min(4, n)) {
      plan = paired.map((x) => x.a);
      questions = paired.map(({ a, b }) => ({
        ...toRoundQuestion(a, rng), other: { prompt: b.question.prompt, answer: b.question.answer },
      }));
    } else {
      // Motorn hittade för få uppgifter att jämföra (t.ex. bara bildfrågor på det här stoppet): spela som Bubbelpop.
      played = "bubbel";
      plan = planRound(child, session, n, { ...ctx, representations: undefined });
      questions = plan.map((p) => toRoundQuestion(p, rng));
    }
  } else if (played === "minne") {
    // Par av uppgift och svar. Alla svar måste vara olika, annars går paren inte att skilja åt.
    const pairs = Math.max(4, Math.min(8, n));
    const seen = new Set<number>();
    const chosen = planRound(child, session, pairs * 5, ctx)
      .filter((p) => EXPR.test(p.question.prompt) && !p.question.visual && !seen.has(p.question.answer) && !!seen.add(p.question.answer))
      .slice(0, pairs);
    if (chosen.length >= 4) {
      plan = chosen;
      questions = plan.map((p) => toRoundQuestion(p, rng));
      clock = minneClock(step.tempo, step.world, plan.length);
      noLives = true;
    } else {
      played = "bubbel";
      plan = planRound(child, session, n, { ...ctx, representations: undefined });
      questions = plan.map((p) => toRoundQuestion(p, rng));
    }
  } else if (played === "spurt") {
    const sp = spurtPlan(step.tempo, step.world);
    plan = planRound(child, session, n, ctx);
    questions = plan.map((p) => toRoundQuestion(p, rng));
    clock = sp.total; goal = sp.goal; noLives = true;
  } else if (played === "strid") {
    plan = planRound(child, session, n, ctx);
    questions = plan.map((p) => toRoundQuestion(p, rng));
    hero = await loadFighter(childId);
    boss = { name: WORLD_BOSSES[step.tier] ?? "Bossen", svg: bossSvg(step.tier) };
    fight = fightNumbers(tierBase(step.tier), hero.stats);
    noLives = true;
  } else {
    plan = planRound(child, session, n, ctx);
    questions = plan.map((p) => toRoundQuestion(p, rng));
    if (played === "fanga") buddySvg = await loadBuddy(childId);
  }

  await db.from("pending_questions").insert({
    session_id: sess.id, child_id: childId, item_index: 0,
    planned: {
      round: plan, step: step.id, free, game: played, noLives, ...(goal ? { goal } : {}),
      ...(step.arcade ? { arcade: { tier: step.tier, lives: step.lives, skills: step.skills } } : {}),
    },
  });
  return {
    roundId: sess.id,
    step: {
      id: step.id, title: step.title, game: step.game, played, tempo: step.tempo,
      seconds: Math.round(TEMPO[step.tempo].sec * (SECONDS_X[played] ?? 1) * (fight?.timeX ?? 1) * 10) / 10,
      lives: noLives ? 0 : step.lives, tier: step.tier, index: step.index, world: step.world,
    },
    questions, buddySvg, kross, arcade: step.arcade ? true : undefined, clock, goal, hero, boss, fight,
  };
}

/** `i` är uppgiftens plats i omgången. Utan `i` räknas svaren i den ordning de kommer (Minnet skickar bara de par som hittades). */
export interface RoundAnswer { correct: boolean; hint?: number; i?: number }
export interface RoundResult {
  passed: boolean;
  right: number;
  wrong: number;
  stars: number;
  best: number;
  egg?: number;
  nextStepId?: string;
  /** Alla spel: äggets bild (färdig SVG) och att det inte var ett steg på kartan. */
  eggSvg?: string;
  arcade?: boolean;
}

/**
 * Tar emot omgångens svar. Den väntande omgången tas bort först: skickas svaren två gånger hittar
 * andra försöket ingenting, och inget räknas dubbelt.
 */
export async function finishRound(childId: string, roundId: string, answers: RoundAnswer[], completed: boolean): Promise<RoundResult | null> {
  const db = supabaseAdmin();
  const { data: removed } = await db.from("pending_questions").delete()
    .eq("session_id", roundId).eq("child_id", childId).select("planned");
  const pending = removed?.[0]?.planned as
    { round: Planned[]; step: string; free?: number; game?: GameId; goal?: number; noLives?: boolean; arcade?: { tier: number; lives: number; skills: string[] } } | undefined;
  if (!pending) return null;
  const step = pending.arcade ? undefined : STEPS.find((s) => s.id === pending.step);
  if (!pending.arcade && !step) return null;
  const skillsFocus = pending.arcade?.skills ?? step!.skills;
  const lives = pending.arcade?.lives ?? livesFor(step!);

  const plan = pending.round;
  // Spel utan mattemallar (Kiosken, Talkross) räknas för stjärnor och steg men inte för barnets modell.
  const limit = pending.free ? pending.free : plan.length;
  const taken = new Set<number>();
  const given: (RoundAnswer & { at: number })[] = [];
  answers.forEach((a, pos) => {
    const at = Number.isInteger(a.i) ? (a.i as number) : pos;
    if (at < 0 || at >= limit || taken.has(at)) return;
    taken.add(at);
    given.push({ ...a, at });
  });
  given.sort((x, y) => x.at - y.at);
  const now = Date.now();
  let child = await loadChild(childId);
  let session: SessionState = newSession(roundId, "aventyr", { skills: skillsFocus, source: "child_choice" });
  const touched = new Set<string>();
  const attempts: Record<string, unknown>[] = [];
  given.forEach((a) => {
    const i = a.at;
    const p = plan[i];
    if (!p) return;
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
  const goal = pending.goal ?? 0;
  const passed = completed && given.length > 0
    && (pending.game === "spurt" ? right >= goal : pending.noLives ? true : wrong < lives);

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

  const stars = pending.game === "spurt" ? spurtStars(right, goal) : roundStars(right, wrong);
  if (!passed) return { passed, right, wrong, stars: 0, best: 0 };
  if (pending.arcade) {
    // Fritt spel ger ett ägg efter nivå och tempo. Nyckeln gör att samma omgång aldrig kan ge två ägg.
    await db.from("reward_ledger").insert({
      idempotency_key: `${roundId}:egg`, child_id: childId, kind: "egg", amount: 1, ref: String(pending.arcade.tier), reason: "fritt spel klarat",
    });
    return { passed, right, wrong, stars, best: 0, egg: pending.arcade.tier, eggSvg: eggSvg(pending.arcade.tier), arcade: true };
  }
  const { best } = await clearStep(childId, step!, stars, roundId);
  const next = STEPS[step!.index + 1];
  return { passed, right, wrong, stars, best, egg: step!.tier, nextStepId: next?.id };
}
