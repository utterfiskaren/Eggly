import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../env";

/** Supabase för serverkomponenter och serveråtgärder. Läser och skriver inloggningens kakor. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    db: { schema: "eggly" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Anropat från en serverkomponent: kakorna förnyas i proxy.ts i stället.
        }
      },
    },
  });
}
