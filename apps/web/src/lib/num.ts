/** Tal som barn läser dem: komma som decimaltecken och riktigt minustecken. Samma som `fmt` i motorn. */
export function fmt(n: number): string {
  return String(Math.round(n * 1e6) / 1e6).replace("-", "−").replace(".", ",");
}

/** Läser det barnet skrivit: komma eller punkt, minus eller bindestreck. NaN om det inte är ett tal. */
export function readNum(s: string): number {
  const t = s.trim().replace(",", ".").replace("−", "-");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}
