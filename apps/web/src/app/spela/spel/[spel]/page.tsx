import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ARCADE_GAME_INFO, ARCADE_LEVELS, ARCADE_OPS, GAME_NAMES, TEMPO, TIERS, arcadeEggTier, arcadeLives, arcadeOps, eggSvg, type GameId,
} from "@eggly/content";
import { Logo } from "@/components/Logo";
import { ArcadeSetup } from "@/components/game/ArcadeSetup";
import { GameGlyph } from "@/components/game/GameGlyph";
import { requireChild } from "@/lib/child";
import { BUILT } from "@/lib/rounds";

export const metadata: Metadata = { title: "Alla spel" };

export default async function Page({ params }: { params: Promise<{ spel: string }> }) {
  const { spel } = await params;
  await requireChild();
  const game = spel as GameId;
  if (!BUILT.includes(game)) notFound();

  // Allt som valet behöver räknas ut här, så att webbläsaren slipper ladda äggens och spelens ritningar.
  const tierOf = ARCADE_LEVELS.map((l) => TEMPO.map((_, t) => arcadeEggTier(l.level, t)));
  const eggs: Record<number, { name: string; svg: string }> = {};
  for (const row of tierOf) for (const t of row) eggs[t] ??= { name: TIERS[t].name, svg: eggSvg(t) };

  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela/spel" className="flex min-h-[44px] items-center" aria-label="Till alla spel"><Logo size={30} /></Link>
        <Link href="/spela/spel" className="lank text-sm">Alla spel</Link>
      </header>
      <section className="kort flex items-center gap-4 p-4">
        <GameGlyph game={game} size={64} />
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)" }}>{GAME_NAMES[game]}</h1>
          <p className="hjalptext">{ARCADE_GAME_INFO[game]}</p>
        </div>
      </section>
      <ArcadeSetup
        game={game}
        levels={ARCADE_LEVELS}
        ops={ARCADE_OPS.map((o) => ({ id: o.id, name: o.name }))}
        opsByLevel={ARCADE_LEVELS.map((l) => arcadeOps(l.level))}
        lives={ARCADE_LEVELS.map((l) => arcadeLives(l.level))}
        tempos={TEMPO.map((t) => ({ name: t.name, bolts: t.bolts }))}
        tierOf={tierOf}
        eggs={eggs}
        usesOp={game !== "krossa" && game !== "kiosk"}
      />
    </main>
  );
}
