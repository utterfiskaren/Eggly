import type { GameId } from "@eggly/content";

/** Små bilder till spelkorten. Enkla former i märkets färger, inga emojier. */
export function GameGlyph({ game, size = 56 }: { game: GameId; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true as const };
  const ink = "#2a1b3d", pink = "#e8336f", mint = "#1f9e78", sun = "#ffd23f", sky = "#2f7fe0", milk = "#f6f3ff";
  switch (game) {
    case "rakna":
      return <svg {...common}><rect x="6" y="10" width="52" height="44" rx="12" fill={milk} stroke={ink} strokeWidth="3" /><text x="32" y="43" textAnchor="middle" fontSize="28" fontWeight="700" fill={pink} fontFamily="ui-rounded, system-ui">12</text></svg>;
    case "bubbel":
      return <svg {...common}><circle cx="22" cy="40" r="15" fill="#cfe6ff" stroke={sky} strokeWidth="3" /><circle cx="43" cy="24" r="11" fill="#ffd6e7" stroke={pink} strokeWidth="3" /><circle cx="46" cy="47" r="7" fill="#c9f0e1" stroke={mint} strokeWidth="3" /></svg>;
    case "sant":
      return <svg {...common}><circle cx="20" cy="32" r="14" fill={mint} /><path d="M13 32l5 5 9-10" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="46" cy="32" r="14" fill={pink} /><path d="M40 26l12 12M52 26L40 38" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>;
    case "minne":
      return <svg {...common}><rect x="6" y="14" width="22" height="30" rx="6" fill={sky} stroke={ink} strokeWidth="3" /><rect x="36" y="20" width="22" height="30" rx="6" fill={sun} stroke={ink} strokeWidth="3" /><text x="17" y="36" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" fontFamily="ui-rounded, system-ui">?</text></svg>;
    case "fanga":
      return <svg {...common}><circle cx="20" cy="14" r="8" fill={milk} stroke={ink} strokeWidth="3" /><circle cx="44" cy="26" r="8" fill={milk} stroke={ink} strokeWidth="3" /><path d="M10 58c0-12 8-18 22-18s22 6 22 18z" fill={mint} stroke={ink} strokeWidth="3" /></svg>;
    case "kiosk":
      return <svg {...common}><circle cx="32" cy="32" r="24" fill={sun} stroke="#e8ac2a" strokeWidth="4" /><circle cx="32" cy="32" r="17" fill="none" stroke="#e8ac2a" strokeWidth="2" /><text x="32" y="41" textAnchor="middle" fontSize="24" fontWeight="700" fill={ink} fontFamily="ui-rounded, system-ui">kr</text></svg>;
    case "krossa":
      return <svg {...common}>{[0, 1, 2, 3].map((i) => <rect key={i} x={8 + (i % 2) * 26} y={8 + Math.floor(i / 2) * 26} width="22" height="22" rx="6" fill={i === 1 || i === 2 ? sun : milk} stroke={ink} strokeWidth="3" />)}</svg>;
    case "storre":
      return <svg {...common}><path d="M12 14l40 18-40 18z" fill="none" stroke={ink} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" /><circle cx="52" cy="14" r="5" fill={pink} /></svg>;
    case "spurt":
      return <svg {...common}><circle cx="32" cy="36" r="22" fill={milk} stroke={ink} strokeWidth="3" /><path d="M32 36V22M26 8h12" stroke={ink} strokeWidth="4" strokeLinecap="round" /><path d="M32 36l10 6" stroke={pink} strokeWidth="4" strokeLinecap="round" /></svg>;
    case "rush":
      return <svg {...common}><path d="M6 46A26 26 0 0 1 58 46" fill="none" stroke={pink} strokeWidth="6" /><path d="M13 46A19 19 0 0 1 51 46" fill="none" stroke={sun} strokeWidth="6" /><path d="M20 46A12 12 0 0 1 44 46" fill="none" stroke={mint} strokeWidth="6" /><circle cx="32" cy="46" r="6" fill="#fff" stroke={ink} strokeWidth="3" /></svg>;
    case "strid":
      return <svg {...common}><path d="M10 54L44 12M44 12l10-2-2 10M54 54L20 12M20 12L10 10l2 10" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="32" r="5" fill={pink} /></svg>;
  }
}
