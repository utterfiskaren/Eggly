import type { Metadata } from "next";
import Link from "next/link";
import { GAME_NAMES, TIERS, TIER_ORDER, WORLD_BOSSES, eggSvg } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { ScrollToCurrent } from "@/components/game/ScrollToCurrent";
import { requireChild } from "@/lib/child";
import { loadWorld, type StepView } from "@/lib/world";

export const metadata: Metadata = { title: "Matteön" };

/* Stigen i varje värld ritas i rader om fem som slingrar fram och tillbaka. */
const PER_ROW = 5, W = 500, ROW_H = 96, PAD_X = 56;
function pos(k: number) {
  const row = Math.floor(k / PER_ROW), col = k % PER_ROW;
  const c = row % 2 === 0 ? col : PER_ROW - 1 - col;
  const x = PAD_X + (c * (W - 2 * PAD_X)) / (PER_ROW - 1);
  const y = 52 + row * ROW_H + (c % 2 ? 18 : 0);
  return { x, y };
}

function WorldPath({ steps, current, color, dark }: { steps: StepView[]; current: number; color: string; dark: string }) {
  const pts = steps.map((s) => pos(s.k));
  const h = pts[pts.length - 1].y + 70;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="block w-full" role="list" aria-label="Stegen i världen">
      <path d={d} fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
      <path d={d} fill="none" stroke={dark} strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" opacity=".5" />
      {steps.map((s, i) => {
        const { x, y } = pts[i];
        const here = s.index === current;
        const r = s.boss ? 30 : s.mini ? 25 : 22;
        const label = `Steg ${s.index + 1}: ${s.title}, ${GAME_NAMES[s.game]}. ${s.stars ? `${s.stars} av 5 stjärnor.` : s.open ? "Inte klarat än." : "Låst."}${here ? " Du är här." : ""}`;
        const body = (
          <g className={here ? "steg-nu" : undefined} style={{ transformOrigin: `${x}px ${y}px` }}>
            <circle cx={x} cy={y + 4} r={r} fill={dark} opacity=".35" />
            <circle cx={x} cy={y} r={r} fill={!s.open ? "#d9d4e3" : here ? "var(--jordgubb)" : s.stars ? color : "#fff"}
              stroke={here ? "#fff" : dark} strokeWidth={here ? 5 : 3} />
            {s.open ? (
              <text x={x} y={y + 6} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: s.boss ? 20 : 17, fontWeight: 600 }}
                fill={here ? "#fff" : "var(--plommon)"}>{s.boss ? "★" : s.index + 1}</text>
            ) : (
              <path d={`M${x - 7} ${y - 1}h14v10h-14z M${x - 4} ${y - 1}v-4a4 4 0 0 1 8 0v4`} fill="none" stroke="#8f86a3" strokeWidth="2.5" />
            )}
            {s.stars > 0 && (
              <text x={x} y={y + r + 15} textAnchor="middle" style={{ fontSize: 11, letterSpacing: 1 }} fill="#c98a12">
                {"★".repeat(s.stars)}<tspan fill="#fff">{"★".repeat(5 - s.stars)}</tspan>
              </text>
            )}
          </g>
        );
        return s.open ? (
          <a key={s.id} href={`/spela/matte/steg/${s.id}`} aria-label={label} role="listitem" id={here ? "steg-nu" : undefined} className="steg-lank">
            <circle cx={x} cy={y} r={34} fill="transparent" />
            {body}
          </a>
        ) : <g key={s.id} role="listitem" aria-label={label}>{body}</g>;
      })}
    </svg>
  );
}

export default async function Page() {
  const me = await requireChild();
  const w = await loadWorld(me);
  const curWorld = w.steps[w.current].world;
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center"><Logo size={30} /></Link>
        <h1 className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-xl)" }}>Matteön</h1>
      </header>

      <div className="kort flex items-center gap-4 p-4">
        <span className="inline-block h-14 w-11 shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: eggSvg(w.eggs[0] ?? TIER_ORDER[curWorld], w.eggs.length ? 2 : 0) }} />
        <div className="flex-1">
          <p className="font-semibold">{w.cleared} av {w.steps.length} steg klara · <span aria-hidden="true">⭐</span> {w.totalStars}</p>
          <p className="hjalptext">{w.eggs.length ? `Du har ${w.eggs.length === 1 ? "ett ägg" : `${w.eggs.length} ägg`} att kläcka!` : "Klara ett steg så får du ett ägg."}</p>
        </div>
        <Link href="/spela/samling" className={`squish squish--liten ${w.eggs.length ? "" : "squish--mjuk"}`}>{w.eggs.length ? "Kläck" : "Samlingen"}</Link>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={`/spela/matte/steg/${w.steps[w.current].id}`} className="squish">
          Spela steg {w.current + 1}: {w.steps[w.current].title}
        </Link>
        <Link href="/spela/spel" className="squish squish--mjuk">Alla spel</Link>
        <Link href="/spela/ova" className="squish squish--mjuk">Öva</Link>
      </div>

      {TIER_ORDER.map((tier, world) => {
        const steps = w.steps.filter((s) => s.world === world);
        const T = TIERS[tier];
        const done = steps.filter((s) => s.stars > 0).length;
        const open = steps[0].open;
        const head = (
          <div className="flex items-center gap-3 p-3">
            <span className="inline-block h-12 w-10 shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: eggSvg(tier) }} />
            <div className="flex-1">
              <h2 className="display" style={{ fontSize: "var(--t-lg)" }}>{T.name}-världen</h2>
              <p className="hjalptext">{open ? `${done} av ${steps.length} klara · boss: ${WORLD_BOSSES[tier]}` : "Låst. Klara stegen före för att komma hit."}</p>
            </div>
          </div>
        );
        const style = { background: `linear-gradient(180deg, ${T.egg[0]}, ${T.egg[1]}55)`, borderColor: T.egg[1] };
        if (!open) return <section key={tier} className="rounded-[var(--r-lg)] border-2 opacity-60" style={style} aria-label={`${T.name}-världen, låst`}>{head}</section>;
        const path = <WorldPath steps={steps} current={w.current} color={T.egg[1]} dark={T.egg[2]} />;
        return world === curWorld ? (
          <section key={tier} className="overflow-hidden rounded-[var(--r-lg)] border-2" style={style} aria-label={`${T.name}-världen`}>{head}{path}</section>
        ) : (
          <details key={tier} className="overflow-hidden rounded-[var(--r-lg)] border-2" style={style}>
            <summary className="cursor-pointer list-none">{head}</summary>{path}
          </details>
        );
      })}
      <ScrollToCurrent />
    </main>
  );
}
