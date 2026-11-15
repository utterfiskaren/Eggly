import type { Metadata } from "next";
import Link from "next/link";
import { ARCADE_GAME_INFO, ARCADE_GAME_ORDER, GAME_NAMES } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { GameGlyph } from "@/components/game/GameGlyph";
import { requireChild } from "@/lib/child";
import { BUILT } from "@/lib/rounds";

export const metadata: Metadata = { title: "Alla spel" };

export default async function Page() {
  await requireChild();
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={30} /></Link>
        <h1 className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-xl)" }}>Alla spel</h1>
      </header>
      <p>Välj ett spel. Sedan väljer du matteslag, svårighet och tempo. Klarar du en runda får du ett ägg.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ARCADE_GAME_ORDER.map((g) => {
          const built = BUILT.includes(g);
          const inner = (
            <>
              <span className="shrink-0" style={{ opacity: built ? 1 : 0.4 }}><GameGlyph game={g} /></span>
              <span className="flex flex-col gap-1">
                <span className="display" style={{ fontSize: "var(--t-lg)" }}>{GAME_NAMES[g]}</span>
                <span className="hjalptext">{built ? ARCADE_GAME_INFO[g] : "Kommer snart"}</span>
              </span>
            </>
          );
          return (
            <li key={g}>
              {built
                ? <Link href={`/spela/spel/${g}`} className="kort kort--klick flex h-full items-center gap-4 p-4">{inner}</Link>
                : <div className="kort flex h-full items-center gap-4 p-4" aria-disabled="true">{inner}</div>}
            </li>
          );
        })}
      </ul>
      <Link href="/spela/matte" className="squish squish--mjuk self-center">Till kartan</Link>
    </main>
  );
}
