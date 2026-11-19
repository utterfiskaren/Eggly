import Link from "next/link";
import { TIERS, TIER_ORDER, WORLD_BOSSES, bossSvg, eggSvg } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { ScrollToCurrent } from "@/components/game/ScrollToCurrent";
import { RawArt } from "@/components/game/Squishy";
import { WorldMap, type Mascot } from "@/components/game/WorldMap";
import { THEMES } from "@/components/game/WorldScenery";
import type { WorldView } from "@/lib/world";

/** Hela Matteöns karta. Tar färdig data, så att den kan provas utan databas. */
export function MatteKarta({ w, mascot }: { w: WorldView; mascot: Mascot | null }) {
  const curWorld = w.steps[w.current].world;
  const cur = w.steps[w.current];
  const eggs = w.eggs.length;

  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-3 pb-28 pt-3">
      {/* Fast rad överst: stjärnor, ägg och samlingen. Alltid inom räckhåll. */}
      <header className="kl-hud sticky top-2 z-20 flex items-center gap-2 rounded-full px-3 py-2">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={26} /></Link>
        <span className="kl-chip" aria-label={`${w.totalStars} stjärnor`}><span aria-hidden="true">⭐</span> {w.totalStars}</span>
        <span className="kl-chip" aria-label={`${w.cleared} av ${w.steps.length} steg klara`}>{w.cleared}/{w.steps.length}</span>
        <Link href="/spela/samling" className={`squish squish--liten ml-auto ${eggs ? "kl-pulsa" : "squish--mjuk"}`}>
          {eggs ? `Kläck ${eggs}` : "Samling"}
        </Link>
      </header>

      <h1 className="display text-center" style={{ color: "var(--mynta)", fontSize: "var(--t-2xl)" }}>Matteön</h1>

      {TIER_ORDER.map((tier, world) => {
        const steps = w.steps.filter((s) => s.world === world);
        const T = TIERS[tier], theme = THEMES[tier] ?? THEMES[0];
        const done = steps.filter((s) => s.stars > 0).length;
        const open = steps[0].open;
        const head = (
          <div className="flex items-center gap-3 px-4 py-3" style={{ color: theme.dark ? "#fff" : "var(--plommon)" }}>
            <span className="inline-block h-14 w-11 shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: eggSvg(tier) }} />
            <div className="min-w-0 flex-1">
              <h2 className="display" style={{ fontSize: "var(--t-xl)" }}>{T.name}-världen</h2>
              {open ? (
                <>
                  <div className="kl-bar mt-1" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label={`${done} av ${steps.length} steg klara`}>
                    <span style={{ width: `${(done / steps.length) * 100}%`, background: T.egg[1] }} />
                  </div>
                  <p className="mt-1 text-sm font-semibold opacity-80">{done} av {steps.length} · boss: {WORLD_BOSSES[tier]}</p>
                </>
              ) : (
                <p className="text-sm font-semibold opacity-80">Låst. Klara stegen före för att komma hit.</p>
              )}
            </div>
            {!open && <span className="kl-silhuett inline-block h-16 w-16 shrink-0 opacity-70" aria-hidden="true"><RawArt svg={bossSvg(tier)} size={64} /></span>}
          </div>
        );
        const frame = { borderColor: T.egg[1], background: `linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]})` };
        if (!open) {
          return <section key={tier} className="kl-varld overflow-hidden opacity-70" style={frame} aria-label={`${T.name}-världen, låst`}>{head}</section>;
        }
        return (
          <section key={tier} className="kl-varld overflow-hidden" style={frame} aria-label={`${T.name}-världen`} id={world === curWorld ? "nuvarande-varld" : undefined}>
            <div className="border-b-2" style={{ borderColor: `${T.egg[1]}88`, background: `${theme.sky[0]}` }}>{head}</div>
            <WorldMap tier={tier} pos={world} steps={steps} current={w.current} mascot={mascot} />
          </section>
        );
      })}

      {/* Fast meny längst ner, som i Eggly 1: spela, alla spel, öva, framsteg. */}
      <nav aria-label="Meny" className="kl-nav fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl items-center gap-1.5 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <Link href={`/spela/matte/steg/${cur.id}`} className="squish min-w-0 flex-1 !px-3">
          <span aria-hidden="true">▶</span> <span className="truncate">Spela {cur.index + 1}</span>
        </Link>
        <Link href="/spela/spel" className="squish squish--mjuk squish--liten !px-2.5">Spel</Link>
        <Link href="/spela/ova" className="squish squish--mjuk squish--liten !px-2.5">Öva</Link>
        <Link href="/spela/framsteg" className="squish squish--mjuk squish--liten !px-2.5">Framsteg</Link>
      </nav>
      <ScrollToCurrent />
    </main>
  );
}
