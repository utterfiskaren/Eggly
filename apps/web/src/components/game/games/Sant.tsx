"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionVisual } from "../Visuals";
import { Clock } from "./Clock";
import { fmt } from "@/lib/num";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "./types";

/**
 * Rätt eller fel: uppgiften visas med ett svar. Stämmer det? Ungefär hälften av påståendena är
 * sanna. Det felaktiga svaret är ett av motorns vanliga felsvar, så det går inte att gissa på utseendet.
 */
export function Sant({ q, seconds, onAnswer, index }: GameProps) {
  const shown = useMemo(() => {
    const seed = Math.floor(Math.abs(q.answer) * 100);
    const truth = ((index * 7 + seed) % 2) === 0;
    if (truth) return q.answer;
    const wrong = q.choices.filter((c) => c !== q.answer);
    return wrong[(index + seed) % Math.max(1, wrong.length)] ?? q.answer + 1;
  }, [q, index]);
  const [said, setSaid] = useState<boolean | null>(null);
  const truth = shown === q.answer;
  const done = said !== null;
  const ok = done && said === truth;
  const timeout = useCallback(() => setSaid(!truth), [truth]); // tiden ute räknas som fel
  useEffect(() => {
    if (!done) return;
    (ok ? sfx.right : sfx.wrong)();
    const t = window.setTimeout(() => onAnswer(ok), ok ? 700 : 1700);
    return () => window.clearTimeout(t);
  }, [done, ok, onAnswer]);

  const statement = q.prompt.includes("?") && /=\s*\?$/.test(q.prompt) ? q.prompt.replace(/\?$/, fmt(shown)) : `${q.prompt} Svar: ${fmt(shown)}`;
  return (
    <div className="kort flex flex-col gap-4 p-4">
      <Clock seconds={seconds} stopped={done} onTimeout={timeout} />
      <p className="hjalptext">{q.skillTitle}</p>
      {q.visual && <QuestionVisual visual={q.visual} />}
      <h2 className="text-center" style={{ fontSize: statement.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{statement}</h2>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="squish" style={{ background: "var(--mynta)", boxShadow: "0 var(--lift) 0 #157a5c" }}
          disabled={done} onClick={() => setSaid(true)}>Rätt</button>
        <button type="button" className="squish" disabled={done} onClick={() => setSaid(false)}>Fel</button>
      </div>
      <p className="min-h-[1.5em] text-center font-semibold" role="status" style={{ color: ok ? "var(--mynta)" : "var(--plommon)" }}>
        {done ? (ok ? "Precis!" : truth ? "Det stämde faktiskt!" : `Det stämde inte. Svaret är ${fmt(q.answer)}.`) : ""}
      </p>
    </div>
  );
}
