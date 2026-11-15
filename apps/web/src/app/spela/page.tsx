import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/actions/auth";
import { decideJoin } from "@/app/actions/klass";
import { JoinClassForm, ShowCodeForAdult } from "@/components/CodeForms";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Spela" };

const ISLANDS = [
  { id: "matte", name: "Matteön", color: "var(--mynta)", note: "Spela nu", href: "/spela/matte" },
  { id: "svenska", name: "Ordön", color: "var(--himmel)", note: "Kommer snart", href: null },
  { id: "engelska", name: "Språkön", color: "var(--apelsin)", note: "Kommer snart", href: null },
];

export default async function Page() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  const [{ data: profile }, { data: classes }, { data: invites }, { data: asked }] = await Promise.all([
    supabase.from("profiles").select("alias").eq("id", me).single(),
    supabase.from("classes").select("id, name"),
    supabase.from("join_requests").select("id, classes(name)").eq("child_id", me)
      .eq("direction", "teacher_invites").eq("status", "pending"),
    supabase.from("join_requests").select("id").eq("child_id", me)
      .eq("direction", "child_asks").eq("status", "pending"),
  ]);

  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pb-12 pt-6">
      <header className="flex items-center justify-between">
        <Logo size={34} />
        <form action={signOut}><button className="squish squish--liten squish--mjuk">Logga ut</button></form>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 style={{ fontSize: "var(--t-2xl)" }}>Hej {profile?.alias ?? "där"}!</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/spela/spel" className="squish squish--liten">Alla spel</Link>
          <Link href="/spela/samling" className="squish squish--liten squish--mjuk">Min samling</Link>
        </div>
      </div>

      <section aria-labelledby="oar" className="flex flex-col gap-3">
        <h2 id="oar" style={{ fontSize: "var(--t-xl)" }}>Välj en ö</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {ISLANDS.map((i) => {
            const inner = (
              <>
                <span className="h-20 w-20" style={{ background: i.color, borderRadius: "var(--agg)", opacity: i.href ? 1 : 0.45 }} aria-hidden="true" />
                <span className="display" style={{ fontSize: "var(--t-lg)" }}>{i.name}</span>
                <span className="hjalptext">{i.note}</span>
              </>
            );
            return (
              <li key={i.id}>
                {i.href
                  ? <Link href={i.href} className="kort kort--klick flex h-full flex-col items-center gap-2 p-5 text-center">{inner}</Link>
                  : <div className="kort flex h-full flex-col items-center gap-2 p-5 text-center" aria-disabled="true">{inner}</div>}
              </li>
            );
          })}
        </ul>
      </section>

      {invites && invites.length > 0 && (
        <section className="kort flex flex-col gap-3 p-5" aria-labelledby="inbj">
          <h2 id="inbj" style={{ fontSize: "var(--t-xl)" }}>Inbjudningar</h2>
          {invites.map((r) => (
            <form key={r.id} action={decideJoin} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="request" value={r.id} />
              <span className="flex-1">Vill du gå med i <strong>{(r.classes as unknown as { name: string } | null)?.name ?? "klassen"}</strong>?</span>
              <button name="approve" value="1" className="squish squish--liten">Ja</button>
              <button name="approve" value="0" className="squish squish--liten squish--mjuk">Nej</button>
            </form>
          ))}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="kort p-5" aria-label="Klass">
          {classes && classes.length > 0
            ? <p className="mb-3">Du är med i: <strong>{classes.map((c) => c.name).join(", ")}</strong></p>
            : null}
          {asked && asked.length > 0 && (
            <p className="mb-3 font-semibold text-[var(--mynta)]" role="status">
              Du har bett om att få gå med i en klass. Nu väntar vi på att läraren säger ja.
            </p>
          )}
          <JoinClassForm />
        </section>
        <section className="kort p-5" aria-label="Kod för vuxen"><ShowCodeForAdult /></section>
      </div>
    </main>
  );
}
