import type { Metadata } from "next";
import Link from "next/link";
import { HATCHABLE, TIERS, TIER_ORDER, TIER_RANK, eggSvg, speciesById, squishySvg } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { Hatcher } from "@/components/game/Hatcher";
import { EggArt } from "@/components/game/Squishy";
import { SamlingYta, type SamlingSektion } from "@/components/game/SamlingYta";
import { requireChild } from "@/lib/child";
import { collection, loadWorld } from "@/lib/world";

export const metadata: Metadata = { title: "Min samling" };

export default async function Page() {
  const me = await requireChild();
  const [w, owned] = await Promise.all([loadWorld(me), collection(me)]);
  const kinds = new Set(owned.map((o) => o.squishyId));
  const eggTier = w.eggs[0] ?? TIER_ORDER[w.steps[w.current].world];
  // Ett ägg spricker lite mer för varje tryck.
  const eggSvgs = [0, 1, 2, 3].map((c) => eggSvg(eggTier, c));
  const curWorld = w.steps[w.current].world;

  // En sektion per nivå, finaste överst. Sorter man har visas först i sin nivå (nyaste först).
  const sektioner: SamlingSektion[] = [];
  let dolda = 0;
  for (const tier of [...TIER_ORDER].sort((a, b) => TIER_RANK[b] - TIER_RANK[a])) {
    const mine = owned.filter((o) => speciesById(o.squishyId)?.tier === tier);
    const total = HATCHABLE.filter((s) => s.tier === tier).length;
    if (total === 0 && mine.length === 0) continue;
    // Nivåer längre bort än barnets värld och utan några egna visas inte än, så att samlingen inte skrämmer.
    if (mine.length === 0 && TIER_RANK[tier] > curWorld + 1) { dolda++; continue; }
    const byId = new Map<string, { o: (typeof owned)[number]; count: number }>();
    for (const o of mine) {
      const e = byId.get(o.squishyId);
      if (e) e.count++; else byId.set(o.squishyId, { o, count: 1 });
    }
    sektioner.push({
      tier, name: TIERS[tier].name, color: TIERS[tier].egg[1], dark: TIERS[tier].egg[2], total,
      items: [...byId.values()].map(({ o, count }) => {
        const sp = speciesById(o.squishyId)!;
        return { id: o.squishyId, name: sp.name, txt: sp.txt, svg: squishySvg(o.squishyId, o.treats), count, legacy: o.legacy };
      }),
    });
  }

  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-3 pb-12 pt-3">
      <header className="kl-hud flex items-center gap-2 rounded-full px-3 py-2">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={26} /></Link>
        <span className="kl-chip" aria-label={`${kinds.size} av ${HATCHABLE.length} sorter`}>{kinds.size}/{HATCHABLE.length}</span>
        <Link href="/spela/matte" className="squish squish--liten squish--mjuk ml-auto">Till kartan</Link>
      </header>
      <h1 className="display text-center" style={{ color: "var(--jordgubb)", fontSize: "var(--t-2xl)" }}>Min samling</h1>

      {w.eggs.length > 0 ? <Hatcher eggs={w.eggs.length} eggSvgs={eggSvgs} /> : (
        <div className="kort flex items-center gap-4 p-4">
          <EggArt tier={eggTier} size={56} />
          <p>Klara ett steg på Matteön så får du ett nytt ägg.</p>
        </div>
      )}

      <p className="text-center font-semibold">{owned.length} klämmisar · {kinds.size} av {HATCHABLE.length} sorter</p>
      {owned.length === 0 ? <p className="text-center">Din samling är tom än. Kläck ditt första ägg!</p> : <SamlingYta sektioner={sektioner} />}
      {dolda > 0 && <p className="hjalptext text-center">Fler nivåer dyker upp när du kommer längre på kartan.</p>}
    </main>
  );
}
