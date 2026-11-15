import { review, gradeFor, type Card } from "./fsrs";
import { updateElo } from "./elo";
import type { Question, Representation } from "./question";

export type SkillStatus = "not_seen" | "introduced" | "practicing" | "secure" | "mastered";

/** Barnets bild av en färdighet. Motsvarar raden i eggly.child_skill_state. */
export interface SkillState {
  skillId: string;
  status: SkillStatus;
  needsReview: boolean;
  rating: number;           // Elo-förmåga
  ratingN: number;
  attempts: number;
  correct: number;
  hintsUsed: number;
  /** De senaste svaren, nyast sist: 1 = rätt utan hjälp, 0.5 = rätt med hjälp, 0 = fel. Högst 10. */
  recent: number[];
  representations: Representation[];   // frågetyper som klarats utan hjälp
  sessionsSecure: string[];            // id för pass där färdigheten varit säker (högst 5 sparas)
  cards: Record<string, Card>;         // FSRS per faktum
  reviewDueAt: number | null;
  lastPracticedAt: number | null;
}

export function emptySkill(skillId: string): SkillState {
  return {
    skillId, status: "not_seen", needsReview: false, rating: 0, ratingN: 0, attempts: 0, correct: 0,
    hintsUsed: 0, recent: [], representations: [], sessionsSecure: [], cards: {}, reviewDueAt: null, lastPracticedAt: null,
  };
}

/**
 * Gränser för status. Startvärden enligt rapportens förslag, inte forskningsfastställda normer.
 * Secure: minst 4 av de 6 senaste rätt, högst hälften med hjälp. Mastered: säker i två separata pass
 * och klarad i minst två olika frågetyper.
 */
export const STATUS_RULES = { secureWindow: 6, secureMin: 4, masteredSessions: 2, masteredRepresentations: 2 };

export interface AttemptInput {
  question: Question;
  correct: boolean;
  hintLevel: number;
  sessionId: string;
  now: number;
  /** Uppgiftens svårighet i Elo-skalan, så som motorn valde den. */
  itemRating: number;
  itemN: number;
}

export interface AttemptResult {
  state: SkillState;
  itemRating: number;
  expected: number;
}

export function applyAttempt(prev: SkillState, a: AttemptInput): AttemptResult {
  const s: SkillState = structuredClone(prev);
  const elo = updateElo(s.rating, s.ratingN, a.itemRating, a.itemN, a.correct, a.hintLevel);
  s.rating = elo.theta;
  s.ratingN += 1;
  s.attempts += 1;
  if (a.correct) s.correct += 1;
  if (a.hintLevel > 0) s.hintsUsed += 1;
  s.recent = [...s.recent, a.correct ? (a.hintLevel > 0 ? 0.5 : 1) : 0].slice(-10);
  s.lastPracticedAt = a.now;
  if (a.correct && a.hintLevel === 0 && !s.representations.includes(a.question.representation)) {
    s.representations = [...s.representations, a.question.representation];
  }

  if (a.question.factKey) {
    s.cards[a.question.factKey] = review(s.cards[a.question.factKey], gradeFor(a.correct, a.hintLevel), a.now);
  }

  s.status = nextStatus(s, a.sessionId);
  s.needsReview = s.status !== "not_seen" && s.recent.slice(-3).filter((x) => x === 0).length >= 2;
  s.reviewDueAt = nextReview(s, a.now);
  return { state: s, itemRating: elo.beta, expected: elo.expected };
}

function nextStatus(s: SkillState, sessionId: string): SkillStatus {
  const window = s.recent.slice(-STATUS_RULES.secureWindow);
  const clean = window.filter((x) => x === 1).length;
  const helped = window.filter((x) => x === 0.5).length;
  const secureNow = window.length >= STATUS_RULES.secureWindow - 1 && clean >= STATUS_RULES.secureMin && helped <= window.length / 2;

  if (secureNow && !s.sessionsSecure.includes(sessionId)) {
    s.sessionsSecure = [...s.sessionsSecure, sessionId].slice(-5);
  }
  const mastered = secureNow
    && s.sessionsSecure.length >= STATUS_RULES.masteredSessions
    && s.representations.length >= STATUS_RULES.masteredRepresentations;

  if (mastered) return "mastered";
  if (secureNow) return s.status === "mastered" ? "mastered" : "secure";
  // Bemästrat sjunker inte av ett enstaka fel; repetitionsflaggan sköter det.
  if (s.status === "mastered" && clean >= 3) return "mastered";
  if (s.attempts >= 3) return "practicing";
  return "introduced";
}

/** Nästa repetition: tidigaste förfallna faktum, annars efter 1, 3, 7 eller 14 dagar beroende på status. */
function nextReview(s: SkillState, now: number): number {
  const dues = Object.values(s.cards).map((c) => c.due);
  if (dues.length > 0) return Math.min(...dues);
  const days = { not_seen: 0, introduced: 1, practicing: 1, secure: 3, mastered: 7 }[s.status];
  return now + days * 86_400_000;
}

/** Andel rätt bland de senaste försöken. Rätt med hjälp räknas som ett halvt. */
export function recentAccuracy(s: SkillState, n = 6): number {
  const w = s.recent.slice(-n);
  return w.length === 0 ? 0 : w.reduce((a, b) => a + b, 0) / w.length;
}
