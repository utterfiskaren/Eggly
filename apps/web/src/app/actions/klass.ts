"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import type { FormState } from "./auth";

export type CodeState = FormState & { code?: string; ok?: string };

const MESSAGES: Record<string, string> = {
  unknown_code: "Koden finns inte eller har gått ut. Kontrollera den och försök igen.",
  already_member: "Du är redan med i den klassen.",
  not_allowed: "Det här får ditt konto inte göra.",
  not_pending: "Förfrågan är redan besvarad.",
};
function friendly(message?: string): string {
  return (message && MESSAGES[message]) || "Något gick fel. Försök igen.";
}

export async function createClass(_: CodeState, form: FormData): Promise<CodeState> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Ge klassen ett namn, till exempel 4B" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_class", { p_name: name, p_grade_label: name });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/portal");
  return { ok: `Klassen ${data.name} är skapad`, code: data.join_code };
}

export async function requestJoin(_: CodeState, form: FormData): Promise<CodeState> {
  const code = String(form.get("code") ?? "").trim();
  if (code.length < 4) return { error: "Skriv klasskoden du fått av din lärare" };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("request_join", { p_code: code });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/spela");
  return { ok: "Klart! Din lärare behöver säga ja först." };
}

export async function decideJoin(form: FormData) {
  const supabase = await supabaseServer();
  await supabase.rpc("decide_join", {
    p_request: String(form.get("request")),
    p_approve: form.get("approve") === "1",
  });
  revalidatePath("/portal");
  revalidatePath("/spela");
}

export async function createLinkCode(_: CodeState, form: FormData): Promise<CodeState> {
  const purpose = form.get("purpose") === "teacher" ? "teacher" : "guardian";
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_link_code", { p_purpose: purpose });
  if (error) return { error: friendly(error.message) };
  return { code: data as string };
}

export async function linkGuardian(_: CodeState, form: FormData): Promise<CodeState> {
  const code = String(form.get("code") ?? "").trim();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("link_guardian", { p_code: code });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/portal");
  return { ok: "Barnet är kopplat till ditt konto." };
}

export async function inviteChild(_: CodeState, form: FormData): Promise<CodeState> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("invite_child", {
    p_class: String(form.get("class")),
    p_link_code: String(form.get("code") ?? "").trim(),
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/portal");
  return { ok: "Inbjudan skickad. Eleven behöver säga ja i spelet." };
}
