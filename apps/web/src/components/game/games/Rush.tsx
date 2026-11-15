"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/num";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "./types";

/* Banans mått i egna enheter: tre banor à 100 i bredd, 400 i höjd. Allt ritas i procent av banan. */
const W = 300, H = 400, LW = 100, TS = 66, CW = 80, STEP = 5, DT = 0.05;
const COL = [["#ff9ec4", "#e8689a"], ["#8fe0b4", "#4fbf92"], ["#9ccfff", "#5aa7ee"]];

interface Tok { ok: boolean; lane: number; y: number; v: number }

/** Sekunder för en tokens väg ner, efter tempo (som i Eggly 1). Utan klocka (0) en lagom fart. */
const fallTime = (seconds: number) => (seconds >= 20 ? 6.4 : seconds >= 12 ? 5.2 : seconds >= 7 ? 4.2 : seconds > 0 ? 3.4 : 5.2);

/**
 * Letar en väg som tar det rätta talet utan att nudda något fel tal, så att varje bana går att klara.
 * En enkel simulering: tid i små steg, ett banbyte tar STEP steg.
 */
function reachable(items: Tok[], vy: number): boolean {
  const d = (CW * 0.66 + TS) / vy;
  const wrong = items.filter((t) => !t.ok).map((t) => [t.lane, -t.y / vy, -t.y / vy + d] as const);
  const c = items.find((t) => t.ok)!;
  const c0 = -c.y / vy, c1 = c0 + d, t0 = Math.min(...items.map((t) => -t.y / vy)) - 0.4;
  const free = (l: number, t: number) => !wrong.some((x) => x[0] === l && t >= x[1] - 0.05 && t <= x[2] + 0.05);
  const n = Math.ceil((c1 - t0) / DT) + 1;
  const R: boolean[][] = Array.from({ length: n + 1 }, () => [false, false, false]);
  R[0] = [true, true, true];
  for (let s = 0; s <= n; s++) for (let l = 0; l < 3; l++) {
    if (!R[s][l]) continue;
    const t = t0 + s * DT;
    if (!free(l, t)) { R[s][l] = false; continue; }
    if (l === c.lane && t >= c0 && t <= c1) return true;
    if (s + 1 <= n) R[s + 1][l] = true;
    for (const m of [l - 1, l + 1]) {
      if (m < 0 || m > 2 || s + STEP > n) continue;
      let ok = true;
      for (let k = 0; k <= STEP && ok; k++) ok = free(l, t + k * DT) && free(m, t + k * DT);
      if (ok) R[s + STEP][m] = true;
    }
  }
  return false;
}

function makeLayout(answer: number, choices: number[], vy: number): Tok[] {
  const N = 5, rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
  const others = choices.filter((c) => c !== answer);
  const wrongs = others.length ? others : [answer + 1];
  const build = (fixedLane: boolean) => {
    const out: Tok[] = [];
    let y = -TS - 10, wi = rnd(0, wrongs.length - 1);
    const ci = rnd(1, N - 1), cl = rnd(0, 2);
    for (let k = 0; k < N; k++) {
      if (k) y -= TS * (1.2 + Math.random() * 1.2);
      const ok = k === ci;
      const lanes = [0, 1, 2].filter((l) => l !== cl);
      out.push({ ok, lane: ok ? cl : fixedLane ? lanes[rnd(0, 1)] : rnd(0, 2), y, v: ok ? answer : wrongs[wi++ % wrongs.length] });
    }
    return out;
  };
  for (let tries = 0; tries < 80; tries++) { const it = build(false); if (reachable(it, vy)) return it; }
  return build(true);
}

/**
 * Rainbow Rush: din klämmis springer i tre banor. Talen kommer ner, ett rätt och flera fel. Byt bana med
 * pilknapparna, piltangenterna eller genom att svepa eller trycka i banan. Ta det rätta talet.
 */
export function Rush({ q, seconds, onAnswer, buddySvg }: GameProps) {
  const vy = (H + TS) / fallTime(seconds);
  const [toks] = useState(() => makeLayout(q.answer, q.choices, vy));
  const [state, setState] = useState<"play" | "right" | "wrong" | "missed">("play");
  const [lane, setLane] = useState(1);
  const laneRef = useRef(1);
  const stateRef = useRef<typeof state>("play");
  const tokEls = useRef<(HTMLDivElement | null)[]>([]);
  const meEl = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const [hitVal, setHitVal] = useState<number | null>(null);

  const go = useCallback((n: number) => {
    const l = Math.max(0, Math.min(2, n));
    if (l !== laneRef.current && stateRef.current === "play") { laneRef.current = l; setLane(l); sfx.tap(); }
  }, []);

  useEffect(() => {
    let raf = 0, last = performance.now(), cx = LW * 1.5;
    const ys = toks.map((t) => t.y);
    const place = () => {
      const me = meEl.current;
      if (me) me.style.left = `${((cx - CW / 2) / W) * 100}%`;
      toks.forEach((t, i) => {
        const el = tokEls.current[i];
        if (el) el.style.top = `${(ys[i] / H) * 100}%`;
      });
    };
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000; last = now;
      cx += ((laneRef.current + 0.5) * LW - cx) * Math.min(1, dt * 16);
      if (stateRef.current === "play") {
        for (let i = 0; i < toks.length; i++) {
          ys[i] += vy * dt;
          const t = toks[i];
          const tx = (t.lane + 0.5) * LW;
          if (ys[i] + TS >= H - CW * 0.86 && ys[i] < H - CW * 0.2 && Math.abs(tx - cx) < LW * 0.42) {
            stateRef.current = t.ok ? "right" : "wrong";
            setHitVal(t.v); setState(stateRef.current);
            break;
          }
        }
        if (stateRef.current === "play" && !toks.some((t, i) => t.ok && ys[i] <= H)) {
          stateRef.current = "missed"; setState("missed");
        }
      }
      place();
      raf = requestAnimationFrame(loop);
    };
    place();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [toks, vy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") go(laneRef.current - 1);
      else if (e.key === "ArrowRight" || e.key === "d") go(laneRef.current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    if (state === "play") return;
    (state === "right" ? sfx.right : sfx.wrong)();
    const t = window.setTimeout(() => onAnswer(state === "right"), state === "right" ? 600 : 1700);
    return () => window.clearTimeout(t);
  }, [state, onAnswer]);

  /* Svep: varje ~45 px åt sidan är en bana. Ett tryck i banan hoppar dit. */
  const drag = useRef<{ x: number; lane: number; moved: boolean } | null>(null);
  const down = (e: React.PointerEvent) => { drag.current = { x: e.clientX, lane: laneRef.current, moved: false }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 12) d.moved = true;
    if (d.moved) go(d.lane + Math.sign(dx) * Math.floor((Math.abs(dx) + 17) / 45));
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null;
    if (d && !d.moved && field.current) {
      const r = field.current.getBoundingClientRect();
      go(Math.floor(((e.clientX - r.left) / r.width) * 3));
    }
  };

  const message = state === "right" ? "Fångad! Rätt!"
    : state === "wrong" ? `Oj, fel tal. Rätt var ${fmt(q.answer)}.`
    : state === "missed" ? `Det rätta talet försvann! Det var ${fmt(q.answer)}.` : "";
  return (
    <div className="kort flex flex-col gap-3 p-4">
      <p className="hjalptext">{q.skillTitle}</p>
      <h2 className="text-center" style={{ fontSize: q.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{q.prompt}</h2>
      <div ref={field} className="relative mx-auto w-full max-w-sm touch-none select-none overflow-hidden rounded-[var(--r-lg)]"
        style={{ aspectRatio: `${W} / ${H}`, background: "linear-gradient(90deg,#ffe0ee 0 33.333%,#fff6c9 33.333% 66.666%,#dcefff 66.666%)" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}
        role="img" aria-label={`Tre banor. Du står i bana ${lane + 1}. Ta talet som är rätt svar.`}>
        {[33.333, 66.666].map((l) => <i key={l} className="absolute bottom-0 top-0 w-0 border-l-[3px] border-dashed border-white/90" style={{ left: `${l}%` }} />)}
        {toks.map((t, i) => (
          <div key={i} ref={(el) => { tokEls.current[i] = el; }}
            className="display absolute flex items-center justify-center rounded-full text-center"
            style={{
              width: `${(TS / W) * 100}%`, aspectRatio: "1", left: `${((t.lane * LW + (LW - TS) / 2) / W) * 100}%`, top: `${(t.y / H) * 100}%`,
              fontSize: "var(--t-lg)", color: "var(--plommon)", opacity: hitVal === t.v && state !== "play" && t.ok === (state === "right") ? 0.35 : 1,
              background: `radial-gradient(circle at 35% 30%, #fff, ${COL[t.lane][0]} 62%, ${COL[t.lane][1]})`, boxShadow: `0 5px 0 ${COL[t.lane][1]}`,
            }}>{fmt(t.v)}</div>
        ))}
        <div ref={meEl} className="absolute [&>svg]:h-full [&>svg]:w-full" style={{ width: `${(CW / W) * 100}%`, aspectRatio: "1", bottom: "2%", left: `${((LW * 1.5 - CW / 2) / W) * 100}%` }}
          aria-hidden="true" dangerouslySetInnerHTML={{ __html: buddySvg ?? "" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="squish squish--mjuk" onClick={() => go(laneRef.current - 1)} aria-label="Flytta en bana åt vänster">←</button>
        <button type="button" className="squish squish--mjuk" onClick={() => go(laneRef.current + 1)} aria-label="Flytta en bana åt höger">→</button>
      </div>
      <p className="min-h-[1.5em] text-center font-semibold" role="status" style={{ color: state === "right" ? "var(--mynta)" : "var(--plommon)" }}>{message}</p>
    </div>
  );
}
