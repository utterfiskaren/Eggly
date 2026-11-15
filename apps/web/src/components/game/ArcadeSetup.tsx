"use client";

import { useState } from "react";
import { RoundPlayer } from "./RoundPlayer";

interface Props {
  game: string;
  levels: { level: number; name: string; blurb: string; stage: string }[];
  ops: { id: string; name: string }[];
  /** opsByLevel[nivå - 1] = matteslagen som finns på nivån. */
  opsByLevel: string[][];
  lives: number[];
  tempos: { name: string; bolts: number }[];
  /** tierOf[nivå - 1][tempo] = äggets nivå. */
  tierOf: number[][];
  eggs: Record<number, { name: string; svg: string }>;
  /** Kiosken och Talkross har egna uppgifter, så matteslaget spelar ingen roll där. */
  usesOp: boolean;
}

/** Alla spel: välj matteslag, svårighet och tempo, och spela. Valen göms medan en runda pågår. */
export function ArcadeSetup({ game, levels, ops, opsByLevel, lives, tempos, tierOf, eggs, usesOp }: Props) {
  const [op, setOp] = useState("mix");
  const [level, setLevel] = useState(1);
  const [tempo, setTempo] = useState(game === "spurt" ? 1 : 0);
  const [active, setActive] = useState(false);
  const here = levels[level - 1];
  const egg = eggs[tierOf[level - 1][tempo]];
  const available = opsByLevel[level - 1];

  function pickLevel(l: number) {
    setLevel(l);
    if (!opsByLevel[l - 1].includes(op)) setOp("mix");
  }
  const chip = (on: boolean) => `squish squish--liten ${on ? "" : "squish--mjuk"}`;

  return (
    <>
      {!active && (
        <section className="kort flex flex-col gap-5 p-4" aria-label="Dina val">
          {usesOp && (
            <div>
              <h2 className="etikett">Matteslag</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Matteslag">
                {ops.map((o) => {
                  const ok = available.includes(o.id);
                  return (
                    <button key={o.id} type="button" className={chip(op === o.id)} aria-pressed={op === o.id} disabled={!ok}
                      onClick={() => setOp(o.id)} title={ok ? undefined : "Finns inte på den här nivån än"}>{o.name}</button>
                  );
                })}
              </div>
              {ops.some((o) => !available.includes(o.id)) && <p className="hjalptext mt-2">Matteslag som är gråa kommer på högre nivåer.</p>}
            </div>
          )}
          <div>
            <h2 className="etikett">Svårighet</h2>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Nivå">
              {levels.map((l) => (
                <button key={l.level} type="button" className={chip(level === l.level)} aria-pressed={level === l.level}
                  aria-label={`Nivå ${l.level}: ${l.name}`} onClick={() => pickLevel(l.level)}>{l.level}</button>
              ))}
            </div>
            <p className="mt-2"><strong>Nivå {here.level}: {here.name}</strong> <span className="hjalptext">(ungefär {here.stage})</span></p>
            <p className="hjalptext">{here.blurb}{lives[level - 1] > 0 && <> Hjärtan: <span aria-label={`${lives[level - 1]}`}>{"♥".repeat(lives[level - 1])}</span></>}</p>
            <p className="hjalptext mt-1">Fler nivåer kommer när fler sorters uppgifter är klara.</p>
          </div>
          <div>
            <h2 className="etikett">Tid</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tempo">
              {tempos.map((t, i) => (
                <button key={t.name} type="button" className={chip(tempo === i)} aria-pressed={tempo === i} onClick={() => setTempo(i)} disabled={game === "spurt" && i === 0}>{t.name}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[var(--r-md)] bg-[var(--mjolkis)] p-3">
            <span className="inline-block h-14 w-11 shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: egg.svg }} />
            <p>Klarar du rundan får du ett <strong>{egg.name}ägg</strong>. Svårare nivå och snabbare tempo ger bättre ägg.</p>
          </div>
        </section>
      )}
      <RoundPlayer key={`${game}-${op}-${level}-${tempo}`} arcade={{ game, op, level, tempo }} onActive={setActive} />
    </>
  );
}
