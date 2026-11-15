import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { EggArt } from "@/components/game/Squishy";
import { requireChild } from "@/lib/child";
import { loadWorld } from "@/lib/world";

export const metadata: Metadata = { title: "Matteön" };

/** Ön ritad som en mjuk klump, med stigen mellan stoppen. Stoppen själva är länkar ovanpå. */
function IslandBackdrop({ points }: { points: [number, number][] }) {
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="100" height="100" fill="#d7ebff" />
      <path d="M8 92 C-2 70 6 40 14 22 C22 4 48 2 66 4 C86 6 98 22 96 46 C94 70 98 88 80 96 C60 102 22 104 8 92 Z" fill="#bfe8d6" />
      <path d="M12 88 C4 68 10 42 18 26 C26 10 48 8 64 9 C82 10 92 24 91 46 C90 68 93 84 78 91 C60 97 26 98 12 88 Z" fill="#9fdcc2" />
      <path d={path} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="2.4 2" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 6 }} />
    </svg>
  );
}

export default async function Page() {
  const me = await requireChild();
  const w = await loadWorld(me);
  const current = w.stops.filter((s) => s.open).at(-1);
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center"><Logo size={30} /></Link>
        <h1 className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-xl)" }}>Matteön</h1>
      </header>

      <div className="kort flex items-center gap-4 p-4">
        <EggArt size={52} progress={w.eggProgress} crack={w.eggs > 0} />
        <div className="flex-1">
          <p className="font-semibold"><span aria-hidden="true">⭐</span> {w.totalStars} stjärnor</p>
          <p className="hjalptext">
            {w.eggs > 0 ? `Du har ${w.eggs === 1 ? "ett ägg" : `${w.eggs} ägg`} som vill kläckas!` : "Samla stjärnor så kläcks ditt nästa ägg."}
          </p>
        </div>
        <Link href="/spela/samling" className={`squish squish--liten ${w.eggs > 0 ? "" : "squish--mjuk"}`}>
          {w.eggs > 0 ? "Kläck" : "Samlingen"}
        </Link>
      </div>

      <section aria-labelledby="karta" className="relative overflow-hidden rounded-[var(--r-lg)] border-2 border-[var(--dimma)] aspect-[4/5] sm:aspect-[16/11]">
        <h2 id="karta" className="sr-only">Kartan. Välj ett stopp.</h2>
        <IslandBackdrop points={w.stops.map((s) => [s.x, s.y])} />
        <ol className="absolute inset-0">
          {w.stops.map((s) => {
            const here = s.id === current?.id;
            const label = `${s.name}. ${s.open ? `${s.stars} av 3 stjärnor.` : "Låst."}${here ? " Du är här." : ""}`;
            const egg = (
              <span className="relative flex h-14 w-12 items-center justify-center display text-lg"
                style={{ borderRadius: "var(--agg)", background: s.open ? (here ? "var(--jordgubb)" : "var(--vit)") : "#cfd8dc",
                  color: here ? "#fff" : "var(--plommon)", border: "3px solid var(--plommon)" }}>
                {s.open ? s.index + 1 : <LockIcon />}
              </span>
            );
            return (
              <li key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                {s.open ? (
                  <Link href={`/spela/matte/${s.id}`} aria-label={label}
                    className={`kort--klick flex min-h-[56px] min-w-[56px] flex-col items-center gap-0.5 rounded-[var(--r-md)] p-1 ${here ? "agg-gung" : ""}`}>
                    {egg}
                    <Stars n={s.stars} />
                    <span className="hidden rounded-full bg-white/90 px-2 text-xs font-semibold sm:block">{s.name}</span>
                  </Link>
                ) : (
                  <span aria-label={label} role="img" className="flex flex-col items-center gap-0.5 p-1 opacity-80">{egg}</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {current && (
        <Link href={`/spela/matte/${current.id}`} className="squish self-center">Spela på {current.name}</Link>
      )}
      <p className="hjalptext text-center">Två stjärnor på ett stopp öppnar nästa. Du kan alltid gå tillbaka och spela igen.</p>
    </main>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="text-sm leading-none" style={{ color: "#c98a12" }}>
      {"★".repeat(n)}<span style={{ color: "#fff" }}>{"★".repeat(3 - n)}</span>
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="3" fill="var(--plommon)" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="var(--plommon)" strokeWidth="2.5" />
    </svg>
  );
}
