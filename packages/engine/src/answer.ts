/**
 * Rättning. Förlåtande mot hur barn skriver: mellanslag, inledande nollor, "7,0" och "7.0".
 * Heltal, decimaltal (komma eller punkt, högst tre decimaler) och negativa tal (- eller −).
 */
export function parseAnswer(raw: string): number | null {
  const t = raw.trim().replace(/\s+/g, "").replace(",", ".").replace(/^\+/, "").replace(/^−/, "-");
  if (!/^-?\d+(\.\d{1,3})?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function isCorrect(raw: string | number, answer: number): boolean {
  const n = typeof raw === "number" ? raw : parseAnswer(raw);
  return n !== null && Math.abs(n - answer) < 1e-9;
}
