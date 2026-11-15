import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { TabellRader } from "@/components/game/TabellRader";
import { requireChild } from "@/lib/child";

export const metadata: Metadata = { title: "Titta på tabellen" };

const KNEP: Record<number, string> = {
  2: "Dubbla talet! 2 × 7 = 7 + 7 = 14.",
  3: "Dubbla och lägg till en grupp till: 3 × 6 = 6 + 6 + 6 = 18.",
  4: "Dubbla, och dubbla igen! 4 × 6: 6 + 6 = 12, 12 + 12 = 24.",
  5: "Svaret slutar alltid på 0 eller 5. Det är hälften av tio gånger.",
  6: "Ta 5 grupper och lägg till en grupp till: 6 × 7 = 35 + 7 = 42.",
  7: "Ta 5 grupper och lägg till två grupper: 7 × 6 = 30 + 12 = 42.",
  8: "Dubbla, dubbla, dubbla! 8 × 3: 3, 6, 12, 24.",
  9: "Tio grupper minus en grupp: 9 × 6 = 60 − 6 = 54.",
  10: "Sätt en nolla efter talet: 10 × 7 = 70.",
};
const COLORS = ["#ffd6e7", "#e1d7ff", "#cbe7ff", "#bff2dc", "#fff1a8"];

export default async function Page({ params }: { params: Promise<{ t: string }> }) {
  const { t: raw } = await params;
  await requireChild();
  const t = Number(raw);
  if (!Number.isInteger(t) || t < 2 || t > 10) notFound();
  const hopp = Array.from({ length: 10 }, (_, i) => (i + 1) * t);
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={30} /></Link>
        <h1 className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-xl)" }}>{t}:ans tabell</h1>
      </header>
      <section className="kort flex flex-col gap-3 p-4">
        <p><strong>Knep:</strong> {KNEP[t]}</p>
        <p>Hoppa {t} i taget:</p>
        <p className="flex flex-wrap items-center gap-2" aria-label={`Talen: ${hopp.join(", ")}`}>
          {hopp.map((v, i) => (
            <span key={v} className="flex items-center gap-2">
              {i > 0 && <span className="hjalptext" aria-hidden="true">+{t}</span>}
              <span className="display rounded-[var(--r-md)] px-2 py-1" style={{ background: COLORS[i % COLORS.length], color: "var(--plommon)" }}>{v}</span>
            </span>
          ))}
        </p>
        <p className="hjalptext">Tryck på en rad för att se grupperna.</p>
        <TabellRader t={t} />
      </section>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/spela/ova" className="squish squish--mjuk">Tillbaka till Öva</Link>
      </div>
    </main>
  );
}
