import type { Metadata } from "next";
import Link from "next/link";
import { englishSkills, swedishSkills } from "@eggly/content";
import { Logo } from "@/components/Logo";
import { SprakProv } from "@/components/game/SprakProv";
import { requireChild } from "@/lib/child";

export const metadata: Metadata = { title: "Ordön och Språkön" };

export default async function Page({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  await requireChild();
  const { o } = await searchParams;
  const islands = [
    { id: "svenska" as const, name: "Ordön", lang: "Svenska", color: "var(--himmel)", skills: swedishSkills.map((s) => ({ id: s.id, title: s.kidTitle })) },
    { id: "engelska" as const, name: "Språkön", lang: "Engelska", color: "var(--apelsin)", skills: englishSkills.map((s) => ({ id: s.id, title: s.kidTitle })) },
  ];
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pb-16 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/spela" className="flex min-h-[44px] items-center" aria-label="Till startsidan"><Logo size={30} /></Link>
        <h1 className="display" style={{ fontSize: "var(--t-xl)" }}>Ordön och Språkön</h1>
      </header>
      <SprakProv islands={islands} start={o === "engelska" ? "engelska" : o === "svenska" ? "svenska" : null} />
      <Link href="/spela" className="squish squish--mjuk self-center">Till startsidan</Link>
    </main>
  );
}
