"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "./Clock";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "./types";

const COINS = [1, 2, 5, 10, 20, 50, 100, 200];
const NOTE_FILL: Record<number, string> = { 20: "#c9a0e8", 50: "#f2b27a", 100: "#9fd3a8", 200: "#8fb8e8" };

/** Mynt och sedlar ritas här så att inget behöver hämtas. */
function Money({ v }: { v: number }) {
  if (v >= 20) {
    return (
      <svg viewBox="0 0 96 52" className="h-full w-full" aria-hidden="true">
        <rect x="2" y="2" width="92" height="48" rx="8" fill={NOTE_FILL[v]} stroke="rgba(75,58,99,.25)" strokeWidth="2" />
        <circle cx="48" cy="26" r="17" fill="#fff" opacity=".6" />
        <text x="48" y="34" textAnchor="middle" fontSize="23" fill="#4b3a63">{v}</text>
      </svg>
    );
  }
  const c = v === 10 ? ["#ffd34d", "#e8ac2a"] : v === 5 ? ["#ffe08a", "#d9a82a"] : ["#dfe5ec", "#aab6c6"];
  return (
    <svg viewBox="0 0 52 52" className="h-full w-full" aria-hidden="true">
      <circle cx="26" cy="26" r="24" fill={c[0]} stroke={c[1]} strokeWidth="3" />
      <circle cx="26" cy="26" r="18" fill="none" stroke={c[1]} strokeWidth="1.5" />
      <text x="26" y="34" textAnchor="middle" fontSize="23" fill="#4b3a63">{v}</text>
    </svg>
  );
}

/** Texten från servern: det som står mellan ** ** blir fetstil. */
function Say({ text }: { text: string }) {
  return <>{text.split("**").map((part, i) => (i % 2 ? <strong key={i} style={{ color: "var(--jordgubb-mork)" }}>{part}</strong> : <span key={i}>{part}</span>))}</>;
}

/** Kiosken: lägg upp exakt rätt pengar, eller räkna ut växeln. Svaret är summan i kronor. */
export function Kiosk({ q, seconds, onAnswer }: GameProps) {
  const [tray, setTray] = useState<number[]>([]);
  const [state, setState] = useState<"play" | "right" | "wrong" | "time">("play");
  const sum = tray.reduce((a, b) => a + b, 0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const timeout = useCallback(() => setState("time"), []);

  useEffect(() => {
    if (state === "play") return;
    (state === "right" ? sfx.right : sfx.wrong)();
    const t = window.setTimeout(() => onAnswer(state === "right"), state === "right" ? 900 : 1800);
    return () => window.clearTimeout(t);
  }, [state, onAnswer]);

  const add = (v: number) => { if (state === "play" && tray.length < 24) setTray((t) => [...t, v]); };
  const remove = (i: number) => { if (state === "play") setTray((t) => t.filter((_, k) => k !== i)); };
  const pay = () => { if (state === "play" && tray.length) setState(sum === q.answer ? "right" : "wrong"); };

  return (
    <div className="kort flex flex-col gap-3 p-4">
      <Clock seconds={seconds} stopped={state !== "play"} onTimeout={timeout} />
      <div className="flex items-center gap-3 rounded-[var(--r-md)] bg-[var(--mjolkis)] p-3">
        {q.kiosk && <span className="inline-block h-16 w-16 shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: q.kiosk.svg }} />}
        <p style={{ fontSize: "var(--t-lg)" }}>{q.kiosk ? <Say text={q.kiosk.say} /> : q.prompt}</p>
      </div>
      <div className="flex min-h-[64px] flex-wrap items-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-[var(--dimma)] p-2" aria-label="Det du har lagt upp">
        {tray.length === 0 && <span className="hjalptext">Tryck på mynten och sedlarna så läggs de här. Tryck på en i högen för att ta bort den.</span>}
        {tray.map((v, i) => (
          <button key={i} type="button" onClick={() => remove(i)} disabled={state !== "play"} aria-label={`Ta bort ${v} kronor`}
            className={`${v >= 20 ? "h-11 w-20" : "h-11 w-11"} rounded-md`}>
            <Money v={v} />
          </button>
        ))}
      </div>
      <p className="text-center font-semibold" role="status" aria-live="polite" style={{ color: state === "right" ? "var(--mynta)" : "var(--plommon)" }}>
        {state === "right" ? `Precis rätt: ${q.answer} kr!`
          : state === "wrong" ? `Inte riktigt. Det skulle bli ${q.answer} kr.`
          : state === "time" ? `Tiden tog slut. Det skulle bli ${q.answer} kr.`
          : `Du har lagt: ${sum} kr`}
      </p>
      <div className="grid grid-cols-4 gap-2" aria-label="Pengar">
        {COINS.map((v) => (
          <button key={v} type="button" onClick={() => add(v)} disabled={state !== "play"} aria-label={`${v} kronor`}
            className="flex min-h-[56px] items-center justify-center rounded-[var(--r-md)] border-2 border-[var(--dimma)] bg-[var(--vit)] p-1 shadow-[0_3px_0_var(--dimma)] active:translate-y-[3px] active:shadow-none disabled:opacity-50">
            <span className={v >= 20 ? "block h-9 w-[4.2rem]" : "block h-10 w-10"}><Money v={v} /></span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <button type="button" className="squish squish--mjuk" onClick={() => setTray([])} disabled={state !== "play" || tray.length === 0}>Töm</button>
        <button ref={nextRef} type="button" className="squish" onClick={pay} disabled={state !== "play" || tray.length === 0}>Klart</button>
      </div>
    </div>
  );
}
