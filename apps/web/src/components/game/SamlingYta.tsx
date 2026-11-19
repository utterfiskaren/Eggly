"use client";

import { useState } from "react";

export interface SamlingItem { id: string; name: string; txt: string; svg: string; count: number; legacy: boolean }
export interface SamlingSektion { tier: number; name: string; color: string; dark: string; total: number; items: SamlingItem[] }

/**
 * Samlingen som en levande yta. Varje klämmis gungar för sig, och trycker man på en reagerar den:
 * den studsar, hjärtan flyger upp och den berättar något om sig själv. Platser som saknas visas
 * som ägg med frågetecken, så man ser hur mycket det finns kvar att hitta.
 * Bilderna ritas på servern och kommer hit som färdig SVG-text som bara vår egen kod har byggt.
 */
export function SamlingYta({ sektioner }: { sektioner: SamlingSektion[] }) {
  const [vald, setVald] = useState<{ id: string; n: number } | null>(null);
  const aktiv = sektioner.flatMap((s) => s.items).find((i) => i.id === vald?.id) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Den du tryckte på pratar här, så att texten alltid syns även när rutorna är små. */}
      <div className="kl-samling-prat kort sticky top-2 z-10 flex min-h-[72px] items-center gap-3 p-3" aria-live="polite">
        {aktiv ? (
          <>
            <span className="inline-block h-14 w-14 shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: aktiv.svg }} />
            <div className="min-w-0">
              <p className="display" style={{ fontSize: "var(--t-lg)" }}>{aktiv.name}{aktiv.count > 1 ? ` · ${aktiv.count} st` : ""}</p>
              <p className="hjalptext">{aktiv.txt}{aktiv.legacy ? " (Från Eggly 1)" : ""}</p>
            </div>
          </>
        ) : <p className="hjalptext">Tryck på en klämmis så berättar den något om sig själv!</p>}
      </div>

      {sektioner.map((s) => {
        const saknas = Math.max(0, s.total - s.items.length);
        return (
          <section key={s.tier} aria-label={`${s.name}: ${s.items.length} av ${s.total} sorter`} className="kl-varld p-3" style={{ borderColor: s.dark, background: `linear-gradient(180deg, ${s.color}22, ${s.color}0d)` }}>
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <h2 className="display" style={{ fontSize: "var(--t-xl)" }}>{s.name}</h2>
              <span className="kl-chip" style={{ background: `${s.color}33` }}>{s.items.length}/{s.total}</span>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {s.items.map((it, i) => {
                const pa = vald?.id === it.id;
                return (
                  <li key={it.id}>
                    <button type="button" onClick={() => setVald({ id: it.id, n: (vald?.id === it.id ? vald.n : 0) + 1 })}
                      className={`kl-ruta relative flex w-full flex-col items-center gap-1 p-2 ${pa ? "kl-ruta--pa" : ""}`}
                      aria-label={`${it.name}. Tryck för att höra mer.`} aria-pressed={pa}>
                      <span key={pa ? vald!.n : 0} className={`kl-gung inline-block h-[84px] w-[84px] [&>svg]:h-full [&>svg]:w-full ${pa ? "kl-glad" : ""}`}
                        style={{ animationDelay: `${-((i * 0.7) % 3.4)}s` }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: it.svg }} />
                      <span className="text-center text-sm font-semibold leading-tight">{it.name}</span>
                      {it.count > 1 && <span className="kl-antal" aria-hidden="true">×{it.count}</span>}
                      {pa && <span key={`h${vald!.n}`} className="kl-hjartan" aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i></span>}
                    </button>
                  </li>
                );
              })}
              {Array.from({ length: Math.min(saknas, 12) }, (_, i) => (
                <li key={`x${i}`} aria-hidden="true">
                  <div className="kl-tom flex h-full min-h-[132px] w-full flex-col items-center justify-center gap-1" style={{ borderColor: s.color }}>
                    <span className="kl-tom-agg" style={{ background: `${s.color}55` }}>?</span>
                  </div>
                </li>
              ))}
            </ul>
            {saknas > 12 && <p className="hjalptext mt-2 px-1">… och {saknas - 12} till att hitta.</p>}
            {saknas > 0 && saknas <= 12 && <p className="sr-only">{saknas} sorter saknas.</p>}
          </section>
        );
      })}
    </div>
  );
}
