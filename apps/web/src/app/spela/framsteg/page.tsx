import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ARCADE_LEVELS, GAME_NAMES, TEMPO, type GameId } from "@eggly/content";
import { requireChild } from "@/lib/child";
import { loadProgress } from "@/lib/progress";

export const metadata: Metadata = { title: "Mina framsteg" };

export default async function Page() {
  const me = await requireChild();
  const p = await loadProgress(me);
  const stats = [
    [p.answered, "tal har du räknat"], [p.stars, "stjärnor samlade"], [p.days, "dagar har du övat"],
    [p.squishies, "klämmisar i samlingen"], [p.skillsSecure, "saker kan du riktigt bra"],
  ] as const;
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={30} /></Link>
        <h1 className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-xl)" }}>Mina framsteg</h1>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([v, l]) => (
          <li key={l} className="kort flex flex-col items-center gap-1 p-3 text-center">
            <span className="display" style={{ fontSize: "var(--t-2xl)", color: "var(--plommon)" }}>{v}</span>
            <span className="hjalptext">{l}</span>
          </li>
        ))}
      </ul>
      <section className="kort flex flex-col gap-2 p-4" aria-label="Kartan">
        <h2 className="etikett">Matteön</h2>
        <p>Du har klarat {p.stepsCleared} av {p.stepsTotal} steg.</p>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--dimma)]" role="progressbar" aria-valuemin={0} aria-valuemax={p.stepsTotal} aria-valuenow={p.stepsCleared} aria-label="Klarade steg">
          <div className="h-full rounded-full" style={{ width: `${(p.stepsCleared / p.stepsTotal) * 100}%`, background: "var(--mynta)" }} />
        </div>
      </section>
      <section className="kort flex flex-col gap-3 p-4" aria-label="Dina rekord">
        <h2 className="etikett">Dina rekord</h2>
        {p.records.length === 0 ? (
          <p className="hjalptext">Spela ett spel under Alla spel, så dyker ditt första rekord upp här.</p>
        ) : (
          <>
            <p className="hjalptext">Flest rätt du har haft på en omgång. Det är bara du mot dig själv.</p>
            <ul className="flex flex-col gap-2">
              {p.records.map((r) => (
                <li key={r.game} className="flex items-center justify-between gap-3 rounded-[var(--r-md)] p-3" style={{ background: "var(--mjolkis)" }}>
                  <span className="flex flex-col">
                    <span className="display" style={{ fontSize: "var(--t-lg)" }}>{GAME_NAMES[r.game as GameId] ?? r.game}</span>
                    <span className="hjalptext">
                      {r.level ? `${ARCADE_LEVELS[r.level - 1]?.name ?? `Nivå ${r.level}`}${r.tempo !== undefined ? `, ${TEMPO[r.tempo]?.name.toLowerCase()}` : ""} · ` : ""}{r.rounds} {r.rounds === 1 ? "omgång" : "omgångar"}
                    </span>
                  </span>
                  <span className="display" style={{ fontSize: "var(--t-xl)", color: "var(--mynta)" }} aria-label={`${r.best} rätt som mest`}>{r.best} rätt</span>
                </li>
              ))}
            </ul>
            <Link href="/spela/spel" className="squish squish--mjuk self-start">Slå ett rekord</Link>
          </>
        )}
      </section>
      <section className="kort flex flex-col gap-3 p-4" aria-label="Gångertabeller">
        <h2 className="etikett">Gångertabeller</h2>
        <p className="hjalptext">Tre stjärnor och en krona när du kan alla tio talen i tabellen.</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {p.tables.map((t) => (
            <li key={t.table} className="flex flex-col items-center gap-1 rounded-[var(--r-md)] p-2" style={{ background: "var(--mjolkis)" }}>
              <span className="display" style={{ fontSize: "var(--t-lg)" }}>{t.table}:an{t.stars === 3 ? " 👑" : ""}</span>
              <span aria-label={`${t.stars} av 3 stjärnor`}>
                <span aria-hidden="true" style={{ color: "#e0a51c" }}>{"★".repeat(t.stars)}</span>
                <span aria-hidden="true" className="opacity-20">{"★".repeat(3 - t.stars)}</span>
              </span>
              <span className="hjalptext">{t.known} av 10</span>
              <span className="h-2 w-full overflow-hidden rounded-full bg-[var(--dimma)]" aria-hidden="true">
                <span className="block h-full" style={{ width: `${t.known * 10}%`, background: "var(--mynta)" }} />
              </span>
            </li>
          ))}
        </ul>
        <Link href="/spela/ova" className="squish squish--mjuk self-start">Öva tabeller</Link>
      </section>
    </main>
  );
}
