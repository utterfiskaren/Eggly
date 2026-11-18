# Eggly – instruktioner för agenter

Eggly är ett lärospel i matte, svenska och engelska (Willworks AB). Planen: «Eggly 2.0 – plan före bygget» (Claude Docs).
Designtesen står i valvet: `02 Kodvalv/Eggly/DESIGN – Eggly.md`.

## Struktur
- `apps/web` – Next.js 16 (App Router, `proxy.ts` i stället för middleware). Spelet under `/spela`, portalen under `/portal`.
- `packages/content` – kunskapskartan (färdigheter, förkunskaper, kursplanetaggar) och validering.
- `packages/engine` – motorn (Elo, FSRS, regler). Ren kod utan skärm, testas med simulerade elever.
- `packages/content/src/svenska` och `engelska` – kunskapskartor för Ordön och Språkön (`sv.*`, `en.*`). `packages/engine/src/language` – språkmotorn: textuppgifter med flervalssvar från handskrivna listor, aldrig fritt genererade. Provsidan `/spela/sprak` är inte länkad från startsidan och sparar inget än.
- `supabase/migrations` – SQL för schemat `eggly`. Körs i projektet uppsalafest tills flytten.

## Regler
- All skrivning av elevdata sker i serverfunktioner (rpc) i databasen. Klienten får bara läsa, och radnivåskyddet avgör vad.
- Varje Eggly-konto har `app_metadata.app = 'eggly'`. Konton utan märkningen ser ingenting.
- Barn har aldrig riktigt namn, e-post eller födelsedag. Bara alias, användarnamn och åldersspann.
- Ändras migrationen: kör `pnpm test:db` (lokal Postgres) och lägg till en kontroll i `supabase/tests/rls_test.sql`.
- Ändras kunskapskartan: kör `pnpm --filter @eggly/content test` och `seed-sql`.
- Designskalan i `globals.css` gäller: sju textstorlekar, ingen text under 12 px, träffytor minst 44 px (56 px för barn).
- Next.js 16 skiljer sig från äldre versioner. Läs `node_modules/next/dist/docs/` innan du använder ett API du är osäker på.

## Kör
- `pnpm install` · `pnpm test` · `pnpm test:db` (kräver PGHOST/PGPORT/PGUSER) · `pnpm dev` · `pnpm build`
