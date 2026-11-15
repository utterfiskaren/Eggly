"use client";

import { useState } from "react";

const COLORS = ["#ffd6e7", "#e1d7ff", "#cbe7ff", "#bff2dc", "#fff1a8"];

/** Tabellens rader. Trycker man på en rad ritas grupperna: k grupper med t prickar i varje. */
export function TabellRader({ t }: { t: number }) {
  const [k, setK] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <button type="button" aria-pressed={k === n} onClick={() => setK(k === n ? null : n)}
              className={`squish squish--liten w-full justify-between ${k === n ? "" : "squish--mjuk"}`}>
              <span>{n} × {t}</span><span>= {n * t}</span>
            </button>
          </li>
        ))}
      </ul>
      <div role="status" aria-live="polite" className="min-h-[3rem]">
        {k && (
          <div className="kort flex flex-col gap-2 p-3">
            <p className="font-semibold">{k} grupper med {t} i varje: {k * t} tillsammans</p>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: k }, (_, g) => (
                <span key={g} className="inline-flex flex-wrap gap-1 rounded-[var(--r-md)] p-2" style={{ background: COLORS[g % COLORS.length], maxWidth: "7.5rem" }} aria-hidden="true">
                  {Array.from({ length: t }, (_, d) => <i key={d} className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--plommon)" }} />)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
