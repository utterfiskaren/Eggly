import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GAME_NAMES, TEMPO, TIERS, eggSvg } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { RoundPlayer } from "@/components/game/RoundPlayer";
import { requireChild } from "@/lib/child";
import { livesFor, playedAs } from "@/lib/rounds";
import { clearedSteps, openStep } from "@/lib/world";

export const metadata: Metadata = { title: "Matteön" };

const HOW: Record<string, string> = {
  rakna: "Skriv svaret med knapparna.",
  bubbel: "Tryck på bubblan med rätt svar.",
  sant: "Stämmer svaret? Tryck Rätt eller Fel.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireChild();
  const step = await openStep(me, id);
  if (!step) notFound();
  const best = (await clearedSteps(me))[step.id] ?? 0;
  const played = playedAs(step.game);
  const lives = livesFor(step);
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between">
        <Link href="/spela/matte" className="flex min-h-[44px] items-center" aria-label="Till kartan"><Logo size={30} /></Link>
        <span className="hjalptext">Steg {step.index + 1} av 300</span>
      </header>
      <section className="kort flex flex-col gap-2 p-5">
        <h1 style={{ fontSize: "var(--t-2xl)" }}>{step.title}</h1>
        <p><strong>{GAME_NAMES[played]}</strong>: {HOW[played]}
          {played !== step.game && <span className="hjalptext"> ({GAME_NAMES[step.game]} kommer snart.)</span>}</p>
        <p className="hjalptext">
          Tid: {TEMPO[step.tempo].name} · Hjärtan: <span aria-label={`${lives}`}>{"♥".repeat(lives)}</span>
          {best > 0 && <> · Ditt bästa: {"★".repeat(best)}</>}
        </p>
        <div className="flex items-center gap-3">
          <span className="inline-block h-14 w-11 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: eggSvg(step.tier) }} />
          <p>Klarar du steget får du ett <strong>{TIERS[step.tier].name}ägg</strong>.</p>
        </div>
      </section>
      <RoundPlayer stepId={step.id} eggSvg={eggSvg(step.tier)} />
    </main>
  );
}
