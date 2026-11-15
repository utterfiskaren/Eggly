import type { Metadata } from "next";
import { ChildAuthForm } from "@/components/ChildAuthForm";
import { KidShell } from "@/components/KidShell";

export const metadata: Metadata = { title: "Logga in och spela" };

export default function Page() {
  return (
    <KidShell title="Hej igen!" lead="Logga in så fortsätter du där du slutade.">
      <ChildAuthForm kind="login" />
    </KidShell>
  );
}
