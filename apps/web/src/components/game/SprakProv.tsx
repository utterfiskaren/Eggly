"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { languageTemplates, planTextRound, seededRng, textTemplatesForSkill } from "@eggly/engine";
import { avslutaSprak, startaSprak } from "@/app/actions/sprak";
import type { LangResult, LangRoundQuestion } from "@/lib/language-rounds";
import { Confetti } from "./Confetti";
import { setSound, sfx, soundOn } from "@/lib/sfx";

type IslandId = "svenska" | "engelska";
interface Island { id: IslandId; name: string; lang: string; color: string; skills: { id: string; title: string }[] }

const LEVELS = [{ name: "Lätt", d: 0.15 }, { name: "Mellan", d: 0.5 }, { name: "Svårt", d: 0.85 }] as const;
const ROUND = 10;

/** Nytt frö för varje provomgång. Ligger utanför komponenten eftersom slump hör hemma i en händelse, inte i ritningen. */
function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0;
}

interface Result { q: LangRoundQuestion; picked: string; hints: number }
type Saved = { state: "none" } | { state: "saving" } | { state: "saved"; result: LangResult } | { state: "failed" };

/**
 * Ordön och Språkön: tio uppgifter med ledtrådar i tre steg. Servern planerar och sparar omgången när det går (då räknas
 * svaren för barnets framsteg och det blir stjärnor). Går det inte, till exempel för att färdigheterna inte ligger i
 * databasen än, spelas samma uppgifter i provläge i webbläsaren och ingenting sparas.
 */
export function SprakProv({ islands, start }: { islands: Island[]; start: IslandId | null }) {
  const [island, setIsland] = useState<IslandId | null>(start);
  const [skill, setSkill] = useState<string>("mix");
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState<LangRoundQuestion[] | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [saved, setSaved] = useState<Saved>({ state: "none" });
  const [ljud, setLjud] = useState(soundOn);
  const [pending, startT] = useTransition();
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (picked !== null) nextRef.current?.focus(); }, [picked]);

  const cur = islands.find((x) => x.id === island) ?? null;
  const q = round && i < round.length ? round[i] : null;
  const done = !!round && i >= round.length;
  const trial = !!round && roundId === null;

  function begin() {
    if (!cur || pending) return;
    startT(async () => {
      let server: Awaited<ReturnType<typeof startaSprak>> = null;
      try { server = await startaSprak(cur.id, skill, level); } catch { server = null; }
      if (server) {
        setRound(server.questions); setRoundId(server.roundId);
      } else {
        const lang = cur.id === "svenska" ? "sv" : "en";
        const pool = skill === "mix" ? languageTemplates.filter((t) => t.lang === lang) : textTemplatesForSkill(skill);
        const planned = planTextRound(seededRng(newSeed()), pool, ROUND, LEVELS[level].d);
        setRound(planned.map((p) => ({
          key: p.key, skillId: p.skillId, skillTitle: "", lang: p.lang, prompt: p.prompt, ...(p.sub ? { sub: p.sub } : {}),
          choices: p.choices, answer: p.answer, hints: textTemplatesForSkill(p.skillId)[0].hints(p),
        })));
        setRoundId(null);
      }
      setI(0); setPicked(null); setHints(0); setResults([]); setSaved({ state: "none" });
    });
  }

  function choose(c: string) {
    if (!q || picked !== null) return;
    setPicked(c);
    (c === q.answer ? sfx.right : sfx.wrong)();
  }

  function next() {
    if (!q || picked === null || !round) return;
    const all = [...results, { q, picked, hints }];
    setResults(all);
    setPicked(null); setHints(0);
    setI(i + 1);
    if (i + 1 >= round.length) {
      const rights = all.filter((r) => r.picked === r.q.answer).length;
      (rights >= 8 ? sfx.win : sfx.tap)();
      if (roundId) {
        setSaved({ state: "saving" });
        const answers = all.map((r, idx) => ({ i: idx, correct: r.picked === r.q.answer, hint: r.hints }));
        startT(async () => {
          let res: LangResult | null = null;
          try { res = await avslutaSprak(roundId, answers); } catch { res = null; }
          setSaved(res ? { state: "saved", result: res } : { state: "failed" });
        });
      }
    }
  }

  const right = results.filter((r) => r.picked === r.q.answer).length;
  const direct = results.filter((r) => r.picked === r.q.answer && r.hints === 0).length;

  return (
    <>
      {trial && <p className="hjalptext kort p-3" role="note">Prov: den här omgången sparas inte, och du får varken stjärnor eller ägg.</p>}

      {!round && (
        <section className="flex flex-col gap-4" aria-label="Dina val">
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Välj ö">
            {islands.map((x) => (
              <button key={x.id} type="button" aria-pressed={island === x.id} onClick={() => { setIsland(x.id); setSkill("mix"); }}
                className="kort kort--klick flex flex-col items-center gap-2 p-4 text-center" style={island === x.id ? { borderColor: x.color } : undefined}>
                <span className="h-16 w-16" style={{ background: x.color, borderRadius: "var(--agg)" }} aria-hidden="true" />
                <span className="display" style={{ fontSize: "var(--t-xl)" }}>{x.name}</span>
                <span className="hjalptext">{x.lang}</span>
              </button>
            ))}
          </div>

          {cur && (
            <>
              <div className="kort flex flex-col gap-2 p-4">
                <h2 className="etikett">Vad vill du träna?</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Färdighet">
                  <button type="button" className={`squish squish--liten ${skill === "mix" ? "" : "squish--mjuk"}`} aria-pressed={skill === "mix"} onClick={() => setSkill("mix")}>Blandat</button>
                  {cur.skills.map((s) => (
                    <button key={s.id} type="button" className={`squish squish--liten ${skill === s.id ? "" : "squish--mjuk"}`} aria-pressed={skill === s.id} onClick={() => setSkill(s.id)}>{s.title}</button>
                  ))}
                </div>
              </div>
              <div className="kort flex flex-col gap-2 p-4">
                <h2 className="etikett">Hur svårt?</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Svårighet">
                  {LEVELS.map((l, idx) => (
                    <button key={l.name} type="button" className={`squish squish--liten ${level === idx ? "" : "squish--mjuk"}`} aria-pressed={level === idx} onClick={() => setLevel(idx)}>{l.name}</button>
                  ))}
                </div>
              </div>
              <button type="button" className="squish self-start" disabled={pending} onClick={begin}>{pending ? "Laddar…" : "Kör!"}</button>
            </>
          )}
        </section>
      )}

      {q && (
        <section className="kort flex flex-col gap-4 p-4" aria-label={`Uppgift ${i + 1} av ${round!.length}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="hjalptext">Uppgift {i + 1} av {round!.length}{q.skillTitle ? ` · ${q.skillTitle}` : ""}</p>
            <button type="button" className="squish squish--liten squish--mjuk" aria-pressed={ljud} onClick={() => { setSound(!ljud); setLjud(!ljud); }}>Ljud: {ljud ? "på" : "av"}</button>
          </div>
          <h2 className="text-center" style={{ fontSize: q.prompt.length > 34 ? "var(--t-xl)" : "var(--t-2xl)" }}>{q.prompt}</h2>
          {q.sub && <p className="text-center text-[var(--plommon-2)]" lang="sv">{q.sub}</p>}
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Svarsalternativ" lang={q.lang}>
            {q.choices.map((c) => {
              const isRight = picked !== null && c === q.answer;
              const isWrong = picked === c && c !== q.answer;
              return (
                <button key={c} type="button" disabled={picked !== null} onClick={() => choose(c)}
                  className={`squish squish--mjuk ${isWrong ? "skaka" : ""}`}
                  style={{ minHeight: "var(--hit-barn)", fontSize: "var(--t-lg)", ...(isRight ? { background: "var(--mynta)", color: "var(--vit)", borderColor: "var(--mynta)", opacity: 1 } : isWrong ? { background: "#fdecec", borderColor: "var(--fel)", opacity: 1 } : picked !== null ? { opacity: 0.55 } : {}) }}>
                  {c}{isRight ? " ✓" : isWrong ? " ✗" : ""}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2" role="status" aria-live="polite">
            {picked === null && hints > 0 && q.hints.slice(0, hints).map((h, idx) => <p key={idx} className="felruta" style={{ background: "var(--mjolkis)", color: "var(--plommon)" }}>Ledtråd {idx + 1}: {h}</p>)}
            {picked !== null && (
              <p className="font-semibold" style={{ color: picked === q.answer ? "var(--mynta)" : "var(--plommon)" }}>
                {picked === q.answer ? "Precis!" : q.hints[2]}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {picked === null
              ? <button type="button" className="squish squish--liten squish--mjuk" disabled={hints >= 2} onClick={() => setHints(hints + 1)}>{hints === 0 ? "Ledtråd" : "Mer hjälp"}</button>
              : <button ref={nextRef} type="button" className="squish" onClick={next}>{i + 1 >= round!.length ? "Se hur det gick" : "Nästa"}</button>}
          </div>
        </section>
      )}

      {done && (
        <section className="kort flex flex-col gap-4 p-5" aria-label="Resultat">
          {right >= 8 && <Confetti />}
          <h2 style={{ fontSize: "var(--t-2xl)" }}>{right >= 8 ? "Superbra!" : right >= 5 ? "Bra jobbat!" : "Bra att du övar!"}</h2>
          <p>Du hade {right} rätt av {results.length}{direct < right ? `, och ${direct} av dem utan hjälp` : ""}.</p>
          <p role="status" className="hjalptext">
            {saved.state === "saving" && "Sparar din omgång…"}
            {saved.state === "saved" && (saved.result.stars > 0 ? `Sparat! Du fick ${saved.result.stars} ${saved.result.stars === 1 ? "stjärna" : "stjärnor"}.` : "Sparat!")}
            {saved.state === "failed" && "Din omgång sparades inte den här gången. Det var inte ditt fel."}
            {trial && "Provläge: omgången sparas inte."}
          </p>
          {results.some((r) => r.picked !== r.q.answer) && (
            <div className="flex flex-col gap-2">
              <h3 className="etikett">Det här tränar vi igen</h3>
              <ul className="flex flex-col gap-2">
                {results.filter((r) => r.picked !== r.q.answer).map((r) => (
                  <li key={r.q.key} className="kort p-3" lang={r.q.lang}>
                    <span className="block">{r.q.prompt}</span>
                    <span className="block font-semibold" style={{ color: "var(--mynta)" }}>Rätt: {r.q.answer}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="squish" disabled={pending} onClick={begin}>Spela igen</button>
            <button type="button" className="squish squish--mjuk" onClick={() => { setRound(null); setRoundId(null); setResults([]); setSaved({ state: "none" }); }}>Välj något annat</button>
          </div>
        </section>
      )}
    </>
  );
}
