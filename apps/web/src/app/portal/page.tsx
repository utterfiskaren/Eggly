import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/actions/auth";
import { decideJoin } from "@/app/actions/klass";
import { CreateClassForm, InviteChildForm, LinkChildForm } from "@/components/CodeForms";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Portalen" };

export default async function Page() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  const { data: profile } = await supabase.from("profiles").select("alias, role").eq("id", me).single();
  const isTeacher = profile?.role === "teacher" || profile?.role === "staff";

  return (
    <main id="innehall" className="portal min-h-dvh">
      <header className="border-b-2 border-[var(--dimma)] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo size={30} />
          <div className="flex items-center gap-3">
            <span className="hjalptext">{profile?.alias} · {isTeacher ? "lärare" : "förälder"}</span>
            <form action={signOut}><button className="squish squish--mjuk">Logga ut</button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        {isTeacher ? <TeacherHome /> : <GuardianHome />}
      </div>
    </main>
  );
}

async function TeacherHome() {
  const supabase = await supabaseServer();
  const [{ data: classes }, { data: requests }, { data: members }] = await Promise.all([
    supabase.from("classes").select("id, name, join_code, created_at").is("archived_at", null).order("created_at"),
    supabase.from("join_requests").select("id, class_id, profiles:child_id(alias)").eq("status", "pending").eq("direction", "child_asks"),
    supabase.from("class_members").select("class_id, profiles:child_id(alias)"),
  ]);
  return (
    <>
      <h1 style={{ fontSize: "var(--t-2xl)" }}>Mina klasser</h1>
      {(!classes || classes.length === 0) && (
        <p className="kort p-5">Du har inga klasser än. Skapa den första nedan, så får du en klasskod att ge eleverna.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {classes?.map((c) => {
          const reqs = requests?.filter((r) => r.class_id === c.id) ?? [];
          const kids = members?.filter((m) => m.class_id === c.id) ?? [];
          return (
            <section key={c.id} className="kort flex flex-col gap-4 p-5" aria-labelledby={`k-${c.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`k-${c.id}`} style={{ fontSize: "var(--t-xl)" }}>{c.name}</h2>
                <span className="hjalptext">Klasskod <strong className="tracking-widest text-[var(--plommon)]">{c.join_code}</strong></span>
              </div>
              <p>{kids.length} {kids.length === 1 ? "elev" : "elever"}{kids.length > 0 && `: ${kids.map((k) => (k.profiles as unknown as { alias: string })?.alias).join(", ")}`}</p>
              {reqs.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">Vill gå med</h3>
                  {reqs.map((r) => (
                    <form key={r.id} action={decideJoin} className="flex items-center gap-2">
                      <input type="hidden" name="request" value={r.id} />
                      <span className="flex-1">{(r.profiles as unknown as { alias: string })?.alias}</span>
                      <button name="approve" value="1" className="squish">Godkänn</button>
                      <button name="approve" value="0" className="squish squish--mjuk">Neka</button>
                    </form>
                  ))}
                </div>
              )}
              <InviteChildForm classId={c.id} />
            </section>
          );
        })}
      </div>
      <section className="kort p-5"><CreateClassForm /></section>
    </>
  );
}

async function GuardianHome() {
  const supabase = await supabaseServer();
  const { data: links } = await supabase.from("guardian_links").select("child_id, profiles:child_id(alias)");
  return (
    <>
      <h1 style={{ fontSize: "var(--t-2xl)" }}>Mina barn</h1>
      {links && links.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.child_id} className="kort p-5">
              <p className="display" style={{ fontSize: "var(--t-lg)" }}>{(l.profiles as unknown as { alias: string })?.alias}</p>
              <p className="hjalptext">Översikten över barnets färdigheter kommer i nästa steg.</p>
            </li>
          ))}
        </ul>
      ) : <p className="kort p-5">Inga barn kopplade än.</p>}
      <section className="kort p-5"><LinkChildForm /></section>
    </>
  );
}
