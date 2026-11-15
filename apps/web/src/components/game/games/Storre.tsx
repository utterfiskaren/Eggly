"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock } from "./Clock";
import { fmt } from "@/lib/num";
import type { GameProps } from "./types";

const expr = (p: string) => p.replace(/\s*=\s*\?$/, "");

/**
 * Vem är störst?: två uppgifter bredvid varandra. Vilken blir störst, eller blir de lika?
 * Servern väljer paret så att svaren oftast ligger nära varandra och ibland är lika.
 */
export function Storre({ q, seconds, onAnswer, index }: GameProps) {
  const other = q.other ?? { prompt: q.prompt, answer: q.answer };
  const flip = (index * 5 + Math.floor(Math.abs(q.answer) * 100)) % 2 === 1;
  const mine = { p: q.prompt, a: q.answer };
  const theirs = { p: other.prompt, a: other.answer };
  const left = flip ? theirs : mine;
  const right = flip ? mine : theirs;
  const truth: "l" | "r" | "eq" = left.a > right.a ? "l" : left.a < right.a ? "r" : "eq";
  const [said, setSaid] = useState<"l" | "r" | "eq" | "time" | null>(null);
  const timeout = useCallback(() => setSaid("time"), [setSaid]);
  const done = said !== null;
  const ok = said === truth;
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => onAnswer(ok), ok ? 900 : 2000);
    return () => window.clearTimeout(t);
  }, [done, ok, onAnswer]);

  const card = (side: "l" | "r", e: { p: string; a: number }) => {
    const mark = done ? (truth === side ? "var(--mynta)" : truth === "eq" ? "var(--mynta)" : "var(--dimma)") : "var(--dimma)";
    return (
      <button type="button" disabled={done} onClick={() => setSaid(side)}
        className="kort kort--klick display flex min-h-[110px] flex-col items-center justify-center gap-1 p-3 disabled:cursor-default"
        style={{ fontSize: e.p.length > 9 ? "var(--t-xl)" : "var(--t-2xl)", borderColor: mark }}
        aria-label={`${expr(e.p)}`}>
        <span>{expr(e.p)}</span>
        {done && <span className="hjalptext" style={{ fontSize: "var(--t-md)" }}>= {fmt(e.a)}</span>}
      </button>
    );
  };

  return (
    <div className="kort flex flex-col gap-4 p-4">
      <Clock seconds={seconds} stopped={done} onTimeout={timeout} />
      <h2 className="text-center" style={{ fontSize: "var(--t-xl)" }}>Vilket blir störst?</h2>
      <div className="grid grid-cols-2 gap-3">{card("l", left)}{card("r", right)}</div>
      <button type="button" className="squish squish--mjuk" disabled={done} onClick={() => setSaid("eq")}>Lika mycket</button>
      <p className="min-h-[1.5em] text-center font-semibold" role="status" style={{ color: ok ? "var(--mynta)" : "var(--plommon)" }}>
        {done ? (ok ? "Precis!" : said === "time" ? `Tiden tog slut. ${fmt(left.a)} och ${fmt(right.a)}.` : `Inte riktigt. ${fmt(left.a)} och ${fmt(right.a)}.`) : ""}
      </p>
    </div>
  );
}
