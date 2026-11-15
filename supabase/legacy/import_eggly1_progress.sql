-- Flytt av framstegen på kartan från Eggly 1 till Eggly 2, 2026-11-15. Körs på Williams ja.
-- Kontona och samlingarna flyttades redan (import_eggly1.sql). Nu följer också med:
--  * klarade utmaningar → klarade steg på Matteöns karta, med samma id och bästa stjärnor (1–5)
--  * okläckta ägg → ägg att kläcka i Eggly 2, med samma nivå
-- Inget i mattespel ändras. Skriptet går att köra igen: stjärnorna slås ihop (bästa behålls) och
-- äggen har en unik nyckel per gammalt ägg.

begin;

insert into eggly.world_progress (child_id, island, stars, node, updated_at)
select p.id, 'matte',
       (select coalesce(jsonb_object_agg(k, (v->>'s')::int), '{}'::jsonb)
          from jsonb_each(coalesce(s.data->'cleared', '{}'::jsonb)) as c(k, v)
         where coalesce((v->>'s')::int, 0) > 0),
       0, now()
from eggly.profiles p
join mattespel.saves s on s.user_id = p.legacy_user_id
on conflict (child_id, island) do update
  set stars = coalesce((
        select jsonb_object_agg(k, greatest(coalesce((eggly.world_progress.stars->>k)::int, 0), coalesce((excluded.stars->>k)::int, 0)))
          from (select jsonb_object_keys(eggly.world_progress.stars || excluded.stars) as k) keys
      ), '{}'::jsonb),
      updated_at = now();

insert into eggly.reward_ledger (idempotency_key, child_id, kind, amount, ref, reason)
select 'legacy:' || p.id || ':egg:' || coalesce(e->>'id', md5(e::text)), p.id, 'egg', 1, coalesce(e->>'max', '0'), 'ägg från Eggly 1'
from eggly.profiles p
join mattespel.saves s on s.user_id = p.legacy_user_id,
     jsonb_array_elements(coalesce(s.data->'eggs', '[]'::jsonb)) e
on conflict (idempotency_key) do nothing;

commit;
