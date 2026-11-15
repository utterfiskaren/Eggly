"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "./Clock";
import type { BoardProps } from "./types";

const expr = (p: string) => p.replace(/\s*=\s*\?$/, "");

/**
 * Minnet: hitta paren, uppgiften och dess svar. Ett par räknas som «rätt» om du hittade det
 * utan att någon av korten var med i ett felaktigt par. Ingen får hjärtan förlora.
 */
export function Minne({ questions, clock, onDone }: BoardProps) {
  const pairs = questions.length;
  const [cards] = useState(() => {
    const all = questions.flatMap((q, i) => [{ pair: i, text: expr(q.prompt) }, { pair: i, text: String(q.answer) }]);
    return all.map((c) => ({ c, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.c);
  });
  const [up, setUp] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [dirty, setDirty] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const latest = useRef({ found, dirty });
  useEffect(() => { latest.current = { found, dirty }; });

  const finish = useCallback((completed: boolean) => {
    setOver(true);
    const { found: f, dirty: d } = latest.current;
    const answers = [...f].sort((a, b) => a - b).map((p) => ({ correct: !d.includes(p), i: p }));
    onDone(answers, completed);
  }, [onDone]);

  useEffect(() => {
    if (found.length !== pairs || over) return;
    const t = window.setTimeout(() => finish(true), 700);
    return () => window.clearTimeout(t);
  }, [found, pairs, over, finish]);
  const timeout = useCallback(() => finish(false), [finish]);

  function flip(n: number) {
    if (busy || over || up.includes(n) || found.includes(cards[n].pair)) return;
    const next = [...up, n];
    setUp(next);
    if (next.length < 2) return;
    const [a, b] = next;
    if (cards[a].pair === cards[b].pair) {
      setFound((f) => [...f, cards[a].pair]);
      setUp([]);
    } else {
      setDirty((d) => [...d, cards[a].pair, cards[b].pair]);
      setBusy(true);
      window.setTimeout(() => { setUp([]); setBusy(false); }, 900);
    }
  }

  const cols = pairs <= 6 ? 3 : 4;
  return (
    <div className="kort flex flex-col gap-3 p-4">
      <Clock seconds={clock} stopped={over} onTimeout={timeout} />
      <p className="text-center font-semibold" role="status">{found.length} av {pairs} par</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cards.map((c, n) => {
          const isFound = found.includes(c.pair);
          const open = isFound || up.includes(n);
          return (
            <button key={n} type="button" onClick={() => flip(n)} disabled={over}
              aria-label={open ? c.text : `Kort ${n + 1}, vänt`} aria-pressed={open}
              className="display flex min-h-[72px] items-center justify-center rounded-[var(--r-md)] border-2 px-1 text-center shadow-[0_4px_0_var(--dimma)] disabled:cursor-default"
              style={{
                background: isFound ? "var(--mynta)" : open ? "var(--vit)" : "var(--himmel)",
                color: isFound ? "#fff" : open ? "var(--plommon)" : "#fff",
                borderColor: open ? "var(--dimma)" : "var(--himmel)",
                fontSize: c.text.length > 6 ? "var(--t-md)" : "var(--t-xl)",
              }}>
              {open ? c.text : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
