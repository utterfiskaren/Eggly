import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MatteGame } from "@/components/game/MatteGame";

export const metadata: Metadata = { title: "Matteön" };

export default function Page() {
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 pb-12 pt-5">
      <header className="flex items-center justify-between">
        <Link href="/spela" className="flex min-h-[44px] items-center"><Logo size={30} /></Link>
        <span className="display" style={{ color: "var(--mynta)", fontSize: "var(--t-lg)" }}>Matteön</span>
      </header>
      <MatteGame />
    </main>
  );
}
