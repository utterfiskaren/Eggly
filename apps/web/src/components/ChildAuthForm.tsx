"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { signInChild, signUpChild, type FormState } from "@/app/actions/auth";
import { PicturePicker } from "./PicturePicker";
import { SubmitButton } from "./SubmitButton";
import { FormError } from "./FormError";

const AGES = [
  { v: "6-8", l: "6–8 år" }, { v: "9-10", l: "9–10 år" }, { v: "11-12", l: "11–12 år" },
  { v: "13-15", l: "13–15 år" }, { v: "16+", l: "16 år eller äldre" },
];

export function ChildAuthForm({ kind, suggestedAlias }: { kind: "login" | "signup"; suggestedAlias?: string }) {
  const [state, action] = useActionState<FormState, FormData>(kind === "login" ? signInChild : signUpChild, {});
  const [mode, setMode] = useState<"bild" | "text">("bild");
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value={mode} />
      {kind === "signup" && (
        <div>
          <label className="etikett" htmlFor="alias">Ditt smeknamn i spelet</label>
          <input id="alias" name="alias" className="falt" defaultValue={suggestedAlias} maxLength={24} required autoComplete="off" />
          <p className="hjalptext mt-1">Skriv inte ditt riktiga namn. Andra i klassen kan se smeknamnet.</p>
        </div>
      )}
      <div>
        <label className="etikett" htmlFor="username">Användarnamn</label>
        <input id="username" name="username" className="falt" required minLength={3} maxLength={24}
          autoComplete="username" autoCapitalize="none" spellCheck={false} />
        {kind === "signup" && <p className="hjalptext mt-1">Det här skriver du när du loggar in. Bara du ser det.</p>}
      </div>

      <div role="radiogroup" aria-label="Typ av lösenord" className="flex gap-2">
        {(["bild", "text"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`squish squish--liten ${mode === m ? "" : "squish--mjuk"}`}>
            {m === "bild" ? "Bildlösenord" : "Vanligt lösenord"}
          </button>
        ))}
      </div>

      {mode === "bild" ? <PicturePicker /> : (
        <div>
          <label className="etikett" htmlFor="password">Lösenord</label>
          <input id="password" name="password" type="password" className="falt" minLength={6} required
            autoComplete={kind === "login" ? "current-password" : "new-password"} />
        </div>
      )}

      {kind === "signup" && (
        <div>
          <label className="etikett" htmlFor="age_band">Hur gammal är du?</label>
          <select id="age_band" name="age_band" className="falt" required defaultValue="">
            <option value="" disabled>Välj</option>
            {AGES.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
          </select>
          <p className="hjalptext mt-1">Vi frågar bara ungefär. Det hjälper spelet att börja på rätt nivå.</p>
        </div>
      )}

      <FormError message={state.error} />
      <SubmitButton>{kind === "login" ? "Spela!" : "Skapa mitt konto"}</SubmitButton>
      <p className="text-center">
        {kind === "login"
          ? <Link href="/spela/nytt-konto" className="lank">Inget konto? Skapa ett här</Link>
          : <Link href="/spela/logga-in" className="lank">Har du redan ett konto? Logga in</Link>}
      </p>
    </form>
  );
}
