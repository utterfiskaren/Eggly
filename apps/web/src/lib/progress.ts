import "server-only";
import { STEPS } from "@eggly/content";
import { gameRecords, tableProgress, type FactAttempt, type GameRecord, type TableProgress } from "@eggly/engine";
import { supabaseAdmin } from "./supabase/admin";
import { clearedSteps, collection } from "./world";

export interface ProgressView {
  answered: number;
  stars: number;
  days: number;
  squishies: number;
  stepsCleared: number;
  stepsTotal: number;
  skillsSecure: number;
  tables: TableProgress[];
  records: GameRecord[];
}

/** «Mina framsteg»: siffror för barnet själv. Allt läses för barnets eget id. */
export async function loadProgress(childId: string): Promise<ProgressView> {
  const db = supabaseAdmin();
  const [count, totals, times, facts, skills, cleared, owned, arcade] = await Promise.all([
    db.from("attempts").select("id", { count: "exact", head: true }).eq("child_id", childId),
    db.from("reward_totals").select("total").eq("child_id", childId).eq("kind", "stars").maybeSingle(),
    db.from("attempts").select("presented_at").eq("child_id", childId).order("presented_at", { ascending: false }).limit(5000),
    db.from("attempts").select("skill_id, params, correct").eq("child_id", childId)
      .or("skill_id.like.ma.mul.*,skill_id.like.ma.div.*").order("presented_at", { ascending: true }).limit(5000),
    db.from("child_skill_state").select("status").eq("child_id", childId).in("status", ["secure", "mastered"]),
    clearedSteps(childId),
    collection(childId),
    // Alla spel: svaren i fria omgångar, med passets aktivitet, för barnets egna rekord.
    db.from("attempts").select("session_id, correct, play_sessions!inner(activity)").eq("child_id", childId)
      .like("play_sessions.activity", "fritt:%").limit(20000),
  ]);
  const days = new Set((times.data ?? []).map((r) => new Date(r.presented_at as string).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })));
  const attempts: FactAttempt[] = (facts.data ?? []).map((r) => {
    const p = r.params as { a?: number; b?: number };
    return { skillId: r.skill_id as string, a: Number(p.a), b: Number(p.b), correct: r.correct === true };
  });
  return {
    answered: count.count ?? 0,
    stars: (totals.data?.total as number | undefined) ?? 0,
    days: days.size,
    squishies: owned.length,
    stepsCleared: Object.values(cleared).filter((s) => s > 0).length,
    stepsTotal: STEPS.length,
    skillsSecure: skills.data?.length ?? 0,
    tables: tableProgress(attempts),
    records: gameRecords((arcade.data ?? []).map((r) => {
      const ps = r.play_sessions as unknown as { activity: string } | { activity: string }[] | null;
      const activity = Array.isArray(ps) ? ps[0]?.activity : ps?.activity;
      return { sessionId: r.session_id as string, activity: activity ?? "", correct: r.correct === true };
    })),
  };
}
