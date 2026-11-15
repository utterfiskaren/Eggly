import type { Squishy } from "@eggly/content";

/**
 * En klämmis ritad i SVG av några få delar. Kroppen har äggform, som allt annat i Eggly.
 * `decorative` döljer figuren för skärmläsare när namnet redan står bredvid.
 */
export function SquishyArt({ s, size = 96, decorative = false, sleeping = false }: {
  s: Squishy; size?: number; decorative?: boolean; sleeping?: boolean;
}) {
  const body = "M50 8 C76 8 90 36 90 60 C90 84 72 96 50 96 C28 96 10 84 10 60 C10 36 24 8 50 8 Z";
  return (
    <svg viewBox="0 0 100 104" width={size} height={size * 1.04} role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined} aria-label={decorative ? undefined : s.name}>
      <Ears kind={s.ears} body={s.body} accent={s.accent} />
      <path d={body} fill={s.body} stroke={s.accent} strokeWidth="3" />
      {s.pattern === "belly" && <ellipse cx="50" cy="74" rx="22" ry="16" fill="#fff" opacity="0.7" />}
      {s.pattern === "spots" && (
        <g fill={s.accent} opacity="0.35">
          <circle cx="26" cy="46" r="5" /><circle cx="76" cy="54" r="6" /><circle cx="64" cy="82" r="4" /><circle cx="30" cy="78" r="4" />
        </g>
      )}
      {s.pattern === "stripes" && (
        <g stroke={s.accent} strokeWidth="3" strokeLinecap="round" opacity="0.35" fill="none">
          <path d="M40 14 Q50 20 60 14" /><path d="M30 24 Q50 32 70 24" />
        </g>
      )}
      {sleeping ? (
        <g stroke="#2a1b3d" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M33 56 Q38 60 43 56" /><path d="M57 56 Q62 60 67 56" />
        </g>
      ) : (
        <g fill="#2a1b3d">
          <ellipse cx="38" cy="55" rx="4.5" ry="5.5" /><ellipse cx="62" cy="55" rx="4.5" ry="5.5" />
          <circle cx="39.5" cy="53" r="1.6" fill="#fff" /><circle cx="63.5" cy="53" r="1.6" fill="#fff" />
        </g>
      )}
      <ellipse cx="29" cy="65" rx="6" ry="3.5" fill="#e8336f" opacity="0.3" />
      <ellipse cx="71" cy="65" rx="6" ry="3.5" fill="#e8336f" opacity="0.3" />
      <path d="M44 66 Q50 72 56 66" stroke="#2a1b3d" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Extra kind={s.extra} accent={s.accent} />
    </svg>
  );
}

function Ears({ kind, body, accent }: { kind: Squishy["ears"]; body: string; accent: string }) {
  const p = { fill: body, stroke: accent, strokeWidth: 3 };
  if (kind === "round") return <g {...p}><circle cx="24" cy="26" r="10" /><circle cx="76" cy="26" r="10" /></g>;
  if (kind === "pointy") return <g {...p}><path d="M20 34 L26 8 L40 22 Z" /><path d="M80 34 L74 8 L60 22 Z" /></g>;
  if (kind === "bunny") return <g {...p}><ellipse cx="36" cy="14" rx="7" ry="16" /><ellipse cx="64" cy="14" rx="7" ry="16" /></g>;
  if (kind === "sprout") return (
    <g stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none">
      <path d="M50 10 Q50 2 44 0" /><path d="M50 10 Q52 2 58 1" />
    </g>
  );
  return null;
}

function Extra({ kind, accent }: { kind: Squishy["extra"]; accent: string }) {
  if (kind === "bow") return <g fill={accent}><path d="M66 18 L78 12 L78 26 Z" /><path d="M90 18 L78 12 L78 26 Z" /><circle cx="78" cy="19" r="3" /></g>;
  if (kind === "leaf") return <path d="M50 10 C58 0 70 2 70 2 C68 12 58 14 50 10 Z" fill="#1f9e78" />;
  if (kind === "star") return <path d="M80 8 L83 15 L90 15 L84.5 19.5 L86.5 27 L80 22.5 L73.5 27 L75.5 19.5 L70 15 L77 15 Z" fill="#ffd23f" stroke="#c98a12" strokeWidth="1.5" />;
  if (kind === "glasses") return (
    <g fill="none" stroke="#2a1b3d" strokeWidth="2.5"><circle cx="38" cy="55" r="9" /><circle cx="62" cy="55" r="9" /><path d="M47 55 L53 55" /></g>
  );
  if (kind === "crown") return <path d="M36 14 L40 2 L46 10 L50 0 L54 10 L60 2 L64 14 Z" fill="#ffd23f" stroke="#c98a12" strokeWidth="1.5" />;
  return null;
}

/** Ett ägg. `progress` 0–1 fyller en gul rand underifrån. `crack` visar sprickor. */
export function EggArt({ size = 64, progress = 1, crack = false, label }: {
  size?: number; progress?: number; crack?: boolean; label?: string;
}) {
  const shape = "M50 4 C74 4 92 40 92 64 C92 88 74 100 50 100 C26 100 8 88 8 64 C8 40 26 4 50 4 Z";
  const y = 100 - Math.max(0, Math.min(1, progress)) * 96;
  const id = `egg-clip-${size}-${Math.round(progress * 100)}`;
  return (
    <svg viewBox="0 0 100 104" width={size} height={size * 1.04} role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}>
      <defs><clipPath id={id}><path d={shape} /></clipPath></defs>
      <path d={shape} fill="#fff" />
      <rect x="0" y={y} width="100" height="104" fill="#ffd23f" opacity="0.55" clipPath={`url(#${id})`} />
      <g fill="#ffd23f" clipPath={`url(#${id})`}><circle cx="34" cy="40" r="7" /><circle cx="66" cy="58" r="9" /><circle cx="40" cy="80" r="6" /></g>
      <path d={shape} fill="none" stroke="#2a1b3d" strokeWidth="3" />
      {crack && <path d="M14 58 L30 50 L38 62 L50 48 L62 62 L72 50 L88 58" fill="none" stroke="#2a1b3d" strokeWidth="3" strokeLinejoin="round" />}
    </svg>
  );
}
