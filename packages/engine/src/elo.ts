/**
 * Elo-skattning för lärande, enligt samma idé som Math Garden (Klinkenberg m.fl. 2011):
 * barnets förmåga (theta) och uppgiftens svårighet (beta) justeras efter varje svar.
 * Sannolikheten för rätt svar är logistisk i (theta − beta).
 */

/** Sannolikhet att svara rätt. */
export function pCorrect(theta: number, beta: number): number {
  return 1 / (1 + Math.exp(-(theta - beta)));
}

/**
 * Hur mycket ett svar flyttar skattningen. Stort i början (få svar), mindre när skattningen är säker.
 * Startvärden som ska kalibreras mot riktiga svar.
 */
export function kFactor(n: number, base = 0.4, min = 0.08): number {
  return Math.max(min, base / (1 + n / 10));
}

export interface EloUpdate {
  theta: number;
  beta: number;
  expected: number;
}

/**
 * Uppdatera efter ett svar. Ett svar med ledtråd räknas som delvis rätt, så hjälp sänker inte
 * skattningen lika mycket som ett fel svar.
 */
export function updateElo(
  theta: number,
  thetaN: number,
  beta: number,
  betaN: number,
  correct: boolean,
  hintLevel = 0,
): EloUpdate {
  const expected = pCorrect(theta, beta);
  const score = correct ? Math.max(0.4, 1 - 0.2 * hintLevel) : 0;
  return {
    theta: theta + kFactor(thetaN) * (score - expected),
    beta: beta - kFactor(betaN, 0.2, 0.02) * (score - expected),
    expected,
  };
}

/** Svårighet som ger målsannolikheten för rätt svar, t.ex. 0,75 = barnet klarar ungefär 3 av 4. */
export function difficultyForTarget(theta: number, target = 0.75): number {
  return theta - Math.log(target / (1 - target));
}
