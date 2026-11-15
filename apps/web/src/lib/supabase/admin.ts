import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../env";

/**
 * Administratörsåtkomst. Används BARA på servern för att skapa konton och begränsa inloggningsförsök.
 * Nyckeln ligger i Vercel som SUPABASE_SERVICE_ROLE_KEY och får aldrig nå webbläsaren.
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY saknas");
  return createClient(SUPABASE_URL, key, {
    db: { schema: "eggly" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
