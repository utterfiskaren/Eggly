import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isConfigured } from "../env";

/** Förnyar inloggningen och returnerar vem som är inloggad (eller null). */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isConfigured()) return { response, user: null };
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  const isEggly = (claims?.app_metadata as { app?: string } | undefined)?.app === "eggly";
  return { response, user: isEggly ? claims : null };
}
