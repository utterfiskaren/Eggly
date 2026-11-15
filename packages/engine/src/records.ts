/**
 * Barnets egna rekord i Alla spel. Ingen jämförelse med andra: bara «så många rätt har du som mest haft
 * på en omgång» per spel. Aktiviteten sparas som «fritt:spel:nivå:tempo» (äldre omgångar saknar nivå och tempo).
 */
export interface RecordAttempt {
  sessionId: string;
  /** Passets aktivitet, t.ex. «fritt:bubbel:4:2». Andra aktiviteter (steg, öva) ignoreras. */
  activity: string;
  correct: boolean;
}

export interface GameRecord {
  game: string;
  /** Flest rätt på en omgång. */
  best: number;
  /** Nivå och tempo för rekordomgången, om de finns sparade. */
  level?: number;
  tempo?: number;
  /** Hur många omgångar barnet spelat i spelet (som har minst ett svar). */
  rounds: number;
}

export function parseArcadeActivity(activity: string): { game: string; level?: number; tempo?: number } | null {
  const m = activity.match(/^fritt:([a-z]+)(?::(\d+):(\d+))?$/);
  if (!m) return null;
  return { game: m[1], level: m[2] ? Number(m[2]) : undefined, tempo: m[3] ? Number(m[3]) : undefined };
}

/** Ett rekord per spel, sorterat med flest omgångar först. Vid lika rekord gäller den högre nivån. */
export function gameRecords(attempts: RecordAttempt[]): GameRecord[] {
  const rounds = new Map<string, { activity: string; right: number }>();
  for (const a of attempts) {
    if (!parseArcadeActivity(a.activity)) continue;
    const r = rounds.get(a.sessionId) ?? { activity: a.activity, right: 0 };
    if (a.correct) r.right++;
    rounds.set(a.sessionId, r);
  }
  const out = new Map<string, GameRecord>();
  for (const { activity, right } of rounds.values()) {
    const p = parseArcadeActivity(activity)!;
    const cur = out.get(p.game) ?? { game: p.game, best: -1, rounds: 0 };
    cur.rounds++;
    if (right > cur.best || (right === cur.best && (p.level ?? 0) > (cur.level ?? 0))) {
      cur.best = right; cur.level = p.level; cur.tempo = p.tempo;
    }
    out.set(p.game, cur);
  }
  return [...out.values()].filter((r) => r.best > 0).sort((a, b) => b.rounds - a.rounds || a.game.localeCompare(b.game));
}
