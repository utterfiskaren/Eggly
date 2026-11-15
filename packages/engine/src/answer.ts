/**
 * Rättning. Förlåtande mot hur barn skriver: mellanslag, inledande nollor, "7,0" och "7.0".
 * Bara heltal i version 1. Decimaler och bråk kommer med de färdigheterna.
 */
export function parseAnswer(raw: string): number | null {
  const t = raw.trim().replace(/\s+/g, "").replace(",", ".").replace(/^\+/, "");
  if (!/^-?\d+(\.0+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function isCorrect(raw: string | number, answer: number): boolean {
  const n = typeof raw === "number" ? raw : parseAnswer(raw);
  return n !== null && n === answer;
}
