"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tidsstapel för en uppgift. Tar slut → onTimeout en gång. Stannar när `stopped` blir sant.
 * Med «minska rörelse» krymper stapeln i steg i stället för mjukt.
 */
export function Clock({ seconds, stopped, onTimeout }: { seconds: number; stopped: boolean; onTimeout: () => void }) {
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);
  useEffect(() => {
    if (!seconds || stopped) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const l = Math.max(0, seconds - (Date.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0 && !fired.current) { fired.current = true; window.clearInterval(id); onTimeout(); }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds, stopped, onTimeout]);
  if (!seconds) return null;
  const share = left / seconds;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--dimma)]" role="timer" aria-label={`${Math.ceil(left)} sekunder kvar`}>
      <div className="h-full rounded-full transition-[width] duration-100 ease-linear motion-reduce:transition-none"
        style={{ width: `${share * 100}%`, background: share < 0.25 ? "var(--jordgubb)" : "var(--mynta)" }} />
    </div>
  );
}
