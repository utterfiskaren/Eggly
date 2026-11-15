/**
 * Framsteg i gångertabellerna, som «Mina framsteg» i Eggly 1. En tabell har tio tal (1×t … 10×t). Ett tal
 * räknas som kunnat när barnets senaste försök på det var rätt. Gånger och delat räknas till samma tal.
 */
export interface FactAttempt {
  /** Färdighetens id, t.ex. «ma.mul.tabell_6_9» eller «ma.div.tabell». */
  skillId: string;
  a: number;
  b: number;
  correct: boolean;
}

export interface TableProgress {
  table: number;
  /** Hur många av de tio talen barnet kan just nu. */
  known: number;
  /** Hur många av de tio som övats alls. */
  seen: number;
  /** 0–3 stjärnor. 3 = hela tabellen (med krona). */
  stars: 0 | 1 | 2 | 3;
}

/** `attempts` ska komma i ordning, äldst först, så att det senaste försöket vinner. */
export function tableProgress(attempts: FactAttempt[], tables = [2, 3, 4, 5, 6, 7, 8, 9, 10]): TableProgress[] {
  const last = new Map<string, boolean>();
  for (const x of attempts) {
    let f: [number, number] | null = null;
    if (x.skillId.startsWith("ma.mul.")) f = [x.a, x.b];
    else if (x.skillId.startsWith("ma.div.") && x.b > 0 && x.a % x.b === 0) f = [x.b, x.a / x.b];
    if (!f || f[0] < 1 || f[1] < 1 || f[0] > 10 || f[1] > 10) continue;
    last.set(`${Math.min(...f)}×${Math.max(...f)}`, x.correct);
  }
  return tables.map((t) => {
    let known = 0, seen = 0;
    for (let k = 1; k <= 10; k++) {
      const key = `${Math.min(t, k)}×${Math.max(t, k)}`;
      if (last.has(key)) { seen++; if (last.get(key)) known++; }
    }
    return { table: t, known, seen, stars: known >= 10 ? 3 : known >= 8 ? 2 : known >= 5 ? 1 : 0 };
  });
}
