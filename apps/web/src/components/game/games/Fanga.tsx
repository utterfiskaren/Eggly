"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/num";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "./types";

const H = 300;      // fältets höjd i px
const TS = 56;      // storlek på ett tal
const CH = 84;      // fångarens höjd
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Ingen klämmis i samlingen än: en korg. */
function Basket() {
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full" aria-hidden="true">
      <path d="M8 22h84l-9 40a8 8 0 0 1-8 6H25a8 8 0 0 1-8-6z" fill="#f2c27a" stroke="#c98d5a" strokeWidth="3" />
      <path d="M8 22h84" stroke="#c98d5a" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 28v34M50 28v34M70 28v34" stroke="#c98d5a" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Fånga talen: svaren faller. Dra fångaren (eller använd piltangenterna eller knapparna) och fånga det rätta.
 * Utan klocka (ingen tidspress) börjar de falla om från toppen om man missar. Med klocka räknas missen som fel.
 */
export function Fanga({ q, seconds, onAnswer, buddySvg }: GameProps) {
  const [phase, setPhase] = useState<"play" | "right" | "wrong">("play");
  const fieldRef = useRef<HTMLDivElement>(null);
  const catcherRef = useRef<HTMLDivElement>(null);
  const tokRefs = useRef<(HTMLDivElement | null)[]>([]);
  const target = useRef(0.5);
  const values = q.choices.slice(0, 4);

  const nudge = useCallback((d: number) => { target.current = clamp(target.current + d, 0.08, 0.92); }, []);

  useEffect(() => {
    const field = fieldRef.current;
    const catcher = catcherRef.current;
    if (!field || !catcher) return;
    const cols = values.length;
    const speed = (H + TS) / ((seconds || 7.5) * 1.05);
    let ys = values.map((_, i) => -TS - ((i * 37) % 60));
    let gone = values.map(() => false);
    let cx = 0.5, done = false, raf = 0, last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      const W = field.clientWidth;
      const CW = clamp(W * 0.25, 74, 118);
      cx += (target.current - cx) * Math.min(1, dt * 18);
      const cpx = cx * W;
      catcher.style.width = `${CW}px`;
      catcher.style.transform = `translateX(${(cpx - CW / 2).toFixed(1)}px)`;
      if (!done) {
        for (let i = 0; i < values.length; i++) {
          if (gone[i]) continue;
          ys[i] += speed * dt;
          const x = (i + 0.5) * (W / cols) - TS / 2;
          const el = tokRefs.current[i];
          if (el) el.style.transform = `translate(${x.toFixed(1)}px, ${ys[i].toFixed(1)}px)`;
          const inZone = ys[i] + TS >= H - CH * 0.86 && ys[i] < H - CH * 0.2;
          if (inZone && Math.abs(x + TS / 2 - cpx) < CW * 0.62) {
            done = true;
            setPhase(values[i] === q.answer ? "right" : "wrong");
            break;
          }
          if (ys[i] > H) {
            if (values[i] === q.answer) {
              if (seconds) { done = true; setPhase("wrong"); break; }
              ys = values.map((_, k) => -TS - ((k * 37) % 60));
              gone = values.map(() => false);
              break;
            }
            gone[i] = true;
            if (el) el.style.visibility = "hidden";
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    // Efter en miss utan klocka ska tal som göms synas igen.
    tokRefs.current.forEach((el) => { if (el) el.style.visibility = "visible"; });
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [q, seconds, values.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "play") return;
    (phase === "right" ? sfx.right : sfx.wrong)();
    const t = window.setTimeout(() => onAnswer(phase === "right"), phase === "right" ? 600 : 1500);
    return () => window.clearTimeout(t);
  }, [phase, onAnswer]);

  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    target.current = clamp((e.clientX - r.left) / r.width, 0.08, 0.92);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-0.12); }
    else if (e.key === "ArrowRight") { e.preventDefault(); nudge(0.12); }
  }

  return (
    <div className="kort flex flex-col gap-3 p-4">
      <p className="hjalptext">{q.skillTitle}</p>
      <h2 className="text-center" style={{ fontSize: q.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{q.prompt}</h2>
      <div ref={fieldRef} tabIndex={0} role="group" aria-label="Fältet där talen faller. Flytta fångaren med piltangenterna."
        onPointerDown={onPointer} onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") onPointer(e); }} onKeyDown={onKey}
        className="relative w-full select-none overflow-hidden rounded-[var(--r-md)] border-2 border-[var(--dimma)] bg-[linear-gradient(#e9f3ff,#f6f3ff)]"
        style={{ height: H, touchAction: "none" }}>
        {values.map((v, i) => (
          <div key={`${v}-${i}`} ref={(el) => { tokRefs.current[i] = el; }}
            className="display absolute left-0 top-0 flex items-center justify-center rounded-full bg-[var(--vit)] shadow-[0_4px_0_var(--dimma)]"
            style={{ width: TS, height: TS, fontSize: "var(--t-xl)", transform: `translate(0px, ${-TS * 2}px)` }}>
            {fmt(v)}
          </div>
        ))}
        <div ref={catcherRef} className="absolute bottom-0 left-0 [&>span]:block [&>span>svg]:h-full [&>span>svg]:w-full"
          style={{ height: CH, width: 90 }}>
          {buddySvg
            ? <span aria-hidden="true" className="h-full w-full" dangerouslySetInnerHTML={{ __html: buddySvg }} />
            : <Basket />}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="squish squish--mjuk" onClick={() => nudge(-0.15)} disabled={phase !== "play"} aria-label="Flytta fångaren åt vänster">◀</button>
        <button type="button" className="squish squish--mjuk" onClick={() => nudge(0.15)} disabled={phase !== "play"} aria-label="Flytta fångaren åt höger">▶</button>
      </div>
      <p className="min-h-[1.5em] text-center font-semibold" role="status" style={{ color: phase === "right" ? "var(--mynta)" : "var(--plommon)" }}>
        {phase === "right" ? "Fångad! Rätt!" : phase === "wrong" ? `Svaret är ${fmt(q.answer)}.` : ""}
      </p>
    </div>
  );
}
