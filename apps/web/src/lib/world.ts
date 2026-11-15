import "server-only";
import { randomInt } from "node:crypto";
import {
  STEPS, TIERS, hatchFromTier, openUpTo, speciesById, squishySvg, type Step, type Treats,
} from "@eggly/content";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Matteöns karta, ägg och klämmisar på servern. Barnets id kommer alltid från den verifierade
 * inloggningen. Inget här går att köpa: ägg får man bara genom att klara steg på kartan.
 *
 * Framstegen sparas i eggly.world_progress (ö «matte»): `stars` är steg-id → bästa stjärnor (1–5).
 * Ägg och kläckningar ligger i belöningsloggen: en rad «egg» per intjänat ägg (ref = nivå) och en
 * rad «squishy» per kläckning. Äggen kläcks i den ordning de tjänades in.
 */

export interface StepView extends Step { stars: number; open: boolean }
export interface WorldView {
  steps: StepView[];
  /** Index för det steg barnet är på (nästa att klara). */
  current: number;
  totalStars: number;
  /** Okläckta ägg, äldst först (nivåer). */
  eggs: number[];
  cleared: number;
}

/** Kläckningar av ägg från stegen. Äldre kläckningar (stjärnägg under fas 1c) räknas inte av här. */
const HATCH_REASON = "kläckt ur steg-ägg";

const rnd = () => randomInt(0, 1_000_000_000) / 1_000_000_000;

export async function clearedSteps(childId: string): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin().from("world_progress").select("stars")
    .eq("child_id", childId).eq("island", "matte").maybeSingle();
  return (data?.stars as Record<string, number> | undefined) ?? {};
}

/** Okläckta ägg i den ordning de tjänades in. */
async function unhatchedEggs(childId: string): Promise<number[]> {
  const { data } = await supabaseAdmin().from("reward_ledger").select("kind, ref, amount, reason")
    .eq("child_id", childId).in("kind", ["egg", "squishy"]).order("id", { ascending: true });
  const eggs: number[] = [];
  let hatched = 0;
  for (const r of data ?? []) {
    if (r.kind === "egg") for (let i = 0; i < (r.amount as number); i++) eggs.push(Number(r.ref ?? 0));
    else if (r.kind === "squishy" && r.reason === HATCH_REASON) hatched += r.amount as number;
  }
  return eggs.slice(hatched);
}

async function starTotal(childId: string): Promise<number> {
  const { data } = await supabaseAdmin().from("reward_totals").select("total").eq("child_id", childId).eq("kind", "stars").maybeSingle();
  return (data?.total as number | undefined) ?? 0;
}

export async function loadWorld(childId: string): Promise<WorldView> {
  const [cleared, eggs, totalStars] = await Promise.all([clearedSteps(childId), unhatchedEggs(childId), starTotal(childId)]);
  const current = openUpTo(cleared);
  return {
    steps: STEPS.map((s) => ({ ...s, stars: cleared[s.id] ?? 0, open: s.index <= current })),
    current, totalStars, eggs, cleared: Object.keys(cleared).length,
  };
}

/** Steget om det finns och är öppet för barnet, annars null. */
export async function openStep(childId: string, stepId: string): Promise<Step | null> {
  const s = STEPS.find((x) => x.id === stepId);
  if (!s) return null;
  return s.index <= openUpTo(await clearedSteps(childId)) ? s : null;
}

/** Sparar ett klarat steg (bästa stjärnorna behålls) och ger ett ägg från stegets värld. */
export async function clearStep(childId: string, step: Step, stars: number, roundId: string): Promise<{ best: number; first: boolean }> {
  const db = supabaseAdmin();
  const cleared = await clearedSteps(childId);
  const first = !(cleared[step.id] > 0);
  const best = Math.max(cleared[step.id] ?? 0, stars);
  await db.from("world_progress").upsert({
    child_id: childId, island: "matte", stars: { ...cleared, [step.id]: best },
    node: Math.max(step.index, openUpTo(cleared) - 1), updated_at: new Date().toISOString(),
  });
  // Ett ägg per klarad omgång. Nyckeln gör att samma omgång aldrig kan ge två ägg.
  await db.from("reward_ledger").insert({
    idempotency_key: `${roundId}:egg`, child_id: childId, kind: "egg", amount: 1, ref: String(step.tier), reason: "steg klarat",
  });
  return { best, first };
}

export interface HatchView { id: string; name: string; tierName: string; txt: string; svg: string }

/**
 * Kläcker det äldsta ägget. Belöningsloggen har en unik nyckel per kläckning, så ett dubbelklick
 * eller två flikar samtidigt kan aldrig ge två klämmisar för samma ägg.
 */
export async function hatch(childId: string): Promise<HatchView | null> {
  const db = supabaseAdmin();
  const eggs = await unhatchedEggs(childId);
  if (eggs.length === 0) return null;
  const { count } = await db.from("reward_ledger").select("id", { count: "exact", head: true })
    .eq("child_id", childId).eq("kind", "squishy").eq("reason", HATCH_REASON);
  const { data: owned } = await db.from("owned_squishies").select("squishy_id").eq("child_id", childId);
  const pick = hatchFromTier((owned ?? []).map((o) => o.squishy_id as string), eggs[0], rnd);
  const { error } = await db.from("reward_ledger").insert({
    idempotency_key: `${childId}:stegagg:${(count ?? 0) + 1}`, child_id: childId, kind: "squishy", amount: 1, ref: pick.id, reason: HATCH_REASON,
  });
  if (error) return null; // någon annan begäran hann kläcka just det här ägget
  await db.from("owned_squishies").insert({
    child_id: childId, squishy_id: pick.id, customization: { treats: pick.treats, seed: pick.seed, tier: pick.tier },
  });
  const sp = speciesById(pick.id)!;
  return { id: pick.id, name: sp.name, tierName: TIERS[pick.tier].name, txt: sp.txt, svg: squishySvg(pick.id, pick.treats) };
}

export interface Owned { squishyId: string; treats: Treats; obtainedAt: string; legacy: boolean }

export async function collection(childId: string): Promise<Owned[]> {
  const { data } = await supabaseAdmin().from("owned_squishies").select("squishy_id, customization, obtained_at")
    .eq("child_id", childId).order("obtained_at", { ascending: false });
  return (data ?? []).map((r) => {
    const c = (r.customization ?? {}) as { treats?: Treats; legacy?: boolean };
    return { squishyId: r.squishy_id as string, treats: c.treats ?? {}, obtainedAt: r.obtained_at as string, legacy: !!c.legacy };
  });
}
