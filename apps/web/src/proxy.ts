import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

const PUBLIC = ["/", "/spela/logga-in", "/spela/nytt-konto", "/portal/logga-in"];

export async function proxy(request: NextRequest) {
  const { response, user } = await refreshSession(request);
  const path = request.nextUrl.pathname;
  if (PUBLIC.includes(path)) return response;

  const role = (user?.app_metadata as { role?: string } | undefined)?.role;
  if (path.startsWith("/spela") && (!user || role !== "child")) {
    return NextResponse.redirect(new URL("/spela/logga-in", request.url));
  }
  if (path.startsWith("/portal") && (!user || role === "child")) {
    return NextResponse.redirect(new URL("/portal/logga-in", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:svg|png|jpg|webp|woff2?)$).*)"],
};
