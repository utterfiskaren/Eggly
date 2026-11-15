import type { RoundQuestion } from "@/lib/rounds";

export interface GameProps {
  q: RoundQuestion;
  /** Sekunder per uppgift. 0 = ingen klocka. */
  seconds: number;
  /** Uppgiftens plats i omgången (för variation, t.ex. vilket påstående som visas). */
  index: number;
  onAnswer: (correct: boolean, hint?: number) => void;
}
