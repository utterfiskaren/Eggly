/**
 * Bildlösenord för de yngsta: tre bilder i rätt ordning av nio. Varje bild har ett ord som blir
 * en del av lösenordet. Ingen bild får likna en annan, och orden är lätta att säga högt för en vuxen.
 */
export const PICTURES = [
  { id: "sol", label: "Sol", emoji: "☀️" },
  { id: "moln", label: "Moln", emoji: "☁️" },
  { id: "katt", label: "Katt", emoji: "🐱" },
  { id: "jordgubbe", label: "Jordgubbe", emoji: "🍓" },
  { id: "raket", label: "Raket", emoji: "🚀" },
  { id: "blomma", label: "Blomma", emoji: "🌸" },
  { id: "fisk", label: "Fisk", emoji: "🐟" },
  { id: "boll", label: "Boll", emoji: "⚽" },
  { id: "stjarna", label: "Stjärna", emoji: "⭐" },
] as const;

export type PictureId = (typeof PICTURES)[number]["id"];

export function picturePassword(ids: string[]): string {
  if (ids.length !== 3) throw new Error("Välj tre bilder");
  const valid = new Set<string>(PICTURES.map((p) => p.id));
  if (!ids.every((id) => valid.has(id))) throw new Error("Okänd bild");
  return `bild-${ids.join("-")}`;
}
