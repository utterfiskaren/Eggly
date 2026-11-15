"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { squishyById, RARITY_LABEL, type Squishy } from "@eggly/content";
import { klackAgg } from "@/app/actions/spel";
import { EggArt, SquishyArt } from "./Squishy";

/** Kläck ett ägg: tryck tre gånger på ägget. Sedan visas klämmisen. */
export function Hatcher({ eggs }: { eggs: number }) {
  const [taps, setTaps] = useState(0);
  const [born, setBorn] = useState<Squishy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (born) {
    return (
      <div className="kort flex flex-col items-center gap-3 p-6 text-center" role="status">
        <div className="klack-in"><SquishyArt s={born} size={140} decorative /></div>
        <p className="display" style={{ fontSize: "var(--t-2xl)" }}>Det blev {born.name}!</p>
        <p className="hjalptext">{RARITY_LABEL[born.rarity]} · {born.line}</p>
        <button className="squish" onClick={() => { setBorn(null); setTaps(0); router.refresh(); }}>
          {eggs > 1 ? "Kläck nästa ägg" : "Se samlingen"}
        </button>
      </div>
    );
  }

  function tap() {
    if (pending) return;
    if (taps < 2) { setTaps((t) => t + 1); return; }
    setError(null);
    start(async () => {
      try {
        const id = await klackAgg();
        const s = id ? squishyById(id) : undefined;
        if (s) setBorn(s); else { setError("Ägget var redan kläckt."); setTaps(0); router.refresh(); }
      } catch { setError("Något gick fel med anslutningen. Försök igen."); setTaps(0); }
    });
  }

  return (
    <div className="kort flex flex-col items-center gap-3 p-6 text-center">
      <button onClick={tap} disabled={pending} className={`kort--klick rounded-[var(--r-lg)] p-2 ${taps > 0 ? "skaka" : ""}`}
        key={taps} aria-label={`Ägg. Tryck ${3 - taps} ${3 - taps === 1 ? "gång" : "gånger"} till för att kläcka.`}>
        <EggArt size={130} crack={taps >= 2} />
      </button>
      <p className="font-semibold" aria-live="polite">
        {pending ? "Det knakar …" : taps === 0 ? "Tryck på ägget för att kläcka det!" : taps === 1 ? "Det rör sig! Tryck igen." : "Nästan! En gång till."}
      </p>
      {eggs > 1 && <p className="hjalptext">Du har {eggs} ägg.</p>}
      {error && <p role="alert" className="felruta">{error}</p>}
    </div>
  );
}
