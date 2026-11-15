"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Mode } from "@eggly/engine";
import { ledtrad, startMatte, svara, visaLosningen } from "@/app/actions/spel";
import type { AnswerResult, ClientQuestion, SessionSummary } from "@/lib/play";
import { QuestionVisual } from "./Visuals";

const MODES: { id: Mode; name: string; text: string }[] = [
  { id: "mysigt", name: "Mysigt", text: "Lugnt, med mycket bildstöd." },
  { id: "aventyr", name: "Äventyr", text: "Lagom blandat. Det vanliga." },
  { id: "klurigt", name: "Klurigt", text: "Fler kluriga berättelser." },
];

type Feedback = { kind: "ok" | "again" | "info"; text: string } | null;

export function MatteGame({ stop }: { stop: { id: string; name: string } }) {
  const [q, setQ] = useState<ClientQuestion | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [answer, setAnswer] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [queued, setQueued] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (q && !queued) inputRef.current?.focus({ preventScroll: true }); }, [q, queued]);
  useEffect(() => { if (queued) nextRef.current?.focus({ preventScroll: true }); }, [queued]);

  // Enter går vidare till nästa uppgift, var fokus än ligger. Tangenten som skickade svaret räknas inte.
  useEffect(() => {
    if (!queued) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      e.preventDefault();
      nextRef.current?.click();
    };
    const t = window.setTimeout(() => window.addEventListener("keydown", onKey), 150);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [queued]);

  function reset(next: ClientQuestion) {
    setQ(next); setAnswer(""); setHints(next.hints); setHintLevel(next.hintLevel); setTries(0); setFeedback(null); setQueued(null);
  }

  function run<T>(fn: () => Promise<T>, then: (r: T) => void) {
    setError(null);
    start(async () => {
      try { then(await fn()); }
      catch { setError("Något gick fel med anslutningen. Försök igen."); }
    });
  }

  function begin(mode: Mode) {
    setSummary(null);
    run(() => startMatte(mode, stop.id), reset);
  }

  function handleResult(r: AnswerResult | null) {
    if (!r) { setError("Uppgiften hann redan rättas. Vi går vidare."); return; }
    if (r.status === "try_again") {
      setTries((t) => t + 1);
      setFeedback({ kind: "again", text: r.message });
      if (r.hint && r.hintLevel) { setHints((h) => [...h, r.hint!]); setHintLevel(r.hintLevel); }
      setAnswer("");
      return;
    }
    setFeedback({ kind: r.status === "correct" ? "ok" : "info", text: r.stars ? `${r.message} +${r.stars} ⭐` : r.message });
    setQueued(r);
  }

  function submit(value: string) {
    if (!q || pending || queued || value.trim() === "") return;
    run(() => svara(q.sessionId, value), handleResult);
  }

  function next() {
    if (!queued) return;
    if (queued.summary) { setSummary(queued.summary); setQ(null); setQueued(null); return; }
    if (queued.next) reset(queued.next);
  }

  function hint() {
    if (!q || pending || hintLevel >= 3) return;
    run(() => ledtrad(q.sessionId), (r) => { if (r) { setHints(r.hints); setHintLevel(r.hintLevel); } });
  }

  function reveal() {
    if (!q || pending) return;
    run(() => visaLosningen(q.sessionId), handleResult);
  }

  // ── Val av läge ──
  if (!q && !summary) {
    return (
      <section aria-labelledby="valj" className="flex flex-col gap-4">
        <h1 id="valj" style={{ fontSize: "var(--t-2xl)" }}>{stop.name}: hur vill du spela?</h1>
        <p className="text-[var(--plommon-2)]">Du får lika många stjärnor i alla lägen.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => begin(m.id)} disabled={pending}
              className="kort kort--klick flex flex-col items-center gap-2 p-5 text-center">
              <span className="display" style={{ fontSize: "var(--t-xl)" }}>{m.name}</span>
              <span className="hjalptext">{m.text}</span>
            </button>
          ))}
        </div>
        {pending && <p aria-live="polite">Kläcker uppgifter …</p>}
        {error && <p role="alert" className="felruta">{error}</p>}
      </section>
    );
  }

  // ── Sammanfattning ──
  if (summary) {
    return (
      <section aria-labelledby="klart" className="kort flex flex-col items-center gap-4 p-6 text-center">
        <h1 id="klart" style={{ fontSize: "var(--t-2xl)" }}>Det här klarade du idag</h1>
        <p className="display" style={{ fontSize: "var(--t-3xl)" }}>+{summary.stars} ⭐</p>
        <p>{summary.correct} av {summary.total} uppgifter rätt.</p>
        <ul className="flex flex-col gap-1">
          {summary.skills.map((s) => <li key={s.title}>{s.title}: {s.correct} av {s.total}</li>)}
        </ul>
        {summary.stop && (
          <div className="flex flex-col items-center gap-1">
            <p aria-label={`${summary.stop.stars} av 3 stjärnor på ${summary.stop.name}`} className="text-2xl tracking-widest">
              <span aria-hidden="true">{"★".repeat(summary.stop.stars)}<span className="opacity-25">{"★".repeat(3 - summary.stop.stars)}</span></span>
            </p>
            {summary.stop.opened && <p className="font-semibold text-[var(--mynta)]">Nytt stopp öppnat: {summary.stop.opened}!</p>}
            {summary.stop.eggs > 0 && <p className="font-semibold">Du har {summary.stop.eggs === 1 ? "ett ägg" : `${summary.stop.eggs} ägg`} att kläcka!</p>}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {summary.stop && summary.stop.eggs > 0
            ? <Link href="/spela/samling" className="squish">Kläck ägget</Link>
            : <button className="squish" onClick={() => setSummary(null)}>Spela igen</button>}
          <Link href="/spela/matte" className="squish squish--mjuk">Tillbaka till kartan</Link>
        </div>
      </section>
    );
  }

  // ── Uppgiften ──
  const question = q!;
  return (
    <section aria-labelledby="fraga" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <ol className="flex gap-1.5" aria-label={`Uppgift ${question.index + 1} av ${question.total}`}>
          {Array.from({ length: question.total }, (_, i) => (
            <li key={i} className="h-4 w-3.5" style={{ borderRadius: "var(--agg)",
              background: i < question.index || (i === question.index && queued) ? "var(--mynta)" : i === question.index ? "var(--citron)" : "var(--dimma)" }} />
          ))}
        </ol>
        <Link href="/spela/matte" className="lank text-sm">Avsluta</Link>
      </div>

      <div className="kort flex flex-col gap-4 p-5">
        <p className="hjalptext">{question.skillTitle}</p>
        {question.visual && <QuestionVisual visual={question.visual} />}
        <h1 id="fraga" className="text-center" style={{ fontSize: question.prompt.length > 30 ? "var(--t-xl)" : "var(--t-3xl)" }}>
          {question.prompt}
        </h1>

        {question.input === "choice" ? (
          <div className="grid grid-cols-2 gap-3">
            {question.choices!.map((c) => (
              <button key={c} className="squish squish--mjuk" style={{ fontSize: "var(--t-2xl)" }}
                disabled={pending || !!queued} onClick={() => { setAnswer(String(c)); submit(String(c)); }}>{c}</button>
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit(answer); }} className="flex flex-col gap-3">
            <label htmlFor="svar" className="sr-only">Ditt svar</label>
            <input id="svar" ref={inputRef} value={answer} inputMode="numeric" autoComplete="off" spellCheck={false}
              onChange={(e) => setAnswer(e.target.value.replace(/[^\d,.\-]/g, "").slice(0, 6))}
              disabled={!!queued} className="falt text-center display" style={{ fontSize: "var(--t-2xl)" }} />
            <div className="grid grid-cols-3 gap-2" aria-label="Sifferknappar">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button type="button" key={d} className="squish squish--mjuk" disabled={!!queued}
                  onClick={() => setAnswer((a) => (a + d).slice(0, 6))}>{d}</button>
              ))}
              <button type="button" className="squish squish--mjuk" aria-label="Sudda" disabled={!!queued}
                onClick={() => setAnswer((a) => a.slice(0, -1))}>⌫</button>
              <button type="button" className="squish squish--mjuk" disabled={!!queued}
                onClick={() => setAnswer((a) => (a + "0").slice(0, 6))}>0</button>
              <button type="submit" className="squish" disabled={pending || !!queued || answer === ""}>Svara</button>
            </div>
          </form>
        )}

        <div aria-live="polite" className="min-h-[1.5em] text-center font-semibold"
          style={{ color: feedback?.kind === "ok" ? "var(--mynta)" : "var(--plommon)" }}>
          {feedback?.text}
        </div>

        {hints.length > 0 && (
          <ol className="flex flex-col gap-2 rounded-[var(--r-md)] bg-[var(--mjolkis)] p-4" aria-label="Ledtrådar">
            {hints.map((h, i) => <li key={i}>💡 {h}</li>)}
          </ol>
        )}

        {queued ? (
          <button ref={nextRef} className="squish" onClick={next}>{queued.summary ? "Se vad du klarade" : "Nästa"}</button>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            <button className="squish squish--mjuk squish--liten" onClick={hint} disabled={pending || hintLevel >= 2}>
              💡 Ledtråd {hintLevel > 0 ? `(${hintLevel}/2)` : ""}
            </button>
            {(hintLevel >= 2 || tries >= 2) && (
              <button className="squish squish--mjuk squish--liten" onClick={reveal} disabled={pending}>Visa lösningen</button>
            )}
          </div>
        )}
        {error && <p role="alert" className="felruta">{error}</p>}
      </div>
    </section>
  );
}
