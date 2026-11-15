"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { answerQuestion, startSession, takeHint, type AnswerResult, type ClientQuestion } from "@/lib/play";
import { hatch, type HatchView } from "@/lib/world";
import type { Mode } from "@eggly/engine";

/** Barnets id hämtas alltid från den verifierade inloggningen. */
async function childId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.app_metadata as { app?: string; role?: string } | undefined;
  if (!claims?.sub || meta?.app !== "eggly" || meta.role !== "child") throw new Error("Inte inloggad som barn");
  return claims.sub;
}

const MODES: Mode[] = ["mysigt", "aventyr", "klurigt"];

export async function startMatte(mode: Mode, stopId: string): Promise<ClientQuestion> {
  return startSession(await childId(), MODES.includes(mode) ? mode : "aventyr", String(stopId).slice(0, 40));
}

/** Kläcker ett ägg. Ger klämmisen (med färdig bild), eller null om inget ägg fanns. */
export async function klackAgg(): Promise<HatchView | null> {
  // Ingen omladdning av sidan här: då försvinner kläckningen innan barnet hunnit se klämmisen.
  // Kläckaren laddar om sidan själv när barnet trycker vidare.
  // Kartan och samlingen renderas alltid på nytt, så inget behöver rensas.
  return hatch(await childId());
}

export async function svara(sessionId: string, answer: string): Promise<AnswerResult | null> {
  return answerQuestion(await childId(), sessionId, String(answer).slice(0, 20));
}

export async function visaLosningen(sessionId: string): Promise<AnswerResult | null> {
  return answerQuestion(await childId(), sessionId, "", true);
}

export async function ledtrad(sessionId: string) {
  return takeHint(await childId(), sessionId);
}
