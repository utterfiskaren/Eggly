import type { Metadata } from "next";
import Link from "next/link";
import { TEMPO } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { OvaSetup } from "@/components/game/OvaSetup";
import { requireChild } from "@/lib/child";

export const metadata: Metadata = { title: "Öva" };

export default async function Page() {
  await requireChild();
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={30} /></Link>
        <h1 className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-xl)" }}>Öva</h1>
      </header>
      <p>Välj själv vad du vill träna. Du får stjärnor för rätta svar, men inget ägg.</p>
      <OvaSetup tempos={TEMPO.map((t) => ({ name: t.name, sec: t.sec }))} />
      <Link href="/spela" className="squish squish--mjuk self-center">Till startsidan</Link>
    </main>
  );
}
