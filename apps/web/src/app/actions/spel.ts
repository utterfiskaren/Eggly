"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { ARCADE_OPS, type ArcadeOp, type GameId } from "@eggly/content";
import { finishRound, startArcadeRound, startRound, type Round, type RoundAnswer, type RoundResult } from "@/lib/rounds";
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

/** Alla spel: startar ett spel som barnet valt själv. Null om valet inte stämmer. */
export async function startaFrittSpel(game: string, op: string, level: number, tempo: number): Promise<Round | null> {
  const okOp = ARCADE_OPS.find((o) => o.id === op)?.id as ArcadeOp | undefined;
  if (!okOp) return null;
  return startArcadeRound(await childId(), { game: String(game).slice(0, 12) as GameId, op: okOp, level: Number(level), tempo: Number(tempo) });
}

/** Skickar omgångens svar (bara rätt eller fel per uppgift, i ordning). */
export async function avslutaSteg(roundId: string, answers: RoundAnswer[], completed: boolean): Promise<RoundResult | null> {
  const clean = (Array.isArray(answers) ? answers : []).slice(0, 60)
    .map((a) => ({ correct: a?.correct === true, hint: Number(a?.hint) || 0, ...(Number.isInteger(a?.i) ? { i: a.i } : {}) }));
  return finishRound(await childId(), String(roundId).slice(0, 40), clean, completed === true);
}

/** Kläcker det äldsta ägget. Ger klämmisen (med färdig bild), eller null om inget ägg fanns. */
export async function klackAgg(): Promise<HatchView | null> {
  return hatch(await childId());
}
