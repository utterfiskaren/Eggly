import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Startsidan: två vägar in. Barnet till spelet, den vuxna till portalen. */
export default function Home() {
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 pb-10 pt-6">
      <Logo size={40} />
      <div className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <h1 style={{ fontSize: "clamp(36px, 7vw, 56px)" }}>
            Kläck ägg. Samla klämmisar.<br />
            <span style={{ color: "var(--jordgubb)" }}>Bli bättre på riktigt.</span>
          </h1>
          <p style={{ fontSize: "var(--t-lg)" }} className="max-w-prose text-[var(--plommon-2)]">
            Ett spel med tre öar: matte, svenska och engelska. Uppgifterna blir lagom svåra för just dig,
            och det gör inget att svara fel.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/spela/logga-in" className="squish">Jag vill spela</Link>
            <Link href="/portal/logga-in" className="squish squish--mjuk">Jag är lärare eller förälder</Link>
          </div>
        </div>
        <IslandEgg />
      </div>
    </main>
  );
}

/** Signaturbilden: ett stort ägg med de tre öarnas färger, som gungar lite. */
function IslandEgg() {
  return (
    <div className="mx-auto w-full max-w-sm" aria-hidden="true">
      <svg viewBox="0 0 300 360" className="agg-gung w-full">
        <defs>
          <clipPath id="agg"><path d="M150 10C80 10 20 130 20 210c0 80 58 140 130 140s130-60 130-140C280 130 220 10 150 10Z" /></clipPath>
        </defs>
        <path d="M150 10C80 10 20 130 20 210c0 80 58 140 130 140s130-60 130-140C280 130 220 10 150 10Z" fill="#fff" />
        <g clipPath="url(#agg)">
          <circle cx="78" cy="250" r="62" fill="var(--mynta)" opacity=".9" />
          <circle cx="210" cy="230" r="70" fill="var(--himmel)" opacity=".85" />
          <circle cx="150" cy="330" r="64" fill="var(--apelsin)" opacity=".85" />
          <path d="M20 150l40 22 34-28 30 26 30-24 32 24 34-24 42 20" fill="none" stroke="var(--plommon)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M150 10C80 10 20 130 20 210c0 80 58 140 130 140s130-60 130-140C280 130 220 10 150 10Z" fill="none" stroke="var(--plommon)" strokeWidth="6" />
        <ellipse cx="102" cy="90" rx="14" ry="26" fill="var(--dimma)" />
        <text x="72" y="262" fontFamily="var(--font-display)" fontWeight="600" fontSize="26" fill="#fff">7×8</text>
        <text x="186" y="240" fontFamily="var(--font-display)" fontWeight="600" fontSize="26" fill="#fff">ord</text>
        <text x="122" y="330" fontFamily="var(--font-display)" fontWeight="600" fontSize="26" fill="#fff">hello</text>
      </svg>
    </div>
  );
}
