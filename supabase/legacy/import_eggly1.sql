-- Flytt av kontona från Eggly 1 (schema mattespel) till Eggly 2 (schema eggly), 2026-11-15.
-- Körs en gång, på Williams ja. Inget i mattespel ändras eller raderas: det gamla spelet fungerar
-- som förut tills domänen byts, och den gamla datan ligger kvar som arkiv.
--
-- Vad som flyttas, per konto:
--  * Inloggningen: samma användarnamn (med gemener) och samma lösenord. Lösenordet flyttas som den
--    bcrypt-hash det redan är; vi ser aldrig själva lösenordet.
--  * Ett Eggly 2-konto (profil) med det gamla namnet som alias.
--  * Hela samlingen: varje klämmis med sina kläder, märkt «från Eggly 1».
-- Det som inte flyttas nu: gamla svar (ligger kvar i mattespel.answer_log), stjärnor och mynt.
--
-- Skriptet går att köra igen utan att något dubbleras: konton som redan flyttats hoppas över.

begin;

create temp table flytt on commit drop as
select u.id,
       lower(u.username) as username,
       u.username as alias,
       lower(u.username) || '@barn.eggly.invalid' as email,
       u.pass_hash,
       u.created_at,
       coalesce(s.data->'inv', '[]'::jsonb) as inv
from mattespel.users u
left join mattespel.saves s on s.user_id = u.id
where lower(u.username) ~ '^[a-z0-9_]{3,24}$'
  and not exists (select 1 from eggly.profiles p where p.legacy_user_id = u.id)
  and not exists (select 1 from eggly.profiles p where p.username = lower(u.username))
  and not exists (select 1 from auth.users a where a.id = u.id or a.email = lower(u.username) || '@barn.eggly.invalid');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', f.id, 'authenticated', 'authenticated', f.email, f.pass_hash, now(),
       '{"provider":"email","providers":["email"],"app":"eggly","role":"child"}'::jsonb, '{}'::jsonb, f.created_at, now(),
       '', '', '', ''
from flytt f;

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select f.id::text, f.id, jsonb_build_object('sub', f.id::text, 'email', f.email, 'email_verified', true), 'email', now(), now()
from flytt f;

insert into eggly.profiles (id, role, alias, username, settings, legacy_user_id, created_at)
select f.id, 'child', f.alias, f.username, '{"password_mode":"text","from_eggly1":true}'::jsonb, f.id, f.created_at
from flytt f;

insert into eggly.owned_squishies (child_id, squishy_id, customization, obtained_at)
select f.id, e->>'s',
       jsonb_build_object('treats', coalesce(e->'t', '{}'::jsonb), 'seed', e->'seed', 'legacy', true, 'legacy_u', e->'u'),
       coalesce((e->>'d')::date::timestamptz, f.created_at)
from flytt f, jsonb_array_elements(f.inv) e
where e->>'s' is not null;

-- Kontroll: alla konton och alla klämmisar kom fram.
do $$
declare want_users int; got_users int; want_sq int; got_sq int;
begin
  select count(*) into want_users from mattespel.users;
  select count(*) into got_users from eggly.profiles where legacy_user_id is not null;
  select coalesce(sum(jsonb_array_length(coalesce(s.data->'inv', '[]'::jsonb))), 0) into want_sq
    from mattespel.saves s;
  select count(*) into got_sq from eggly.owned_squishies where (customization->>'legacy')::boolean;
  if got_users <> want_users or got_sq <> want_sq then
    raise exception 'Flytten stämmer inte: konton %/%, klämmisar %/%', got_users, want_users, got_sq, want_sq;
  end if;
end $$;

commit;
