import type { RoundQuestion } from "@/lib/rounds";

export interface GameProps {
  q: RoundQuestion;
  /** Sekunder per uppgift. 0 = ingen klocka. */
  seconds: number;
  /** Uppgiftens plats i omgången (för variation, t.ex. vilket påstående som visas). */
  index: number;
  onAnswer: (correct: boolean, hint?: number) => void;
  /** Fånga talen: klämmisen som fångar (färdig SVG från servern), eller null. */
  buddySvg?: string | null;
  /** Talkross: hur rutorna fungerar på det här steget. */
  kross?: { mul: boolean; k: number; hi: number };
}

import type { RoundAnswer } from "@/lib/rounds";

/** Spel som spelas på en skärm med alla uppgifter på en gång: Minnet, Spurten och Striden. */
export interface BoardProps {
  questions: RoundQuestion[];
  /** Hela klockan i sekunder (Minnet, Spurten). 0 = ingen klocka. */
  clock: number;
  /** Sekunder per uppgift (Striden). */
  seconds: number;
  /** Spurten: så många rätt krävs. */
  goal: number;
  hero?: { svg: string; name: string; stats: { mj: number; st: number; gl: number; kl: number; kraft: number } };
  boss?: { name: string; svg: string };
  fight?: { maxB: number; hit: number; maxH: number; baseD: number; crit: number; timeX: number };
  /** Skickar svaren (med uppgiftens plats i `i`) och om rundan nåddes till slut. */
  onDone: (answers: RoundAnswer[], completed: boolean) => void;
}
