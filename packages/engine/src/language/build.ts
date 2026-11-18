import { int, shuffle } from "../rng";
import type { Lang, TextItem, TextQuestion, TextTemplate } from "./types";

type ItemSpec = Omit<TextItem, "key"> & { key?: string };

/** Bygger en mall av en lista uppgifter som ligger i ordning, lättast först. */
export function textTemplate(spec: { skillId: string; lang: Lang; items: ItemSpec[]; version?: number }): TextTemplate {
  const version = spec.version ?? 1;
  const items: TextItem[] = spec.items.map((it, i) => ({ ...it, key: it.key ?? `${spec.skillId}:${i}` }));
  const byKey = new Map(items.map((it) => [it.key, it]));
  const last = Math.max(1, items.length - 1);

  return {
    id: spec.skillId,
    version,
    skillId: spec.skillId,
    lang: spec.lang,
    items,
    generate(rng, d, exclude) {
      const center = Math.round(Math.min(1, Math.max(0, d)) * (items.length - 1));
      const spread = Math.max(1, Math.round(items.length * 0.12));
      const free = (i: number) => i >= 0 && i < items.length && !(exclude?.has(items[i].key));
      let idx = Math.min(items.length - 1, Math.max(0, center + int(rng, -spread, spread)));
      if (!free(idx)) {
        // Närmaste lediga uppgift i listan, annars vilken som helst (när hela listan redan är använd).
        let found = -1;
        for (let r = 1; r < items.length && found < 0; r++) {
          if (free(idx + r)) found = idx + r;
          else if (free(idx - r)) found = idx - r;
        }
        if (found >= 0) idx = found;
      }
      const it = items[idx];
      const wrongs = shuffle(rng, [...new Set(it.wrong.filter((w) => w !== it.answer))]).slice(0, 3);
      const q: TextQuestion = {
        templateId: spec.skillId, templateVersion: version, skillId: spec.skillId, lang: spec.lang, key: it.key,
        prompt: it.prompt, ...(it.sub ? { sub: it.sub } : {}),
        choices: shuffle(rng, [it.answer, ...wrongs]), answer: it.answer, difficulty: idx / last,
      };
      return q;
    },
    hints(q) {
      const it = byKey.get(q.key);
      if (!it) return ["Läs uppgiften en gång till.", "Prova att stryka alternativ som låter konstiga.", `Rätt svar är «${q.answer}».`];
      return [it.hint1, it.hint2, it.solution ?? `Rätt svar är «${it.answer}».`];
    },
  };
}

/** Planerar en hel omgång: växlar mellan mallarna och ger aldrig samma uppgift två gånger. */
export function planTextRound(rng: () => number, templates: readonly TextTemplate[], count: number, difficulty: number): TextQuestion[] {
  if (!templates.length) return [];
  const total = templates.reduce((n, t) => n + t.items.length, 0);
  const n = Math.min(count, total);
  const used = new Set<string>();
  const order = shuffle(rng, [...templates]);
  const out: TextQuestion[] = [];
  for (let i = 0; out.length < n && i < n * 6; i++) {
    const t = order[i % order.length];
    if (t.items.every((it) => used.has(it.key))) continue;
    const q = t.generate(rng, difficulty, used);
    used.add(q.key);
    out.push(q);
  }
  return out;
}

export function isTextCorrect(q: TextQuestion, choice: string): boolean {
  return choice === q.answer;
}
