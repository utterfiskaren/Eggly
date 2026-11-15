import { eggSvg, squishySvg, type Treats } from "@eggly/content";

/**
 * Klämmisar och ägg ritas av samma kod som i Eggly 1 och kommer som färdig SVG-text.
 * Texten byggs bara av vår egen kod och fasta id:n, aldrig av något barnet skrivit,
 * så den kan sättas in direkt.
 */
function Svg({ svg, size, label }: { svg: string; size: number; label?: string }) {
  return (
    <span className="inline-block [&>svg]:h-full [&>svg]:w-full" style={{ width: size, height: size }}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export function SquishyArt({ id, treats = {}, size = 96, label }: { id: string; treats?: Treats; size?: number; label?: string }) {
  return <Svg svg={squishySvg(id, treats)} size={size} label={label} />;
}

/** Ett färdigritat SVG från servern (t.ex. efter kläckningen). */
export function RawArt({ svg, size = 96, label }: { svg: string; size?: number; label?: string }) {
  return <Svg svg={svg} size={size} label={label} />;
}

/** Ett ägg. `tier` är nivån (0 = Brons), `cracks` 0–5 sprickor. */
export function EggArt({ tier = 0, cracks = 0, size = 64, label }: { tier?: number; cracks?: number; size?: number; label?: string }) {
  return (
    <span className="inline-block [&>svg]:h-full [&>svg]:w-full" style={{ width: size * 0.8, height: size }}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: eggSvg(tier, cracks) }} />
  );
}
