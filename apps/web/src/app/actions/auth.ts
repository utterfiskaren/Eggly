"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import { picturePassword } from "@/lib/pictures";
import { childEmail, isValidUsername, normalizeUsername } from "@/lib/usernames";

export type FormState = { error?: string };

const AGE_BANDS = ["6-8", "9-10", "11-12", "13-15", "16+"] as const;
const MAX_FAILS = 8;           // per användarnamn eller e-post
const MAX_FAILS_IP = 40;       // per IP-adress
const WINDOW_MIN = 15;

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "okand";
}

/** Stoppar gissning av korta bildlösenord. Räknar misslyckade försök senaste kvarten. */
async function tooManyAttempts(key: string, ip: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const [byKey, byIp] = await Promise.all([
    admin.from("login_attempts").select("id", { count: "exact", head: true }).eq("key", `u:${key}`).eq("ok", false).gte("at", since),
    admin.from("login_attempts").select("id", { count: "exact", head: true }).eq("key", `ip:${ip}`).eq("ok", false).gte("at", since),
  ]);
  return (byKey.count ?? 0) >= MAX_FAILS || (byIp.count ?? 0) >= MAX_FAILS_IP;
}

async function noteAttempt(key: string, ip: string, ok: boolean) {
  await supabaseAdmin().from("login_attempts").insert([
    { key: `u:${key}`, ok },
    { key: `ip:${ip}`, ok },
  ]);
}

function notReady(): FormState {
  return { error: "Eggly är inte kopplat till databasen än. Försök igen senare." };
}

function readChildPassword(form: FormData): string {
  if (form.get("mode") === "bild") {
    return picturePassword(String(form.get("pictures") ?? "").split(",").filter(Boolean));
  }
  const pw = String(form.get("password") ?? "");
  if (pw.length < 6) throw new Error("Lösenordet behöver minst 6 tecken");
  return pw;
}

// ── Barn ──────────────────────────────────────────────────────

export async function signUpChild(_: FormState, form: FormData): Promise<FormState> {
  if (!isConfigured()) return notReady();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const alias = String(form.get("alias") ?? "").trim();
  const ageBand = String(form.get("age_band") ?? "");
  if (!isValidUsername(username)) return { error: "Användarnamnet ska vara 3–24 tecken: bokstäver, siffror eller _" };
  if (alias.length < 2 || alias.length > 24) return { error: "Smeknamnet ska vara 2–24 tecken" };
  if (!AGE_BANDS.includes(ageBand as (typeof AGE_BANDS)[number])) return { error: "Välj hur gammal du är" };
  let password: string;
  try { password = readChildPassword(form); } catch (e) { return { error: (e as Error).message }; }

  const admin = supabaseAdmin();
  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "Det användarnamnet är redan taget. Prova ett annat." };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: childEmail(username),
    password,
    email_confirm: true,
    app_metadata: { app: "eggly", role: "child" },
  });
  if (error || !created.user) return { error: "Kontot gick inte att skapa. Prova ett annat användarnamn." };

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id, role: "child", alias, username, age_band: ageBand,
    settings: { password_mode: form.get("mode") === "bild" ? "bild" : "text" },
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Kontot gick inte att skapa. Prova ett annat användarnamn." };
  }

  const supabase = await supabaseServer();
  await supabase.auth.signInWithPassword({ email: childEmail(username), password });
  redirect("/spela");
}

export async function signInChild(_: FormState, form: FormData): Promise<FormState> {
  if (!isConfigured()) return notReady();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  if (!isValidUsername(username)) return { error: "Skriv ditt användarnamn" };
  let password: string;
  try { password = readChildPassword(form); } catch (e) { return { error: (e as Error).message }; }

  const ip = await clientIp();
  if (await tooManyAttempts(username, ip)) {
    return { error: "För många försök. Vänta en kvart, eller be en vuxen om hjälp." };
  }
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: childEmail(username), password });
  const ok = !error && data.user?.app_metadata?.app === "eggly" && data.user?.app_metadata?.role === "child";
  await noteAttempt(username, ip, ok);
  if (!ok) {
    if (data?.user) await supabase.auth.signOut();
    return { error: form.get("mode") === "bild" ? "Fel bilder eller användarnamn. Prova igen!" : "Fel användarnamn eller lösenord. Prova igen!" };
  }
  redirect("/spela");
}

// ── Vuxna ─────────────────────────────────────────────────────

export async function signUpAdult(_: FormState, form: FormData): Promise<FormState> {
  if (!isConfigured()) return notReady();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const alias = String(form.get("alias") ?? "").trim();
  const role = String(form.get("role") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Skriv en giltig e-postadress" };
  if (password.length < 10) return { error: "Lösenordet behöver minst 10 tecken" };
  if (alias.length < 2 || alias.length > 24) return { error: "Visningsnamnet ska vara 2–24 tecken" };
  if (role !== "teacher" && role !== "guardian") return { error: "Välj lärare eller förälder" };

  const ip = await clientIp();
  if (await tooManyAttempts(`signup:${ip}`, ip)) return { error: "För många försök. Vänta en kvart." };

  // Prototypfas: e-posten bekräftas inte. Innan Eggly flyttar till ett eget projekt läggs
  // bekräftelse via e-post till (uppsalafest-projektets e-postmallar ska inte användas).
  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, app_metadata: { app: "eggly", role },
  });
  if (error || !created.user) {
    await noteAttempt(`signup:${ip}`, ip, false);
    return { error: "Kontot gick inte att skapa. Finns det redan ett konto med den e-posten?" };
  }
  const { error: pErr } = await admin.from("profiles").insert({ id: created.user.id, role, alias });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Kontot gick inte att skapa. Försök igen." };
  }
  const supabase = await supabaseServer();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/portal");
}

export async function signInAdult(_: FormState, form: FormData): Promise<FormState> {
  if (!isConfigured()) return notReady();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  if (await tooManyAttempts(email, ip)) return { error: "För många försök. Vänta en kvart." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const role = data?.user?.app_metadata?.role;
  const ok = !error && data.user?.app_metadata?.app === "eggly" && role !== "child";
  await noteAttempt(email, ip, ok);
  if (!ok) {
    if (data?.user) await supabase.auth.signOut();
    return { error: "Fel e-post eller lösenord" };
  }
  redirect("/portal");
}

export async function signOut() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const wasChild = (data?.claims?.app_metadata as { role?: string } | undefined)?.role === "child";
  await supabase.auth.signOut();
  redirect(wasChild ? "/spela/logga-in" : "/portal/logga-in");
}
