"use client";

import { useCallback, useEffect, useState } from "react";
import { QuestionVisual } from "../Visuals";
import { Clock } from "./Clock";
import { fmt } from "@/lib/num";
import type { GameProps } from "./types";

const COLORS = ["#ffd6e7", "#cfe6ff", "#c9f0e1", "#fff3b8"];

/** Bubbelpop: tryck på bubblan med rätt svar. Fel bubbla spricker och räknas som fel. */
export function Bubbel({ q, seconds, onAnswer }: GameProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const ok = picked === q.answer;
  const timeout = useCallback(() => setPicked(-1), []);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => onAnswer(ok), ok ? 700 : 1600);
    return () => window.clearTimeout(t);
  }, [done, ok, onAnswer]);

  return (
    <div className="kort flex flex-col gap-4 p-4">
      <Clock seconds={seconds} stopped={done} onTimeout={timeout} />
      <p className="hjalptext">{q.skillTitle}</p>
      {q.visual && <QuestionVisual visual={q.visual} />}
      <h2 className="text-center" style={{ fontSize: q.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{q.prompt}</h2>
      <div className="grid grid-cols-2 gap-5 px-2 py-3">
        {q.choices.map((c, i) => {
          const isPicked = picked === c, right = c === q.answer;
          return (
            <button key={c} type="button" disabled={done} onClick={() => setPicked(c)}
              className={`bubbla display mx-auto flex aspect-square w-full max-w-[130px] items-center justify-center rounded-full ${done && isPicked && !right ? "bubbla--pang" : ""}`}
              style={{ background: done && right ? "var(--mynta)" : COLORS[i % 4], color: done && right ? "#fff" : "var(--plommon)",
                fontSize: "var(--t-2xl)", animationDelay: `${i * 0.35}s` }}
              aria-label={`Bubbla ${fmt(c)}`}>
              {fmt(c)}
            </button>
          );
        })}
      </div>
      <p className="min-h-[1.5em] text-center font-semibold" role="status" style={{ color: ok ? "var(--mynta)" : "var(--plommon)" }}>
        {done ? (ok ? "Pang! Rätt!" : `Rätt bubbla var ${fmt(q.answer)}.`) : ""}
      </p>
    </div>
  );
}
