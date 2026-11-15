"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { avslutaSteg, startaFrittSpel, startaSteg } from "@/app/actions/spel";
import type { Round, RoundAnswer, RoundResult } from "@/lib/rounds";
import { Rakna } from "./games/Rakna";
import { Bubbel } from "./games/Bubbel";
import { Sant } from "./games/Sant";
import { Fanga } from "./games/Fanga";
import { Storre } from "./games/Storre";
import { Krossa } from "./games/Krossa";
import { Kiosk } from "./games/Kiosk";
import type { GameProps } from "./games/types";

const GAMES: Record<string, (p: GameProps) => React.ReactNode> = {
  rakna: Rakna, bubbel: Bubbel, sant: Sant, fanga: Fanga, storre: Storre, krossa: Krossa, kiosk: Kiosk,
};

/**
 * Spelar en omgång på ett steg: hämtar uppgifterna, visar rätt minispel, håller koll på hjärtan
 * och klocka, och skickar svaren när omgången är slut. Servern avgör om steget är klarat.
 */
export interface ArcadeSpec { game: string; op: string; level: number; tempo: number }

export function RoundPlayer({ stepId, eggSvg, arcade, onActive }: { stepId?: string; eggSvg?: string; arcade?: ArcadeSpec; onActive?: (active: boolean) => void }) {
  const [round, setRound] = useState<Round | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<RoundAnswer[]>([]);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sent = useRef(false);

  const lives = round ? round.step.lives - answers.filter((a) => !a.correct).length : 0;
  const done = !!round && (i >= round.questions.length || lives <= 0);

  const playing = !!round && !done;
  useEffect(() => { onActive?.(playing); }, [playing, onActive]);

  function begin() {
    setError(null); setResult(null); setAnswers([]); setI(0); sent.current = false;
    start(async () => {
      try {
        const r = arcade ? await startaFrittSpel(arcade.game, arcade.op, arcade.level, arcade.tempo) : await startaSteg(stepId ?? "");
        if (!r) setError(arcade ? "Det här valet går inte att spela just nu." : "Det här steget är inte öppet än.");
        else setRound(r);
      } catch { setError("Något gick fel med anslutningen. Försök igen."); }
    });
  }

  const onAnswer = useCallback((correct: boolean, hint = 0) => {
    setAnswers((a) => [...a, { correct, hint }]);
    setI((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!round || !done || sent.current) return;
    sent.current = true;
    start(async () => {
      try { setResult(await avslutaSteg(round.roundId, answers, true)); }
      catch { setError("Svaren kom inte fram. Kontrollera nätet och försök igen."); sent.current = false; }
    });
  }, [round, done, answers]);

  if (!round) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button className="squish" onClick={begin} disabled={pending} autoFocus>{pending ? "Kläcker uppgifter …" : "Starta"}</button>
        {error && <p role="alert" className="felruta">{error}</p>}
      </div>
    );
  }

  if (done) {
    return (
      <section className="kort flex flex-col items-center gap-4 p-6 text-center" aria-live="polite">
        {!result ? <p>{pending ? "Räknar ihop …" : error}</p> : result.passed ? (
          <>
            <h2 style={{ fontSize: "var(--t-2xl)" }}>Klarat!</h2>
            <p className="text-3xl tracking-wider" aria-label={`${result.stars} av 5 stjärnor`}>
              <span aria-hidden="true" style={{ color: "#e0a51c" }}>{"★".repeat(result.stars)}</span>
              <span aria-hidden="true" className="opacity-20">{"★".repeat(5 - result.stars)}</span>
            </p>
            <p>{result.right} rätt{result.wrong ? `, ${result.wrong} fel` : ""}. +{result.right} <span aria-hidden="true">⭐</span></p>
            <div className="flex items-center gap-3">
              <span className="inline-block h-20 w-16 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: result.eggSvg ?? eggSvg ?? "" }} />
              <p className="text-left font-semibold">Du fick ett ägg!</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/spela/samling" className="squish">Kläck ägget</Link>
              {result.arcade && <button className="squish squish--mjuk" onClick={begin} disabled={pending}>Spela igen</button>}
              {result.arcade && <Link href="/spela/spel" className="squish squish--mjuk">Alla spel</Link>}
              {!result.arcade && result.nextStepId && <Link href={`/spela/matte/steg/${result.nextStepId}`} className="squish squish--mjuk">Nästa steg</Link>}
              {!result.arcade && <Link href="/spela/matte" className="squish squish--mjuk">Till kartan</Link>}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: "var(--t-2xl)" }}>Nästan!</h2>
            <p>{result.right} rätt. Hjärtana tog slut den här gången, men allt du övade på räknas. Försök igen!</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button className="squish" onClick={begin} disabled={pending}>Försök igen</button>
              <Link href={arcade ? "/spela/spel" : "/spela/matte"} className="squish squish--mjuk">{arcade ? "Alla spel" : "Till kartan"}</Link>
            </div>
          </>
        )}
        {error && result === null && !pending && <button className="squish" onClick={() => { sent.current = false; setError(null); setAnswers((a) => [...a]); }}>Skicka igen</button>}
      </section>
    );
  }

  const Game = GAMES[round.step.played] ?? Rakna;
  const q = round.questions[i];
  return (
    <section className="flex flex-col gap-3" aria-label={`Uppgift ${i + 1} av ${round.questions.length}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{i + 1} av {round.questions.length}</span>
        <span aria-label={`${lives} hjärtan kvar`} className="text-xl tracking-wide">
          <span aria-hidden="true">{"♥".repeat(Math.max(0, lives))}</span>
          <span aria-hidden="true" className="opacity-25">{"♥".repeat(Math.max(0, round.step.lives - lives))}</span>
        </span>
        <Link href={arcade ? "/spela/spel" : "/spela/matte"} className="lank text-sm">Avsluta</Link>
      </div>
      <Game key={i} q={q} seconds={round.step.seconds} onAnswer={onAnswer} index={i} buddySvg={round.buddySvg} kross={round.kross} />
    </section>
  );
}
