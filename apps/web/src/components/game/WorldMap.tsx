import { GAME_NAMES, TIERS, WORLD_BOSSES, bossSvg, eggSvg, type Treats } from "@eggly/content";
import type { StepView } from "@/lib/world";
import { RawArt, SquishyArt } from "./Squishy";
import { Scenery, THEMES } from "./WorldScenery";

/**
 * En hel värld på Matteön: ett eget landskap med en lång slingrande stig. Bredden är fast (400)
 * och ritas om till skärmens bredd, så stigen är lika stor på mobil som på dator.
 */
const W = 400, DY = 104, TOP = 96, SWING = 112;

const xAt = (k: number, phase: number) => W / 2 + SWING * Math.sin(k * 0.85 + phase);
const yAt = (k: number) => TOP + k * DY;

/** Mjuk kurva genom alla punkter (Catmull-Rom omräknad till bezier). */
function smooth(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface Mascot { id: string; treats: Treats }

export function WorldMap({ tier, pos, steps, current, mascot }: { tier: number; pos: number; steps: StepView[]; current: number; mascot: Mascot | null }) {
  const T = TIERS[tier], theme = THEMES[tier] ?? THEMES[0];
  const phase = pos * 1.3;
  const pts = steps.map((s) => ({ x: xAt(s.k, phase), y: yAt(s.k) }));
  const h = yAt(steps.length - 1) + 110;
  const all = smooth(pts);
  // Den del av stigen barnet redan gått.
  const walkedTo = steps.reduce((m, s) => (s.stars > 0 || s.index < current ? s.k : m), -1);
  const walked = walkedTo >= 1 ? smooth(pts.slice(0, Math.min(pts.length, walkedTo + 2))) : "";
  const pathX = (y: number) => xAt((y - TOP) / DY, phase);
  const ink = theme.dark ? "#ffffff" : T.egg[2];
  const here = steps.find((s) => s.index === current);
  const boss = steps[steps.length - 1];
  const bp = pts[pts.length - 1];
  const hp = here ? pts[here.k] : null;

  return (
    <div className="relative" style={{ background: `linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]})` }}>
      <svg viewBox={`0 0 ${W} ${h}`} className="block w-full" role="list" aria-label={`Stegen i ${T.name}-världen`}>
        <Scenery theme={theme} seed={tier + 1} w={W} h={h} pathX={pathX} />
        {/* Vägen: kant, ljus bana och den del som redan är gången */}
        <path d={all} fill="none" stroke={ink} strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" opacity=".18" />
        <path d={all} fill="none" stroke="#fff" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" opacity={theme.dark ? 0.85 : 0.9} />
        {walked && <path d={walked} fill="none" stroke={T.egg[1]} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />}
        <path d={all} fill="none" stroke={ink} strokeWidth="3" strokeDasharray="1 11" strokeLinecap="round" opacity=".45" />

        {steps.map((s, i) => {
          const { x, y } = pts[i];
          const isHere = s.index === current;
          const r = s.boss ? 38 : s.mini ? 32 : 28;
          const label = `Steg ${s.index + 1}: ${s.title}, ${GAME_NAMES[s.game]}. ${s.stars ? `${s.stars} av 5 stjärnor.` : s.open ? "Inte klarat än." : "Låst."}${isHere ? " Du är här." : ""}`;
          const fill = !s.open ? "#d9d4e3" : isHere ? "var(--jordgubb)" : s.stars ? "#ffd23f" : "#ffffff";
          const body = (
            <g className={isHere ? "steg-nu" : undefined} style={{ transformOrigin: `${x}px ${y}px` }}>
              {isHere && <circle cx={x} cy={y} r={r + 6} fill="none" stroke="var(--jordgubb)" strokeWidth="4" className="kl-ring" />}
              <circle cx={x} cy={y + 5} r={r} fill={T.egg[2]} opacity=".4" />
              <circle cx={x} cy={y} r={r} fill={fill} stroke={isHere ? "#fff" : T.egg[2]} strokeWidth={isHere ? 6 : 3.5} />
              <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.22} fill="#fff" opacity={s.open ? 0.55 : 0.3} />
              {s.open ? (
                <text x={x} y={y + (s.boss ? 8 : 7)} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: s.boss ? 26 : 21, fontWeight: 600 }} fill={isHere ? "#fff" : "var(--plommon)"}>
                  {s.boss ? "★" : s.index + 1}
                </text>
              ) : (
                <path d={`M${x - 8} ${y - 1}h16v12h-16z M${x - 5} ${y - 1}v-5a5 5 0 0 1 10 0v5`} fill="none" stroke="#8f86a3" strokeWidth="3" strokeLinejoin="round" />
              )}
              {s.stars > 0 && (
                <text x={x} y={y + r + 17} textAnchor="middle" style={{ fontSize: 13, letterSpacing: 1 }} fill="#e0a010" stroke="#fff" strokeWidth=".6">
                  {"★".repeat(s.stars)}<tspan fill="#fff" opacity=".8">{"★".repeat(5 - s.stars)}</tspan>
                </text>
              )}
            </g>
          );
          return s.open ? (
            <a key={s.id} href={`/spela/matte/steg/${s.id}`} aria-label={label} role="listitem" id={isHere ? "steg-nu" : undefined} className="steg-lank">
              <circle cx={x} cy={y} r={r + 12} fill="transparent" />
              {body}
            </a>
          ) : <g key={s.id} role="listitem" aria-label={label}>{body}</g>;
        })}
      </svg>

      {/* Figurer ovanpå kartan, utplacerade i procent så att de följer med när bredden ändras. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${(bp.x / W) * 100}%`, top: `${((bp.y - 40) / h) * 100}%` }}>
          <div className={boss.stars > 0 ? "kl-boss kl-boss--slagen" : "kl-boss"}>
            <RawArt svg={bossSvg(tier)} size={92} />
          </div>
          <p className="kl-skylt">{WORLD_BOSSES[tier]}{boss.stars > 0 ? " · besegrad!" : ""}</p>
        </div>
        {hp && here && (
          // Kompisen står bredvid stigen, på den sida där det finns plats.
          <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${((hp.x + (hp.x < W / 2 ? 78 : -78)) / W) * 100}%`, top: `${((hp.y + 34) / h) * 100}%` }}>
            <p className="kl-prat">Du är här!</p>
            <div className="kl-hopp">
              {mascot ? <SquishyArt id={mascot.id} treats={mascot.treats} size={76} />
                : <span className="inline-block h-[76px] w-[60px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: eggSvg(tier, 1) }} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
