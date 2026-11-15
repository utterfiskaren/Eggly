import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AdultAuthForm } from "@/components/AdultAuthForm";

export const metadata: Metadata = { title: "För lärare och föräldrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ny?: string }> }) {
  const signup = (await searchParams).ny === "1";
  return (
    <main id="innehall" className="portal flex min-h-dvh items-start justify-center px-4 pb-10 pt-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="flex min-h-[44px] items-center self-start"><Logo size={32} /></Link>
        <section className="kort p-6">
          <h1 className="mb-1" style={{ fontSize: "var(--t-xl)" }}>{signup ? "Skapa konto för vuxna" : "Logga in för lärare och föräldrar"}</h1>
          <p className="mb-5 text-[var(--plommon-2)]">
            {signup ? "Lärare skapar klasser och följer elevernas utveckling. Föräldrar följer sina barn." : "Se hur det går för dina elever eller barn."}
          </p>
          <AdultAuthForm kind={signup ? "signup" : "login"} />
        </section>
      </div>
    </main>
  );
}
