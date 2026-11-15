/** Ordmärket: ett ägg med en liten spricka, och namnet i Fredoka. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Eggly">
      <svg width={size * 0.8} height={size} viewBox="0 0 32 40" aria-hidden="true">
        <path d="M16 2C8 2 2 15 2 24c0 8 6 14 14 14s14-6 14-14C30 15 24 2 16 2Z" fill="#fff" stroke="#2a1b3d" strokeWidth="2.5" />
        <path d="M7 21l4 3 4-4 4 4 4-3 3 2" fill="none" stroke="#e8336f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="11" cy="12" rx="2.5" ry="4" fill="#e7e1f5" />
      </svg>
      <span translate="no" className="display" style={{ fontSize: size * 0.7, fontWeight: 600, letterSpacing: "-0.02em" }}>eggly</span>
    </span>
  );
}
