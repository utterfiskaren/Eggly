import type { Metadata } from "next";
import Link from "next/link";
import { RARITY_LABEL, SQUISHIES } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { Hatcher } from "@/components/game/Hatcher";
import { EggArt, SquishyArt } from "@/components/game/Squishy";
import { requireChild } from "@/lib/child";
import { collection, loadWorld } from "@/lib/world";

export const metadata: Metadata = { title: "Min samling" };

export default async function Page() {
  const me = await requireChild();
  const [w, owned] = await Promise.all([loadWorld(me), collection(me)]);
  const count = new Map<string, number>();
  for (const o of owned) count.set(o.squishyId, (count.get(o.squishyId) ?? 0) + 1);
  const have = SQUISHIES.filter((s) => count.has(s.id)).length;

  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between">
        <Link href="/spela" className="flex min-h-[44px] items-center"><Logo size={30} /></Link>
        <Link href="/spela/matte" className="squish squish--liten squish--mjuk">Till kartan</Link>
      </header>
      <h1 style={{ fontSize: "var(--t-2xl)" }}>Min samling</h1>

      {w.eggs > 0 ? <Hatcher eggs={w.eggs} /> : (
        <div className="kort flex items-center gap-4 p-4">
          <EggArt size={52} progress={w.eggProgress} />
          <p>Nästa ägg är {Math.round(w.eggProgress * 100)} % klart. Spela på Matteön för att samla stjärnor.</p>
        </div>
      )}

      <section aria-labelledby="klammisar" className="flex flex-col gap-3">
        <h2 id="klammisar" style={{ fontSize: "var(--t-xl)" }}>Klämmisar: {have} av {SQUISHIES.length}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SQUISHIES.map((s) => {
            const n = count.get(s.id) ?? 0;
            return (
              <li key={s.id} className="kort flex flex-col items-center gap-1 p-3 text-center" style={n ? undefined : { background: "var(--mjolkis)" }}>
                {n > 0 ? (
                  <>
                    <SquishyArt s={s} size={84} decorative />
                    <span className="display" style={{ fontSize: "var(--t-lg)" }}>{s.name}{n > 1 ? ` ×${n}` : ""}</span>
                    <span className="hjalptext">{RARITY_LABEL[s.rarity]}</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-[87px] w-[84px] items-center justify-center display text-3xl text-[var(--plommon-2)]"
                      style={{ borderRadius: "var(--agg)", background: "var(--dimma)" }} aria-hidden="true">?</span>
                    <span className="hjalptext">Inte kläckt än</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
