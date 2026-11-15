"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { finishRound, startRound, type Round, type RoundAnswer, type RoundResult } from "@/lib/rounds";
import { hatch, type HatchView } from "@/lib/world";

/** Barnets id hämtas alltid från den verifierade inloggningen. */
async function childId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.app_metadata as { app?: string; role?: string } | undefined;
  if (!claims?.sub || meta?.app !== "eggly" || meta.role !== "child") throw new Error("Inte inloggad som barn");
  return claims.sub;
}

/** Startar en omgång på ett öppet steg. Null om steget inte är öppet för barnet. */
export async function startaSteg(stepId: string): Promise<Round | null> {
  return startRound(await childId(), String(stepId).slice(0, 20));
}

/** Skickar omgångens svar (bara rätt eller fel per uppgift, i ordning). */
export async function avslutaSteg(roundId: string, answers: RoundAnswer[], completed: boolean): Promise<RoundResult | null> {
  const clean = (Array.isArray(answers) ? answers : []).slice(0, 60)
    .map((a) => ({ correct: a?.correct === true, hint: Number(a?.hint) || 0 }));
  return finishRound(await childId(), String(roundId).slice(0, 40), clean, completed === true);
}

/** Kläcker det äldsta ägget. Ger klämmisen (med färdig bild), eller null om inget ägg fanns. */
export async function klackAgg(): Promise<HatchView | null> {
  return hatch(await childId());
}
