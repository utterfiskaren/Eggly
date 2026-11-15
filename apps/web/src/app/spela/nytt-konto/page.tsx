import type { Metadata } from "next";
import { ChildAuthForm } from "@/components/ChildAuthForm";
import { KidShell } from "@/components/KidShell";
import { suggestAlias } from "@/lib/usernames";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Skapa konto" };

export default function Page() {
  return (
    <KidShell title="Välkommen till Eggly!" lead="Hitta på ett smeknamn och ett lösenord. Det tar en minut.">
      <ChildAuthForm kind="signup" suggestedAlias={suggestAlias()} />
    </KidShell>
  );
}
