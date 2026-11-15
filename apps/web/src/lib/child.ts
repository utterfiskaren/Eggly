import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

/** Inloggat barns id från den verifierade inloggningen. Skickar till inloggningen annars. */
export async function requireChild(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.app_metadata as { app?: string; role?: string } | undefined;
  if (!claims?.sub || meta?.app !== "eggly" || meta.role !== "child") redirect("/spela/logga-in");
  return claims.sub;
}
