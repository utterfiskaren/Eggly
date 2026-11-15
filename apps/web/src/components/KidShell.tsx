import Link from "next/link";
import { Logo } from "./Logo";

/** Ram för barnens sidor: logga upptill, ett luftigt kort i mitten. */
export function KidShell({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <main id="innehall" className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pb-10 pt-6">
      <Link href="/" className="flex min-h-[44px] items-center self-start"><Logo size={36} /></Link>
      <section className="kort p-5 sm:p-6">
        <h1 className="mb-1" style={{ fontSize: "var(--t-2xl)" }}>{title}</h1>
        {lead && <p className="mb-5 text-[var(--plommon-2)]">{lead}</p>}
        {children}
      </section>
    </main>
  );
}
