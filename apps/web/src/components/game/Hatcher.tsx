"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { klackAgg } from "@/app/actions/spel";
import type { HatchView } from "@/lib/world";

/**
 * Kläck ett ägg: tryck på ägget tills det spricker. Bilderna på ägget (en per spricka) ritas på
 * servern och skickas hit, så att ritkoden inte behöver laddas i webbläsaren.
 */
export function Hatcher({ eggs, eggSvgs }: { eggs: number; eggSvgs: string[] }) {
  const taps = eggSvgs.length; // sista trycket kläcker
  const [n, setN] = useState(0);
  const [born, setBorn] = useState<HatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (born) {
    return (
      <div className="kort flex flex-col items-center gap-3 p-6 text-center" role="status">
        <span className="klack-in inline-block h-40 w-40 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: born.svg }} />
        <p className="display" style={{ fontSize: "var(--t-2xl)" }}>Det blev {born.name}!</p>
        <p className="hjalptext">{born.tierName} · {born.txt}</p>
        <button className="squish" onClick={() => { setBorn(null); setN(0); router.refresh(); }}>
          {eggs > 1 ? "Kläck nästa ägg" : "Se samlingen"}
        </button>
      </div>
    );
  }

  function tap() {
    if (pending) return;
    if (n < taps - 1) { setN((t) => t + 1); return; }
    setError(null);
    start(async () => {
      try {
        const s = await klackAgg();
        if (s) setBorn(s); else { setError("Ägget var redan kläckt."); setN(0); router.refresh(); }
      } catch { setError("Något gick fel med anslutningen. Försök igen."); setN(0); }
    });
  }

  const left = taps - n;
  return (
    <div className="kort flex flex-col items-center gap-3 p-6 text-center">
      <button onClick={tap} disabled={pending} key={n}
        className={`kort--klick rounded-[var(--r-lg)] p-2 ${n > 0 ? "skaka" : ""}`}
        aria-label={`Ägg. Tryck ${left} ${left === 1 ? "gång" : "gånger"} till för att kläcka.`}>
        <span className="inline-block h-[150px] w-[120px] [&>svg]:h-full [&>svg]:w-full" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: eggSvgs[Math.min(n, taps - 1)] }} />
      </button>
      <p className="font-semibold" aria-live="polite">
        {pending ? "Det knakar …" : n === 0 ? "Tryck på ägget för att kläcka det!" : left === 1 ? "Nästan! En gång till." : "Det rör sig! Tryck igen."}
      </p>
      {eggs > 1 && <p className="hjalptext">Du har {eggs} ägg.</p>}
      {error && <p role="alert" className="felruta">{error}</p>}
    </div>
  );
}
