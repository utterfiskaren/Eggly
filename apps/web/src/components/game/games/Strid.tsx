"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "./Clock";
import type { RoundAnswer } from "@/lib/rounds";
import { sfx } from "@/lib/sfx";
import { fmt } from "@/lib/num";
import type { BoardProps } from "./types";

const FALLBACK = { maxB: 80, hit: 9, maxH: 30, baseD: 6, crit: 10, timeX: 1 };

/**
 * Striden: svara rätt för att slå bossen, svara fel så slår bossen dig. Din klämmis krafter
 * (Mjukhet, Studs, Glitter, Klurighet) avgör hur länge du håller, hur hårt du slår, chansen till
 * superslag och hur mycket tid du får.
 */
export function Strid({ questions, seconds, hero, boss, fight = FALLBACK, onDone }: BoardProps) {
  const [idx, setIdx] = useState(0);
  const [bhp, setBhp] = useState(fight.maxB);
  const [hp, setHp] = useState(fight.maxH);
  const [picked, setPicked] = useState<number | null>(null); // -1 = tiden tog slut
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const answers = useRef<RoundAnswer[]>([]);
  const q = questions[Math.min(idx, questions.length - 1)];
  const asked = picked !== null;

  const answer = useCallback((value: number) => {
    if (picked !== null || over) return;
    const ok = value === q.answer;
    setPicked(value);
    answers.current = [...answers.current, { correct: ok, i: idx }];
    if (ok) {
      sfx.hit();
      const crit = Math.random() * 100 < fight.crit;
      const dmg = Math.round(fight.baseD * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1));
      setBhp((b) => Math.max(0, b - dmg));
      setNote(crit ? `Superslag! −${dmg}` : `Du slår bossen: −${dmg}`);
    } else {
      sfx.wrong();
      setHp((h) => Math.max(0, h - fight.hit));
      setNote(Number.isNaN(value) ? `Tiden tog slut. Bossen slår dig: −${fight.hit}` : `Fel. Bossen slår dig: −${fight.hit}. Svaret är ${fmt(q.answer)}.`);
    }
  }, [picked, over, q, idx, fight]);
  const timeout = useCallback(() => answer(NaN), [answer]);

  useEffect(() => {
    if (picked === null || over) return;
    const t = window.setTimeout(() => {
      if (bhp <= 0) { setOver(true); onDone(answers.current, true); return; }
      if (hp <= 0 || idx + 1 >= questions.length) { setOver(true); onDone(answers.current, false); return; }
      setIdx((i) => i + 1); setPicked(null); setNote("");
    }, picked === q.answer ? 900 : 1700);
    return () => window.clearTimeout(t);
  }, [picked, over, bhp, hp, idx, questions.length, q, onDone]);

  const bar = (now: number, max: number, color: string, label: string) => (
    <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--dimma)]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={now}>
      <div className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(now / max) * 100}%`, background: color }} />
    </div>
  );
  const hit = asked && picked === q.answer;
  return (
    <div className="kort flex flex-col gap-3 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="flex flex-col items-center gap-1">
          <span className={`inline-block h-24 w-24 [&>svg]:h-full [&>svg]:w-full ${asked && !hit ? "strid-skadad" : hit ? "strid-slag" : ""}`}
            role="img" aria-label={hero?.name ?? "Din klämmis"} dangerouslySetInnerHTML={{ __html: hero?.svg ?? "" }} />
          {bar(hp, fight.maxH, "var(--mynta)", "Dina livspoäng")}
          <span className="hjalptext">{hp} / {fight.maxH}</span>
        </div>
        <span className="display pb-6" style={{ fontSize: "var(--t-lg)" }} aria-hidden="true">mot</span>
        <div className="flex flex-col items-center gap-1">
          <span className={`inline-block h-24 w-24 [&>svg]:h-full [&>svg]:w-full ${hit ? "strid-skadad" : asked ? "strid-slag-v" : ""}`}
            role="img" aria-label={boss?.name ?? "Bossen"} dangerouslySetInnerHTML={{ __html: boss?.svg ?? "" }} />
          {bar(bhp, fight.maxB, "var(--jordgubb)", `${boss?.name ?? "Bossen"}s livspoäng`)}
          <span className="hjalptext">{bhp} / {fight.maxB}</span>
        </div>
      </div>
      <p className="text-center font-semibold">Besegra {boss?.name ?? "bossen"}</p>
      <Clock key={idx} seconds={seconds} stopped={asked || over} onTimeout={timeout} />
      <h2 className="text-center" style={{ fontSize: q.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>{q.prompt}</h2>
      <div className="grid grid-cols-2 gap-3">
        {q.choices.slice(0, 4).map((c) => {
          const right = asked && c === q.answer, wrong = asked && picked === c && c !== q.answer;
          return (
            <button key={c} type="button" disabled={asked} onClick={() => answer(c)}
              className="squish squish--mjuk display"
              style={{ background: right ? "var(--mynta)" : wrong ? "var(--jordgubb)" : undefined, color: right || wrong ? "#fff" : undefined, fontSize: "var(--t-xl)" }}>
              {fmt(c)}
            </button>
          );
        })}
      </div>
      <p className="min-h-[1.5em] text-center font-semibold" role="status" style={{ color: hit ? "var(--mynta)" : "var(--plommon)" }}>{note}</p>
    </div>
  );
}
