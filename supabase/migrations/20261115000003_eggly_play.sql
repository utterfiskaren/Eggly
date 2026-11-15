-- Eggly – spelomgångar (fas 1b)
-- Motorn körs på servern (Next.js). Den här migrationen ger plats för motorns tillstånd och för
-- uppgiften som väntar på svar. Facit får aldrig nå webbläsaren, så väntande uppgifter ligger i en
-- tabell som bara servern (service_role) kan läsa.

-- Hela motorns bild av färdigheten (senaste svaren, FSRS-kort, frågetyper, säkra pass).
-- Kolumnerna status, rating, attempts m.fl. finns kvar och hålls uppdaterade för lärarens översikt.
alter table eggly.child_skill_state add column if not exists model jsonb not null default '{}'::jsonb;

-- Passets tillstånd i motorn (uppgifter hittills, frustrationsskydd, prober).
alter table eggly.play_sessions add column if not exists state jsonb not null default '{}'::jsonb;
alter table eggly.play_sessions add column if not exists items_done smallint not null default 0;

-- Uppgiften som visas just nu, med facit. Ingen läsrätt för inloggade: bara servern.
create table eggly.pending_questions (
  session_id uuid primary key references eggly.play_sessions(id) on delete cascade,
  child_id   uuid not null references eggly.profiles(id) on delete cascade,
  item_index smallint not null,
  planned    jsonb not null,
  hint_level smallint not null default 0 check (hint_level between 0 and 3),
  created_at timestamptz not null default now()
);
alter table eggly.pending_questions enable row level security;
revoke all on eggly.pending_questions from anon, authenticated;
grant all on eggly.pending_questions to service_role;

-- Uppgiftsmallarnas svårighet (Elo för uppgiften) får läsas av servern och skrivas av servern.
grant all on eggly.item_stats to service_role;

-- Belöningar per barn och typ, för spelets räknare (stjärnor, ägg) utan att summera hela loggen varje gång.
create or replace view eggly.reward_totals with (security_invoker = true) as
  select child_id, kind, sum(amount)::int as total from eggly.reward_ledger group by child_id, kind;
grant select on eggly.reward_totals to authenticated, service_role;
