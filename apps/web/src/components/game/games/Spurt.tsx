"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "./Clock";
import type { RoundAnswer } from "@/lib/rounds";
import { fmt, readNum } from "@/lib/num";
import type { BoardProps } from "./types";

/**
 * Spurten: hur många hinner du innan klockan tar slut? Skriv svaret, det skickas av sig självt
 * när siffrorna räcker. Nå målet för att klara steget.
 */
export function Spurt({ questions, clock, goal, onDone }: BoardProps) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [right, setRight] = useState(0);
  const [state, setState] = useState<"ask" | "right" | "wrong">("ask");
  const [over, setOver] = useState(false);
  const answers = useRef<RoundAnswer[]>([]);
  const q = questions[Math.min(idx, questions.length - 1)];

  const finish = useCallback(() => {
    setOver(true);
    onDone(answers.current, true);
  }, [onDone]);
  const timeout = useCallback(() => finish(), [finish]);

  function submit(value: string) {
    if (state !== "ask" || over || value === "") return;
    const ok = Math.abs(readNum(value) - q.answer) < 1e-9;
    answers.current = [...answers.current, { correct: ok, i: idx }];
    setState(ok ? "right" : "wrong");
    if (ok) setRight((r) => r + 1);
  }
  useEffect(() => {
    if (state === "ask" || over) return;
    const t = window.setTimeout(() => {
      if (idx + 1 >= questions.length) { finish(); return; }
      setIdx((i) => i + 1); setInput(""); setState("ask");
    }, state === "right" ? 260 : 800);
    return () => window.clearTimeout(t);
  }, [state, idx, over, questions.length, finish]);

  function key(k: string) {
    if (state !== "ask" || over) return;
    if (k === "del") { setInput((a) => a.slice(0, -1)); return; }
    if (k === "−") { setInput((a) => (a === "" ? "−" : a.startsWith("−") ? a.slice(1) : "−" + a)); return; }
    if (k === ",") { setInput((a) => (a.includes(",") ? a : a === "" || a === "−" ? a + "0," : a + ",")); return; }
    const next = (input + k).slice(0, 7);
    setInput(next);
    // Vanliga heltalssvar skickas av sig självt när siffrorna räcker. Med komma eller minus trycker man Svara.
    if (!q.keys && next.length >= String(q.answer).length) submit(next);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) key(e.key);
      else if (e.key === "," || e.key === ".") { if (q.keys === "dec" || q.keys === "both") key(","); }
      else if (e.key === "-" || e.key === "−") { if (q.keys === "neg" || q.keys === "both") key("−"); }
      else if (e.key === "Backspace") key("del");
      else if (e.key === "Enter") submit(input);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="kort flex flex-col gap-3 p-4">
      <Clock seconds={clock} stopped={over} onTimeout={timeout} />
      <p className="text-center font-semibold" role="status">{right} av {goal} rätt</p>
      <h2 className="text-center" style={{ fontSize: q.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{q.prompt}</h2>
      <output className="falt display flex min-h-[56px] items-center justify-center text-center" style={{ fontSize: "var(--t-2xl)", color: state === "wrong" ? "var(--fel)" : state === "right" ? "var(--mynta)" : undefined }} aria-label="Ditt svar">
        {state === "ask" ? input || " " : fmt(q.answer)}
      </output>
      <div className="grid grid-cols-3 gap-2" aria-label="Sifferknappar">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className="squish squish--mjuk" onClick={() => key(d)}>{d}</button>
        ))}
        {(q.keys === "neg" || q.keys === "both") && <button type="button" className="squish squish--mjuk" aria-label="Minustecken" onClick={() => key("−")}>−</button>}
        {(q.keys === "dec" || q.keys === "both") && <button type="button" className="squish squish--mjuk" aria-label="Kommatecken" onClick={() => key(",")}>,</button>}
        <button type="button" className="squish squish--mjuk" aria-label="Sudda" onClick={() => key("del")}>⌫</button>
        <button type="button" className="squish squish--mjuk" onClick={() => key("0")}>0</button>
        <button type="button" className="squish" onClick={() => submit(input)} disabled={input === ""}>Svara</button>
      </div>
    </div>
  );
}
