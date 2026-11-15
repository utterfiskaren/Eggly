"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock } from "./Clock";
import type { GameProps } from "./types";

const DEFAULT = { mul: false, k: 2, hi: 9 };
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/**
 * Talkross: tryck på rutor som tillsammans blir målet (plus eller gånger). Rutorna slumpas i
 * webbläsaren; målet byggs av k slumpade rutor, så det finns alltid en lösning.
 */
export function Krossa({ seconds, onAnswer, kross }: GameProps) {
  const mode = kross ?? DEFAULT;
  // Ett nytt bräde för varje uppgift (spelet byggs om för varje uppgift), därför bara en gång här.
  const [{ tiles, target }] = useState(() => {
    const t = Array.from({ length: 16 }, () => rnd(mode.mul ? 2 : 1, mode.hi));
    const ix = [...t.keys()].sort(() => Math.random() - 0.5).slice(0, mode.k);
    const value = ix.reduce((a, i) => (mode.mul ? a * t[i] : a + t[i]), mode.mul ? 1 : 0);
    return { tiles: t, target: value };
  });
  const [sel, setSel] = useState<number[]>([]);
  const [state, setState] = useState<"play" | "right" | "wrong" | "time">("play");
  const calc = (xs: number[]) => xs.reduce((a, i) => (mode.mul ? a * tiles[i] : a + tiles[i]), mode.mul ? 1 : 0);
  const timeout = useCallback(() => setState("time"), []);

  function toggle(i: number) {
    if (state !== "play") return;
    const next = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i];
    setSel(next);
    if (next.length === mode.k) setState(calc(next) === target ? "right" : "wrong");
  }
  useEffect(() => {
    if (state === "play") return;
    const t = window.setTimeout(() => onAnswer(state === "right"), state === "right" ? 700 : 1600);
    return () => window.clearTimeout(t);
  }, [state, onAnswer]);

  const how = `Välj ${mode.k} rutor (${mode.mul ? "gånger" : "plus"})`;
  const sign = mode.mul ? " · " : " + ";
  const line = sel.length ? sel.map((i) => tiles[i]).join(sign) + (sel.length === mode.k ? ` = ${calc(sel)}` : "") : how;
  return (
    <div className="kort flex flex-col gap-3 p-4">
      <Clock seconds={seconds} stopped={state !== "play"} onTimeout={timeout} />
      <h2 className="text-center" style={{ fontSize: "var(--t-3xl)" }}>Gör {target}</h2>
      <p className="text-center font-semibold" role="status">
        {state === "right" ? "Rätt!" : state === "wrong" ? `Det blev ${calc(sel)}. Det gick inte den här gången.` : state === "time" ? "Tiden tog slut!" : line}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((v, i) => {
          const on = sel.includes(i);
          const bg = state === "right" && on ? "var(--mynta)" : state === "wrong" && on ? "var(--jordgubb)" : on ? "var(--citron)" : "var(--vit)";
          return (
            <button key={i} type="button" onClick={() => toggle(i)} disabled={state !== "play"} aria-pressed={on}
              className="display flex min-h-[56px] items-center justify-center rounded-[var(--r-md)] border-2 border-[var(--dimma)] shadow-[0_4px_0_var(--dimma)] disabled:cursor-default"
              style={{ background: bg, color: (state === "right" || state === "wrong") && on ? "#fff" : "var(--plommon)", fontSize: "var(--t-xl)", minHeight: 64 }}>
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
