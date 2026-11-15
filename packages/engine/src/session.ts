import { mathSkills, type Skill } from "@eggly/content";
import { difficultyForTarget } from "./elo";
import { applyAttempt, emptySkill, recentAccuracy, type SkillState } from "./learner";
import type { Question, Representation, Template } from "./question";
import { mathTemplates } from "./templates/matte";

/**
 * Motorn som väljer nästa uppgift. Regelstyrd och förklarbar: varje val får ett skäl som sparas.
 * Grundregler (från rapporten, startvärden att kalibrera):
 *  - Barnet ska klara ungefär 3 av 4 (Mysigt 9 av 10, Klurigt 2 av 3).
 *  - Högst en svårare "prob" per 8 uppgifter, och bara när färdigheten sitter stabilt.
 *  - Två fel i rad på samma färdighet: mer stöd och lättare variant.
 *  - Tre fel i rad i passet: frustrationsskyddet slår på, inga prober, bara trygga uppgifter.
 *  - XP, nivå och antal dagar påverkar aldrig svårigheten.
 */

export type Mode = "mysigt" | "aventyr" | "klurigt";
export type Reason =
  | "review_due" | "safe_practice" | "challenge_probe" | "scaffold_recovery"
  | "new_skill" | "teacher_assignment" | "child_choice" | "fallback";

export const ENGINE_RULES = {
  target: { mysigt: 0.88, aventyr: 0.78, klurigt: 0.68 } as Record<Mode, number>,
  safeTarget: 0.92,
  probeEvery: 8,
  probeMinAccuracy: 0.85,
  probeMinAttempts: 5,
  probeStep: 0.15,
  guardAfterWrong: 3,
  guardLength: 4,
  maxActiveSkills: 3,
  newSkillsPerSession: 1,
  /** Elo-skalan: mallens svårighet 0–1 motsvarar uppgiftsbetyg från −2 till +2. */
  ratingSpan: 4,
  /** Hur mycket lägre en ny färdighet börjar än barnets genomsnitt. */
  newSkillOffset: 0.3,
  /** Hur mycket lättare uppgifterna blir medan frustrationsskyddet är på. */
  guardShift: -0.25,
};

export interface ChildModel {
  /** Ungefärlig startpunkt i årskurs, från åldersspannet. Bara för var kartan börjar. */
  entryGrade: number;
  skills: Record<string, SkillState>;
}

export interface SessionItem {
  skillId: string;
  templateId: string;
  factKey?: string;
  prompt: string;
  reason: Reason;
  difficulty: number;
  correct?: boolean;
  hintLevel?: number;
}

export interface SessionState {
  id: string;
  mode: Mode;
  items: SessionItem[];
  probes: number;
  newSkills: number;
  guardLeft: number;
  /** Kanske vald av läraren (uppdrag) eller barnet ("Träna det jag har svårt för"). */
  focus?: { skills: string[]; source: "teacher_assignment" | "child_choice" };
}

export interface Planned {
  question: Question;
  reason: Reason;
  itemRating: number;
}

const SKILL_BY_ID = new Map(mathSkills.map((s) => [s.id, s]));

export function entryGradeFor(ageBand: string | null | undefined): number {
  return { "6-8": 1, "9-10": 3, "11-12": 5, "13-15": 6, "16+": 6 }[ageBand ?? ""] ?? 2;
}

export function newSession(id: string, mode: Mode, focus?: SessionState["focus"]): SessionState {
  return { id, mode, items: [], probes: 0, newSkills: 0, guardLeft: 0, focus };
}

/**
 * En färdighet barnet inte mött än börjar på barnets genomsnittliga förmåga i de färdigheter som
 * redan tränats, lite lägre eftersom innehållet är nytt. Annars börjar ett svagt barn för högt och
 * ett starkt för lågt.
 */
export function priorRating(child: ChildModel): number {
  const seen = Object.values(child.skills).filter((s) => s.ratingN > 0);
  if (seen.length === 0) return 0;
  const w = seen.reduce((a, s) => a + Math.min(s.ratingN, 20), 0);
  return seen.reduce((a, s) => a + s.rating * Math.min(s.ratingN, 20), 0) / w - ENGINE_RULES.newSkillOffset;
}

function stateOf(child: ChildModel, skillId: string): SkillState {
  return child.skills[skillId] ?? { ...emptySkill(skillId), rating: priorRating(child) };
}

/** En färdighet barnet antas kunna utifrån åldern: kräver ingen träning för att låsa upp nästa. */
function assumedKnown(child: ChildModel, sk: Skill): boolean {
  return sk.gradeMax <= child.entryGrade - 2;
}

function prereqsOk(child: ChildModel, sk: Skill, available: Set<string>): boolean {
  return sk.prereqs.every((p) => {
    const pre = SKILL_BY_ID.get(p);
    if (!pre || assumedKnown(child, pre)) return true;
    if (!available.has(p)) return true; // förkunskapen tränas inte här: den får inte blockera
    const st = stateOf(child, p);
    return st.status === "secure" || st.status === "mastered";
  });
}

function templateFor(skillId: string): Template {
  const t = mathTemplates.find((x) => x.skillId === skillId);
  if (!t) throw new Error(`ingen mall för ${skillId}`);
  return t;
}

function toD(beta: number): number {
  return Math.min(1, Math.max(0, beta / ENGINE_RULES.ratingSpan + 0.5));
}
function toBeta(d: number): number {
  return (d - 0.5) * ENGINE_RULES.ratingSpan;
}

/** Frågetyp: den som använts minst i passet, med visuellt stöd vid återhämtning och i Mysigt. */
function chooseRepresentation(t: Template, session: SessionState, reason: Reason, rng: () => number, allowed?: Representation[]): Representation {
  const ok = allowed ? t.representations.filter((r) => allowed.includes(r)) : [];
  const base = ok.length ? ok : t.representations;
  // Spel som inte kan rita bilder (de som inte tillåter «visual») får aldrig en bildfråga.
  const reps = allowed && !allowed.includes("visual") && base.some((r) => r !== "visual") ? base.filter((r) => r !== "visual") : base;
  if ((reason === "scaffold_recovery" || session.mode === "mysigt") && reps.includes("visual")) return "visual";
  if (session.mode === "klurigt") {
    const harder = reps.filter((r) => r === "story" || r === "missing");
    if (harder.length && rng() < 0.6) return harder[Math.floor(rng() * harder.length)];
  }
  const counts = reps.map((r) => session.items.filter((it) => it.templateId === t.id && it.prompt.startsWith(`${r}:`)).length);
  const min = Math.min(...counts);
  const pool = reps.filter((_, i) => counts[i] === min);
  return pool[Math.floor(rng() * pool.length)];
}

interface Pick { skillId: string; reason: Reason; target: number; dShift: number; fact?: string }

function chooseSkill(child: ChildModel, session: SessionState, available: string[], now: number, rng: () => number): Pick {
  const avail = new Set(available);
  const target = session.guardLeft > 0 ? ENGINE_RULES.safeTarget : ENGINE_RULES.target[session.mode];
  const last = session.items.slice(-2);

  // 1. Två fel i rad på samma färdighet: stanna kvar men med stöd och lättare variant.
  if (last.length === 2 && last.every((x) => x.correct === false) && last[0].skillId === last[1].skillId) {
    const skillId = last[1].skillId;
    // Redan på lättaste nivån? Gå till en närliggande förkunskap i stället (rapporten 6.4).
    if (last[1].difficulty <= 0.1) {
      const pre = (SKILL_BY_ID.get(skillId)?.prereqs ?? []).filter((p) => avail.has(p));
      if (pre.length) return { skillId: pre[0], reason: "scaffold_recovery", target: ENGINE_RULES.safeTarget, dShift: -0.35 };
    }
    return { skillId, reason: "scaffold_recovery", target: ENGINE_RULES.safeTarget, dShift: -0.35 };
  }

  const pool = (session.focus?.skills.filter((s) => avail.has(s)) ?? []).length
    ? session.focus!.skills.filter((s) => avail.has(s))
    : available;
  const states = pool.map((id) => stateOf(child, id));
  const started = states.filter((s) => s.status !== "not_seen");
  const focusReason: Reason | undefined = session.focus && pool !== available ? session.focus.source : undefined;

  // 2. Förfallen repetition: ungefär var tredje uppgift, eller oftare i "Träna det jag har svårt för".
  const due = started.filter((s) => (s.reviewDueAt ?? Infinity) <= now || s.needsReview)
    .sort((a, b) => (a.reviewDueAt ?? 0) - (b.reviewDueAt ?? 0));
  const reviewShare = session.focus?.source === "child_choice" ? 0.6 : 0.35;
  const reviewedThisSession = session.items.some((x) => x.reason === "review_due");
  if (due.length && (!reviewedThisSession || rng() < reviewShare)) {
    const s = due[0];
    const fact = Object.entries(s.cards).filter(([, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due)[0]?.[0];
    // Faktumet repeteras bara om det inte är mycket svårare än vad barnet klarar just nu (kontrolleras i nextQuestion).
    return { skillId: s.skillId, reason: focusReason ?? "review_due", target, dShift: 0, fact };
  }

  // 3. Prob: bara när en färdighet sitter stabilt, inget fel nyligen, och högst en per 8 uppgifter.
  const recentWrong = session.items.slice(-3).some((x) => x.correct === false);
  const probeAllowed = session.guardLeft === 0 && !recentWrong
    && session.items.length >= 4
    && session.items.slice(-ENGINE_RULES.probeEvery).every((x) => x.reason !== "challenge_probe");
  if (probeAllowed) {
    const ready = started.filter((s) => s.attempts >= ENGINE_RULES.probeMinAttempts && recentAccuracy(s) >= ENGINE_RULES.probeMinAccuracy);
    if (ready.length) {
      const s = ready[Math.floor(rng() * ready.length)];
      return { skillId: s.skillId, reason: "challenge_probe", target, dShift: ENGINE_RULES.probeStep };
    }
  }

  // 4. Ny färdighet: när förkunskaperna sitter och barnet inte redan övar på för många.
  const active = started.filter((s) => s.status === "introduced" || s.status === "practicing");
  // På ett stopp på kartan har barnet själv valt området. Går det bra (fyra rätt i rad utan hjälp)
  // får nästa färdighet i stoppet komma redan i samma pass, så att passet inte blir bara en sorts uppgift.
  const streak = session.items.length >= 4 && session.items.slice(-4).every((x) => x.correct && x.hintLevel === 0);
  const newLimit = session.focus?.source === "child_choice" ? ENGINE_RULES.newSkillsPerSession + 1 : ENGINE_RULES.newSkillsPerSession;
  if (session.guardLeft === 0 && session.newSkills < newLimit && (active.length < ENGINE_RULES.maxActiveSkills || streak)) {
    const fresh = pool
      .map((id) => SKILL_BY_ID.get(id)!)
      .filter((sk) => sk && stateOf(child, sk.id).status === "not_seen" && prereqsOk(child, sk, avail) && sk.gradeMin <= child.entryGrade + 1)
      .sort((a, b) => a.gradeMin - b.gradeMin || a.prereqs.length - b.prereqs.length);
    const needNew = started.length === 0 || active.length === 0 || (streak && session.focus?.source === "child_choice") || (rng() < 0.15 && !recentWrong);
    if (fresh.length && needNew) {
      return { skillId: fresh[0].id, reason: focusReason ?? "new_skill", target: ENGINE_RULES.safeTarget, dShift: 0 };
    }
  }

  // 5. Trygg träning: helst det barnet håller på med, ibland något som redan sitter.
  const practice = active.length ? active : started;
  if (practice.length) {
    const s = practice[Math.floor(rng() * practice.length)];
    return { skillId: s.skillId, reason: focusReason ?? "safe_practice", target, dShift: 0 };
  }
  // Inget påbörjat och inget nytt passar: börja från början av det tillgängliga.
  const first = [...pool].sort((a, b) => (SKILL_BY_ID.get(a)?.gradeMin ?? 9) - (SKILL_BY_ID.get(b)?.gradeMin ?? 9))[0];
  return { skillId: first, reason: "new_skill", target: ENGINE_RULES.safeTarget, dShift: 0 };
}

/** Väljer och skapar nästa uppgift. Faller aldrig: vid fel blir det en trygg reservuppgift (AT-13). */
export function nextQuestion(
  child: ChildModel, session: SessionState,
  ctx: {
    now: number; rng: () => number; available: string[]; itemRating?: (templateId: string) => number;
    /** Frågetyper som spelet kan visa, t.ex. bara siffersvar i ett snabbt spel. Saknas de i mallen används mallens egna. */
    representations?: Representation[];
    /** Inga upprepningar alls (planerade omgångar). */
    unique?: boolean;
  },
): Planned {
  try {
    const available = ctx.available.filter((id) => mathTemplates.some((t) => t.skillId === id));
    if (available.length === 0) throw new Error("inga färdigheter tillgängliga");
    const pick = chooseSkill(child, session, available, ctx.now, ctx.rng);
    const t = templateFor(pick.skillId);
    const st = stateOf(child, pick.skillId);
    const offset = ctx.itemRating ? ctx.itemRating(t.id) : 0;
    // Ju mindre motorn vet om färdigheten, desto försiktigare (närmare 9 av 10).
    const certainty = Math.min(1, st.ratingN / 8);
    const target = pick.target + (ENGINE_RULES.safeTarget - pick.target) * (1 - certainty);
    const beta = difficultyForTarget(st.rating, target) - offset;
    const guard = session.guardLeft > 0 ? ENGINE_RULES.guardShift : 0;
    // Efter ett fel blir nästa uppgift lite lättare, oavsett färdighet (högst −0,3).
    let wrongRow = 0;
    for (let i = session.items.length - 1; i >= 0 && session.items[i].correct === false; i--) wrongRow++;
    const afterWrong = pick.reason === "scaffold_recovery" ? 0 : -Math.min(0.3, 0.12 * wrongRow);
    const d = Math.min(1, Math.max(0, toD(beta) + pick.dShift + afterWrong + (pick.reason === "scaffold_recovery" ? 0 : guard)));
    const rep = chooseRepresentation(t, session, pick.reason, ctx.rng, ctx.representations);

    // Samma uppgift ska inte komma två gånger i samma pass.
    const seen = new Set(session.items.map((it) => it.factKey ?? it.prompt));
    let q = t.generate(ctx.rng, d, rep, pick.fact);
    if (pick.fact && q.difficulty > d + 0.25) q = t.generate(ctx.rng, d, rep);
    for (let i = 0; i < 12 && seen.has(q.factKey ?? q.prompt); i++) q = t.generate(ctx.rng, d, rep);
    // I en planerad omgång (minispel) får samma uppgift aldrig komma två gånger. Räcker inte talen på
    // den här nivån vidgas svårigheten lite i taget, oftast åt det lättare hållet.
    for (let i = 0; ctx.unique && i < 24 && seen.has(q.factKey ?? q.prompt); i++) {
      const spread = 0.03 * (i + 1);
      q = t.generate(ctx.rng, Math.min(1, Math.max(0, d + (i % 3 === 2 ? spread / 2 : -spread))), rep);
    }
    return { question: q, reason: pick.reason, itemRating: toBeta(q.difficulty) + offset };
  } catch {
    return fallbackQuestion(ctx.rng);
  }
}

export function fallbackQuestion(rng: () => number): Planned {
  const t = templateFor("ma.add.inom10");
  const q = t.generate(rng, 0.1, "visual");
  return { question: q, reason: "fallback", itemRating: toBeta(q.difficulty) };
}

export interface AnswerOutcome {
  child: ChildModel;
  session: SessionState;
  /** Förväntad sannolikhet att svara rätt, för uppföljning av hur lagom svårt det var. */
  expected: number;
  frustrationGuard: boolean;
}

/** Registrerar ett svar. Uppdaterar bara färdigheten, aldrig äventyrsnivå eller XP. */
export function recordAnswer(
  child: ChildModel, session: SessionState, planned: Planned, correct: boolean, hintLevel: number, now: number,
): AnswerOutcome {
  const prev = stateOf(child, planned.question.skillId);
  const res = applyAttempt(prev, {
    question: planned.question, correct, hintLevel, sessionId: session.id, now,
    itemRating: planned.itemRating, itemN: 50,
  });
  const items = [...session.items, {
    skillId: planned.question.skillId, templateId: planned.question.templateId, factKey: planned.question.factKey,
    prompt: `${planned.question.representation}:${planned.question.prompt}`, reason: planned.reason,
    difficulty: planned.question.difficulty, correct, hintLevel,
  }];
  const wrongStreak = (() => { let n = 0; for (let i = items.length - 1; i >= 0 && items[i].correct === false; i--) n++; return n; })();
  const rightStreak = (() => { let n = 0; for (let i = items.length - 1; i >= 0 && items[i].correct === true; i--) n++; return n; })();
  let guardLeft = session.guardLeft;
  if (wrongStreak >= ENGINE_RULES.guardAfterWrong) guardLeft = ENGINE_RULES.guardLength;
  else if (guardLeft > 0) guardLeft = rightStreak >= 3 ? 0 : guardLeft - 1;

  return {
    child: { ...child, skills: { ...child.skills, [prev.skillId]: res.state } },
    session: {
      ...session, items, guardLeft,
      probes: session.probes + (planned.reason === "challenge_probe" ? 1 : 0),
      newSkills: session.newSkills + (prev.status === "not_seen" ? 1 : 0),
    },
    expected: res.expected,
    frustrationGuard: guardLeft > 0,
  };
}

/**
 * Planerar en hel omgång i förväg, för minispel där svaren måste rättas direkt i webbläsaren.
 * Motorn väljer som om barnet svarar rätt (bara i passets minne, inte i barnets modell), så att
 * omgången varierar och kan gå vidare till nästa färdighet. Barnets modell uppdateras först när
 * de riktiga svaren kommer, med recordAnswer, i samma ordning.
 */
export function planRound(
  child: ChildModel, session: SessionState, n: number,
  ctx: Parameters<typeof nextQuestion>[2],
): Planned[] {
  const out: Planned[] = [];
  let s = session;
  for (let i = 0; i < n; i++) {
    const p = nextQuestion(child, s, { ...ctx, unique: true });
    out.push(p);
    s = {
      ...s,
      items: [...s.items, {
        skillId: p.question.skillId, templateId: p.question.templateId, factKey: p.question.factKey,
        prompt: `${p.question.representation}:${p.question.prompt}`, reason: p.reason,
        difficulty: p.question.difficulty, correct: true, hintLevel: 0,
      }],
      newSkills: s.newSkills + (stateOf(child, p.question.skillId).status === "not_seen"
        && !s.items.some((it) => it.skillId === p.question.skillId) ? 1 : 0),
    };
  }
  return out;
}
