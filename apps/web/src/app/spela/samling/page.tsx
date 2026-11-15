import type { Metadata } from "next";
import Link from "next/link";
import { HATCHABLE, SPECIES, TIERS, TIER_ORDER, TIER_RANK, eggSvg, speciesById } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { Hatcher } from "@/components/game/Hatcher";
import { EggArt, SquishyArt } from "@/components/game/Squishy";
import { requireChild } from "@/lib/child";
import { collection, loadWorld, maxEggRank } from "@/lib/world";

export const metadata: Metadata = { title: "Min samling" };

export default async function Page() {
  const me = await requireChild();
  const [w, owned] = await Promise.all([loadWorld(me), collection(me)]);
  const kinds = new Set(owned.map((o) => o.squishyId));
  const eggTier = TIER_ORDER[maxEggRank(w)];
  // Ett ägg spricker lite mer för varje tryck. Bättre ägg behöver några fler tryck.
  const eggSvgs = [0, 1, 2, 3].map((c) => eggSvg(eggTier, c));
  // Finaste nivån först, så att de sällsynta syns högst upp.
  const sorted = [...owned].sort((a, b) => (TIER_RANK[speciesById(b.squishyId)?.tier ?? 0] - TIER_RANK[speciesById(a.squishyId)?.tier ?? 0]));

  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between">
        <Link href="/spela" className="flex min-h-[44px] items-center"><Logo size={30} /></Link>
        <Link href="/spela/matte" className="squish squish--liten squish--mjuk">Till kartan</Link>
      </header>
      <h1 style={{ fontSize: "var(--t-2xl)" }}>Min samling</h1>

      {w.eggs > 0 ? <Hatcher eggs={w.eggs} eggSvgs={eggSvgs} /> : (
        <div className="kort flex items-center gap-4 p-4">
          <EggArt tier={eggTier} size={56} />
          <p>Nästa ägg är {Math.round(w.eggProgress * 100)} % klart. Spela på Matteön för att samla stjärnor.</p>
        </div>
      )}

      <section aria-labelledby="klammisar" className="flex flex-col gap-3">
        <h2 id="klammisar" style={{ fontSize: "var(--t-xl)" }}>
          Klämmisar: {owned.length} st, {kinds.size} av {HATCHABLE.length} sorter
        </h2>
        {owned.length === 0 ? <p>Din samling är tom än. Kläck ditt första ägg!</p> : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {sorted.map((o, i) => {
              const sp = speciesById(o.squishyId);
              if (!sp) return null;
              return (
                <li key={i} className="kort flex flex-col items-center gap-1 p-2 text-center">
                  <SquishyArt id={o.squishyId} treats={o.treats} size={88} />
                  <span className="text-sm font-semibold leading-tight">{sp.name}</span>
                  <span className="hjalptext">{TIERS[sp.tier].name}{o.legacy ? " · från Eggly 1" : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="hjalptext">Det finns {SPECIES.length - HATCHABLE.length} extra sällsynta sorter som bara kommer vid särskilda bedrifter.</p>
      </section>
    </main>
  );
}
