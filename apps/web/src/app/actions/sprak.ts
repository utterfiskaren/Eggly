"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { finishLanguageRound, startLanguageRound, type LangAnswer, type LangResult, type LangRound } from "@/lib/language-rounds";

/** Barnets id hämtas alltid från den verifierade inloggningen. */
async function childId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.app_metadata as { app?: string; role?: string } | undefined;
  if (!claims?.sub || meta?.app !== "eggly" || meta.role !== "child") throw new Error("Inte inloggad som barn");
  return claims.sub;
}

/** Startar en omgång i Ordön eller Språkön. Null om valet inte stämmer eller om passet inte kunde sparas (då spelar sidan i provläge). */
export async function startaSprak(island: string, skill: string, level: number): Promise<LangRound | null> {
  try {
    return await startLanguageRound(await childId(), { island: String(island).slice(0, 12), skill: String(skill).slice(0, 40), level: Number(level) });
  } catch {
    return null;
  }
}

/** Skickar omgångens svar (rätt eller fel och ledtrådsnivå per uppgift, i ordning). Null om omgången inte kunde sparas. */
export async function avslutaSprak(roundId: string, answers: LangAnswer[]): Promise<LangResult | null> {
  const clean = (Array.isArray(answers) ? answers : []).slice(0, 40)
    .map((a) => ({ correct: a?.correct === true, hint: Number(a?.hint) || 0, ...(Number.isInteger(a?.i) ? { i: a.i } : {}) }));
  try {
    return await finishLanguageRound(await childId(), String(roundId).slice(0, 40), clean);
  } catch {
    return null;
  }
}
