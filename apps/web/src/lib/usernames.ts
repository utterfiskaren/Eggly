/** Användarnamn för barn: gemener, 3–24 tecken, a–ö, siffror och understreck. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}
export function isValidUsername(u: string): boolean {
  return /^[a-z0-9åäö_]{3,24}$/.test(u);
}
/** Barnkonton har ingen riktig e-post. Adressen används bara internt och går aldrig att skicka till. */
export function childEmail(username: string): string {
  const safe = Array.from(username).map((c) => (/[a-z0-9_]/.test(c) ? c : `x${c.codePointAt(0)!.toString(16)}`)).join("");
  return `${safe}@barn.eggly.invalid`;
}
/** Namnförslag utan siffror (Williams önskemål från Eggly 1). */
const A = ["Mjuka", "Glada", "Pösiga", "Studsiga", "Gosiga", "Lugna", "Snabba", "Kluriga", "Busiga", "Glittriga"];
const B = ["Moln", "Mochi", "Kanin", "Panda", "Mango", "Muffin", "Dino", "Pingvin", "Ballong", "Regnbåge"];
export function suggestAlias(seed = Math.random()): string {
  const i = Math.floor(seed * A.length * B.length);
  return `${A[i % A.length]}${B[Math.floor(i / A.length) % B.length]}`;
}
