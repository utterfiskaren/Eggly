"use client";
import { useState } from "react";
import { PICTURES } from "@/lib/pictures";

/** Välj tre bilder i ordning. Tryck på en vald bild för att ta bort den. */
export function PicturePicker({ name = "pictures" }: { name?: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  return (
    <fieldset>
      <legend className="etikett">Ditt bildlösenord: tryck på tre bilder i rätt ordning</legend>
      <input type="hidden" name={name} value={picked.join(",")} />
      <div className="mb-3 flex gap-2" aria-live="polite">
        {[0, 1, 2].map((i) => {
          const p = PICTURES.find((x) => x.id === picked[i]);
          return (
            <span key={i} className="flex h-14 w-14 items-center justify-center text-3xl"
              style={{ borderRadius: "var(--agg)", background: p ? "var(--vit)" : "var(--dimma)", border: "2px dashed var(--dimma)" }}>
              {p ? <span aria-label={p.label}>{p.emoji}</span> : <span className="text-base text-[var(--plommon-2)]">{i + 1}</span>}
            </span>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {PICTURES.map((p) => {
          const order = picked.indexOf(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={order >= 0}
              className="kort kort--klick relative flex h-20 flex-col items-center justify-center"
              style={order >= 0 ? { borderColor: "var(--jordgubb)" } : undefined}>
              <span className="text-3xl" aria-hidden="true">{p.emoji}</span>
              <span className="text-sm">{p.label}</span>
              {order >= 0 && (
                <span className="absolute right-2 top-1 rounded-full bg-[var(--jordgubb)] px-2 text-sm font-bold text-white">{order + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
