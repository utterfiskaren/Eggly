import type { Visual } from "@eggly/engine";

/** Bildstöd till uppgifterna. Ritat i SVG, utan bilder som behöver laddas. */
export function QuestionVisual({ visual }: { visual: Visual }) {
  if (visual.kind === "tenframe") return <TenFrames a={visual.a} b={visual.b} op={visual.op} />;
  if (visual.kind === "groups") return <Groups groups={visual.groups} per={visual.per} />;
  return <Share total={visual.total} groups={visual.groups} />;
}

const DOT = 18, GAP = 6, CELL = DOT + GAP;

/** En eller två tiorutor. Plus: två färger. Minus: de som tas bort är överkryssade. */
function TenFrames({ a, b, op }: { a: number; b: number; op: "+" | "−" }) {
  const total = op === "+" ? a + b : a;
  const frames = Math.max(1, Math.ceil(total / 10));
  const w = 5 * CELL + 8, h = 2 * CELL + 8;
  const dots = Array.from({ length: frames * 10 }, (_, i) => {
    const filled = i < total;
    const second = op === "+" ? i >= a && i < a + b : i >= a - b && i < a;
    return { filled, second };
  });
  return (
    <svg viewBox={`0 0 ${w * frames + (frames - 1) * 12} ${h}`} className="mx-auto w-full max-w-sm" role="img"
      aria-label={op === "+" ? `${a} prickar och ${b} prickar` : `${a} prickar, ${b} tas bort`}>
      {Array.from({ length: frames }, (_, f) => (
        <g key={f} transform={`translate(${f * (w + 12)},0)`}>
          <rect x="1" y="1" width={w - 2} height={h - 2} rx="10" fill="#fff" stroke="var(--dimma)" strokeWidth="2" />
          {dots.slice(f * 10, f * 10 + 10).map((d, i) => {
            const cx = 4 + (i % 5) * CELL + CELL / 2, cy = 4 + Math.floor(i / 5) * CELL + CELL / 2;
            if (!d.filled) return <circle key={i} cx={cx} cy={cy} r={DOT / 2} fill="none" stroke="var(--dimma)" strokeWidth="2" />;
            const color = op === "+" ? (d.second ? "var(--himmel)" : "var(--mynta)") : "var(--mynta)";
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={DOT / 2} fill={color} opacity={op === "−" && d.second ? 0.35 : 1} />
                {op === "−" && d.second && <path d={`M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}`} stroke="var(--plommon)" strokeWidth="3" strokeLinecap="round" />}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/** Lika stora grupper, t.ex. 4 × 3 som fyra ägg med tre prickar i varje. */
function Groups({ groups, per }: { groups: number; per: number }) {
  const cols = Math.min(5, groups), rows = Math.ceil(groups / cols);
  const gw = 84, gh = 96;
  return (
    <svg viewBox={`0 0 ${cols * gw} ${rows * gh}`} className="mx-auto w-full max-w-md" role="img" aria-label={`${groups} grupper med ${per} i varje`}>
      {Array.from({ length: groups }, (_, g) => {
        const x = (g % cols) * gw, y = Math.floor(g / cols) * gh;
        return (
          <g key={g} transform={`translate(${x + 6},${y + 6})`}>
            <path d="M36 2C18 2 4 30 4 52c0 20 14 34 32 34s32-14 32-34C68 30 54 2 36 2Z" fill="#fff" stroke="var(--dimma)" strokeWidth="2.5" />
            {Array.from({ length: per }, (_, i) => {
              const c = Math.min(3, per <= 4 ? 2 : 3);
              return <circle key={i} cx={20 + (i % c) * 16} cy={30 + Math.floor(i / c) * 16} r="6" fill="var(--jordgubb)" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Likadelning: alla saker i en rad, och tomma tallrikar att dela på. */
function Share({ total, groups }: { total: number; groups: number }) {
  const perRow = 10, rows = Math.ceil(total / perRow);
  const w = perRow * 22 + 8;
  return (
    <svg viewBox={`0 0 ${w} ${rows * 22 + 70}`} className="mx-auto w-full max-w-sm" role="img" aria-label={`${total} saker ska delas på ${groups}`}>
      {Array.from({ length: total }, (_, i) => (
        <circle key={i} cx={15 + (i % perRow) * 22} cy={15 + Math.floor(i / perRow) * 22} r="8" fill="var(--citron)" stroke="var(--plommon)" strokeWidth="1.5" />
      ))}
      {Array.from({ length: groups }, (_, g) => (
        <ellipse key={g} cx={(w / (groups + 1)) * (g + 1)} cy={rows * 22 + 40} rx="20" ry="10" fill="#fff" stroke="var(--dimma)" strokeWidth="2.5" />
      ))}
    </svg>
  );
}
