import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MatteGame } from "@/components/game/MatteGame";
import { requireChild } from "@/lib/child";
import { openStop } from "@/lib/world";

export const metadata: Metadata = { title: "Matteön" };

export default async function Page({ params }: { params: Promise<{ stopp: string }> }) {
  const { stopp } = await params;
  const me = await requireChild();
  const stop = await openStop(me, stopp);
  if (!stop) notFound();
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between">
        <Link href="/spela/matte" className="flex min-h-[44px] items-center" aria-label="Till kartan"><Logo size={30} /></Link>
        <span className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-lg)" }}>{stop.name}</span>
      </header>
      <p className="hjalptext -mt-2">{stop.blurb}</p>
      <MatteGame stop={{ id: stop.id, name: stop.name }} />
    </main>
  );
}
