import "server-only";
import { randomInt } from "node:crypto";
import {
  MATTE_STOPS, TIERS, eggProgress, eggsAvailable, hatchRoll, openStops, speciesById, squishySvg, stopStars,
  type Treats, type WorldStop,
} from "@eggly/content";
import { entryGradeFor } from "@eggly/engine";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Matteöns karta, ägg och klämmisar på servern. Barnets id kommer alltid från den verifierade
 * inloggningen. Inget här går att köpa: ägg tjänas bara in med stjärnor från spelet.
 */

export interface StopView extends WorldStop { index: number; stars: number; open: boolean }
export interface WorldView {
  stops: StopView[];
  totalStars: number;
  eggs: number;
  eggProgress: number;
  hatched: number;
}

async function totals(childId: string) {
  const { data } = await supabaseAdmin().from("reward_totals").select("kind, total").eq("child_id", childId);
  const by = Object.fromEntries((data ?? []).map((r) => [r.kind as string, r.total as number]));
  return { stars: by.stars ?? 0, hatched: by.squishy ?? 0 };
}

/** Stopp som en lärare har öppnat för barnet eller för hela klassen. Senaste beslutet per stopp gäller. */
async function teacherOpened(childId: string): Promise<string[]> {
  const db = supabaseAdmin();
  const { data: classes } = await db.from("class_members").select("class_id").eq("child_id", childId);
  const classIds = (classes ?? []).map((c) => c.class_id as string);
  if (classIds.length === 0) return [];
  const { data } = await db.from("unlocks").select("gate_id, unlocked, child_id, created_at")
    .eq("island", "matte").in("class_id", classIds).order("created_at", { ascending: true });
  const state = new Map<string, boolean>();
  for (const r of data ?? []) if (r.child_id === null || r.child_id === childId) state.set(r.gate_id as string, r.unlocked as boolean);
  return [...state.entries()].filter(([, v]) => v).map(([k]) => k);
}

async function progressRow(childId: string): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin().from("world_progress").select("stars")
    .eq("child_id", childId).eq("island", "matte").maybeSingle();
  return (data?.stars as Record<string, number> | undefined) ?? {};
}

async function skillStatus(childId: string): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin().from("child_skill_state").select("skill_id, status").eq("child_id", childId);
  return Object.fromEntries((data ?? []).map((r) => [r.skill_id as string, r.status as string]));
}

async function grade(childId: string): Promise<number> {
  const { data } = await supabaseAdmin().from("profiles").select("age_band").eq("id", childId).single();
  return entryGradeFor(data?.age_band as string | null | undefined);
}

export async function loadWorld(childId: string): Promise<WorldView> {
  const [stars, status, g, opened, t] = await Promise.all([
    progressRow(childId), skillStatus(childId), grade(childId), teacherOpened(childId), totals(childId),
  ]);
  const open = openStops({ grade: g, stars, skillStatus: status, teacherOpened: opened });
  return {
    stops: MATTE_STOPS.map((s, i) => ({ ...s, index: i, stars: stars[s.id] ?? 0, open: i < open })),
    totalStars: t.stars,
    eggs: eggsAvailable(t.stars, t.hatched),
    eggProgress: eggProgress(t.stars),
    hatched: t.hatched,
  };
}

/** Stoppet om det finns och är öppet för barnet, annars null. */
export async function openStop(childId: string, stopId: string): Promise<StopView | null> {
  const world = await loadWorld(childId);
  return world.stops.find((s) => s.id === stopId && s.open) ?? null;
}

export interface StopResult {
  stars: number;
  best: number;
  /** Namnet på ett stopp som öppnades av det här passet. */
  opened?: string;
  eggs: number;
}

/** Sparar stoppets stjärnor efter ett avslutat pass. Det bästa resultatet behålls. */
export async function finishStop(childId: string, stopId: string, r: { correct: number; clean: number; total: number }): Promise<StopResult> {
  const before = await loadWorld(childId);
  const stars = stopStars(r.correct, r.clean, r.total);
  const current = await progressRow(childId);
  const best = Math.max(current[stopId] ?? 0, stars);
  const next = { ...current, [stopId]: best };
  const openBefore = before.stops.filter((s) => s.open).length;
  await supabaseAdmin().from("world_progress").upsert({
    child_id: childId, island: "matte", stars: next, node: openBefore - 1, updated_at: new Date().toISOString(),
  });
  const after = await loadWorld(childId);
  const openAfter = after.stops.filter((s) => s.open).length;
  if (openAfter !== openBefore) {
    await supabaseAdmin().from("world_progress").update({ node: openAfter - 1 }).eq("child_id", childId).eq("island", "matte");
  }
  return {
    stars, best,
    opened: openAfter > openBefore ? after.stops[openAfter - 1].name : undefined,
    eggs: after.eggs,
  };
}

/**
 * Kläcker ett ägg. Belöningsloggen har en unik nyckel per kläckning, så ett dubbelklick eller två
 * flikar samtidigt kan aldrig ge två klämmisar för samma ägg.
 */
export interface HatchView { id: string; name: string; tierName: string; txt: string; svg: string }

/** Bästa äggnivån barnet kan få: en nivå per öppet stopp på kartan (Brons på första stoppet). */
export function maxEggRank(world: WorldView): number {
  return Math.max(0, world.stops.filter((s) => s.open).length - 1);
}

export async function hatch(childId: string): Promise<HatchView | null> {
  const db = supabaseAdmin();
  const world = await loadWorld(childId);
  const t = { stars: world.totalStars, hatched: world.hatched };
  if (eggsAvailable(t.stars, t.hatched) < 1) return null;
  const { data: owned } = await db.from("owned_squishies").select("squishy_id").eq("child_id", childId);
  const rnd = () => randomInt(0, 1_000_000_000) / 1_000_000_000;
  const pick = hatchRoll((owned ?? []).map((o) => o.squishy_id as string), maxEggRank(world), rnd);
  const n = t.hatched + 1;
  const { error } = await db.from("reward_ledger").insert({
    idempotency_key: `${childId}:hatch:${n}`, child_id: childId, kind: "squishy", amount: 1, ref: pick.id, reason: "ägg kläckt",
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
