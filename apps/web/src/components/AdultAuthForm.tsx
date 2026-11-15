"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signInAdult, signUpAdult, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";
import { FormError } from "./FormError";

export function AdultAuthForm({ kind }: { kind: "login" | "signup" }) {
  const [state, action] = useActionState<FormState, FormData>(kind === "login" ? signInAdult : signUpAdult, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {kind === "signup" && (
        <>
          <fieldset>
            <legend className="etikett">Jag är</legend>
            <div className="flex gap-4">
              <label className="flex min-h-[44px] items-center gap-2"><input type="radio" name="role" value="teacher" required /> Lärare</label>
              <label className="flex min-h-[44px] items-center gap-2"><input type="radio" name="role" value="guardian" /> Förälder</label>
            </div>
          </fieldset>
          <div>
            <label className="etikett" htmlFor="alias">Visningsnamn</label>
            <input id="alias" name="alias" className="falt" maxLength={24} required autoComplete="name" />
            <p className="hjalptext mt-1">Visas för eleverna, till exempel «Anna (lärare)».</p>
          </div>
        </>
      )}
      <div>
        <label className="etikett" htmlFor="email">E-post</label>
        <input id="email" name="email" type="email" className="falt" required autoComplete="email" spellCheck={false} />
      </div>
      <div>
        <label className="etikett" htmlFor="password">Lösenord</label>
        <input id="password" name="password" type="password" className="falt" required minLength={kind === "signup" ? 10 : 1}
          autoComplete={kind === "login" ? "current-password" : "new-password"} />
        {kind === "signup" && <p className="hjalptext mt-1">Minst 10 tecken.</p>}
      </div>
      <FormError message={state.error} />
      <SubmitButton>{kind === "login" ? "Logga in" : "Skapa konto"}</SubmitButton>
      <p className="text-center">
        {kind === "login"
          ? <Link href="/portal/logga-in?ny=1" className="lank">Nytt här? Skapa ett konto</Link>
          : <Link href="/portal/logga-in" className="lank">Har du ett konto? Logga in</Link>}
      </p>
    </form>
  );
}
