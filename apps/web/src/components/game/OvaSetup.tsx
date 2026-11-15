"use client";

import { useState } from "react";
import { RoundPlayer } from "./RoundPlayer";

type Kind = "tables" | "add" | "sub" | "mix";
type Op = "add" | "sub" | "mul";

/** Öva: barnet väljer själv tabeller, plus, minus eller blandat. Valen göms medan en runda pågår. */
export function OvaSetup({ tempos }: { tempos: { name: string; sec: number }[] }) {
  const [tempo, setTempo] = useState(0);
  const [tables, setTables] = useState<number[]>([]);
  const [ops, setOps] = useState<Op[]>(["add", "sub", "mul"]);
  const [choice, setChoice] = useState<{ spec: unknown; key: string } | null>(null);
  const [active, setActive] = useState(false);
  const chip = (on: boolean) => `squish squish--liten ${on ? "" : "squish--mjuk"}`;
  const toggleTable = (t: number) => setTables((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t].sort((x, y) => x - y)));
  const toggleOp = (o: Op) => setOps((a) => (a.includes(o) ? a.filter((x) => x !== o) : [...a, o]));
  const go = (kind: Kind, extra: Record<string, unknown>) => setChoice({ spec: { kind, ...extra }, key: `${kind}-${JSON.stringify(extra)}-${tempo}-${Date.now()}` });

  return (
    <>
      {!active && (
        <section className="flex flex-col gap-4" aria-label="Dina val">
          <div className="kort flex flex-col gap-2 p-4">
            <h2 className="etikett">Tid</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tempo">
              {tempos.map((t, i) => <button key={t.name} type="button" className={chip(tempo === i)} aria-pressed={tempo === i} onClick={() => setTempo(i)}>{t.name}</button>)}
            </div>
            <p className="hjalptext">{tempo ? `Du har ${tempos[tempo].sec} sekunder per tal. Då finns inga ledtrådar.` : "Ingen klocka. Ledtrådar finns om du behöver."}</p>
          </div>
          <div className="kort flex flex-col gap-3 p-4">
            <h2 className="etikett">Gångertabeller</h2>
            <p className="hjalptext">Tryck på en eller flera tabeller.</p>
            <div className="grid grid-cols-5 gap-2" role="group" aria-label="Tabeller">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                <button key={t} type="button" className={chip(tables.includes(t))} aria-pressed={tables.includes(t)} onClick={() => toggleTable(t)}>{t}</button>
              ))}
            </div>
            <button type="button" className="squish self-start" disabled={!tables.length} onClick={() => go("tables", { tables })}>
              Öva {tables.length === 1 ? `${tables[0]}:ans tabell` : "valda tabeller"}
            </button>
          </div>
          {(["add", "sub"] as const).map((k) => (
            <div key={k} className="kort flex flex-col gap-3 p-4">
              <h2 className="etikett">{k === "add" ? "Plus" : "Minus"}</h2>
              <div className="flex flex-wrap gap-2">
                {[10, 20, 100].map((m) => <button key={m} type="button" className="squish squish--liten" onClick={() => go(k, { max: m })}>Upp till {m}</button>)}
              </div>
            </div>
          ))}
          <div className="kort flex flex-col gap-3 p-4">
            <h2 className="etikett">Blandat</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Räknesätt">
              {([["add", "Plus"], ["sub", "Minus"], ["mul", "Gånger"]] as const).map(([o, name]) => (
                <button key={o} type="button" className={chip(ops.includes(o))} aria-pressed={ops.includes(o)} onClick={() => toggleOp(o)}>{name}</button>
              ))}
            </div>
            <button type="button" className="squish self-start" disabled={!ops.length} onClick={() => go("mix", { ops })}>Kör blandat</button>
          </div>
        </section>
      )}
      {choice && <RoundPlayer key={choice.key} practice={{ spec: choice.spec, tempo }} onActive={setActive} />}
    </>
  );
}
