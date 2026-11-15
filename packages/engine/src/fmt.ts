/** Tal som barn läser dem: komma som decimaltecken och riktigt minustecken. 3.5 → «3,5», -2 → «−2». */
export function fmt(n: number): string {
  return String(Math.round(n * 1e6) / 1e6).replace("-", "−").replace(".", ",");
}
