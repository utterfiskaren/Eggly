"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionVisual } from "../Visuals";
import { Clock } from "./Clock";
import { fmt, readNum } from "@/lib/num";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "./types";

/**
 * Räkna: skriv svaret med knappsatsen. Ett fel ger en ledtråd och ett nytt försök.
 * Andra felet (eller tiden) räknas som fel och visar lösningen.
 */
export function Rakna({ q, seconds, onAnswer }: GameProps) {
  const [input, setInput] = useState("");
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<"ask" | "right" | "wrong">("ask");
  const nextRef = useRef<HTMLButtonElement>(null);
  const hint = tries > 0 ? q.hints[Math.min(tries, 2) - 1] : undefined;

  const finish = useCallback((ok: boolean) => { (ok ? sfx.right : sfx.wrong)(); setState(ok ? "right" : "wrong"); }, []);
  const timeout = useCallback(() => finish(false), [finish]);

  function submit() {
    if (state !== "ask" || input === "") return;
    if (Math.abs(readNum(input) - q.answer) < 1e-9) { finish(true); return; }
    if (tries === 0 && !seconds) { setTries(1); setInput(""); return; }
    setTries((t) => t + 1);
    finish(false);
  }
  useEffect(() => { if (state !== "ask") nextRef.current?.focus({ preventScroll: true }); }, [state]);

  function key(k: string) {
    if (state !== "ask") return;
    if (k === "del") setInput((a) => a.slice(0, -1));
    else if (k === "−") setInput((a) => (a === "" ? "−" : a.startsWith("−") ? a.slice(1) : "−" + a));
    else if (k === ",") setInput((a) => (a.includes(",") || !q.keys || q.keys === "neg" ? a : (a === "" || a === "−" ? a + "0," : a + ",")));
    else setInput((a) => (a + k).slice(0, 7));
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== "ask") { if (e.key === "Enter") { e.preventDefault(); nextRef.current?.click(); } return; }
      if (/^\d$/.test(e.key)) key(e.key);
      else if (e.key === "," || e.key === ".") key(",");
      else if (e.key === "-" || e.key === "−") { if (q.keys === "neg" || q.keys === "both") key("−"); }
      else if (e.key === "Backspace") key("del");
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="kort flex flex-col gap-3 p-4">
      <Clock seconds={seconds} stopped={state !== "ask"} onTimeout={timeout} />
      <p className="hjalptext">{q.skillTitle}</p>
      {q.visual && <QuestionVisual visual={q.visual} />}
      <h2 className="text-center" style={{ fontSize: q.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{q.prompt}</h2>
      <output className="falt display flex min-h-[56px] items-center justify-center text-center" style={{ fontSize: "var(--t-2xl)" }} aria-label="Ditt svar">
        {state === "ask" ? input || " " : state === "right" ? input : fmt(q.answer)}
      </output>
      {state === "ask" ? (
        <div className="grid grid-cols-3 gap-2" aria-label="Sifferknappar">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} type="button" className="squish squish--mjuk" onClick={() => key(d)}>{d}</button>
          ))}
          {(q.keys === "neg" || q.keys === "both") && <button type="button" className="squish squish--mjuk" aria-label="Minustecken" onClick={() => key("−")}>−</button>}
          {(q.keys === "dec" || q.keys === "both") && <button type="button" className="squish squish--mjuk" aria-label="Kommatecken" onClick={() => key(",")}>,</button>}
          <button type="button" className="squish squish--mjuk" aria-label="Sudda" onClick={() => key("del")}>⌫</button>
          <button type="button" className="squish squish--mjuk" onClick={() => key("0")}>0</button>
          <button type="button" className="squish" onClick={submit} disabled={input === ""}>Svara</button>
        </div>
      ) : (
        <>
          <p className="text-center font-semibold" role="status" style={{ color: state === "right" ? "var(--mynta)" : "var(--plommon)" }}>
            {state === "right" ? (tries ? "Rätt! Bra kämpat." : "Rätt!") : `Svaret är ${fmt(q.answer)}. ${q.hints[2] ?? ""}`}
          </p>
          <button ref={nextRef} className="squish" onClick={() => onAnswer(state === "right", tries)}>Nästa</button>
        </>
      )}
      {hint && state === "ask" && <p className="rounded-[var(--r-md)] bg-[var(--mjolkis)] p-3" role="status">💡 {hint}</p>}
    </div>
  );
}
