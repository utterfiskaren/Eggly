"use client";
import { useActionState } from "react";
import { createClass, createLinkCode, inviteChild, linkGuardian, requestJoin, type CodeState } from "@/app/actions/klass";
import { SubmitButton } from "./SubmitButton";
import { FormError } from "./FormError";

function Ok({ text }: { text?: string }) {
  return text ? <p role="status" className="font-semibold text-[var(--mynta)]">{text}</p> : null;
}

export function JoinClassForm() {
  const [s, a] = useActionState<CodeState, FormData>(requestJoin, {});
  return (
    <form action={a} className="flex flex-col gap-3">
      <label className="etikett" htmlFor="code">Klasskod från din lärare</label>
      <input id="code" name="code" className="falt uppercase tracking-widest" maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
      <FormError message={s.error} /><Ok text={s.ok} />
      <SubmitButton className="squish squish--liten">Gå med i klassen</SubmitButton>
    </form>
  );
}

export function ShowCodeForAdult() {
  const [s, a] = useActionState<CodeState, FormData>(createLinkCode, {});
  return (
    <form action={a} className="flex flex-col gap-3">
      <p>Vill en förälder eller lärare följa hur det går? Visa koden för en vuxen. Den gäller i två dygn.</p>
      <div className="flex flex-wrap gap-2">
        <button name="purpose" value="guardian" className="squish squish--liten squish--mjuk">Kod till förälder</button>
        <button name="purpose" value="teacher" className="squish squish--liten squish--mjuk">Kod till lärare</button>
      </div>
      {s.code && <p className="display text-center tracking-[0.2em]" style={{ fontSize: "var(--t-3xl)" }} aria-live="polite">{s.code}</p>}
      <FormError message={s.error} />
    </form>
  );
}

export function CreateClassForm() {
  const [s, a] = useActionState<CodeState, FormData>(createClass, {});
  return (
    <form action={a} className="flex flex-col gap-3">
      <label className="etikett" htmlFor="cname">Ny klass</label>
      <div className="flex gap-2">
        <input id="cname" name="name" className="falt" placeholder="Till exempel 4B…" autoComplete="off" maxLength={60} />
        <SubmitButton className="squish">Skapa</SubmitButton>
      </div>
      <FormError message={s.error} />
      {s.ok && <p role="status">{s.ok}. Klasskoden är <strong className="tracking-widest">{s.code}</strong>.</p>}
    </form>
  );
}

export function InviteChildForm({ classId }: { classId: string }) {
  const [s, a] = useActionState<CodeState, FormData>(inviteChild, {});
  return (
    <form action={a} className="flex flex-col gap-2">
      <input type="hidden" name="class" value={classId} />
      <label className="etikett" htmlFor={`inv-${classId}`}>Lägg till elev med elevens kod</label>
      <div className="flex gap-2">
        <input id={`inv-${classId}`} name="code" className="falt uppercase tracking-widest" maxLength={8} autoComplete="off" spellCheck={false} />
        <SubmitButton className="squish squish--mjuk">Bjud in</SubmitButton>
      </div>
      <FormError message={s.error} /><Ok text={s.ok} />
    </form>
  );
}

export function LinkChildForm() {
  const [s, a] = useActionState<CodeState, FormData>(linkGuardian, {});
  return (
    <form action={a} className="flex flex-col gap-2">
      <label className="etikett" htmlFor="lcode">Koppla ett barn med barnets kod</label>
      <p className="hjalptext">Barnet hittar koden i spelet under «Visa kod för vuxen».</p>
      <div className="flex gap-2">
        <input id="lcode" name="code" className="falt uppercase tracking-widest" maxLength={8} autoComplete="off" spellCheck={false} />
        <SubmitButton className="squish">Koppla</SubmitButton>
      </div>
      <FormError message={s.error} /><Ok text={s.ok} />
    </form>
  );
}
