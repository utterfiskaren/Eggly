-- Behörighetstester för schemat eggly. Körs lokalt mot en tom databas (se supabase/tests/run.sh).
-- Varje kontroll avbryter med ett fel om något släpper igenom för mycket eller för lite.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Testpersoner
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1','larare.a@test.invalid','{"app":"eggly"}'),
  ('00000000-0000-0000-0000-0000000000a2','larare.b@test.invalid','{"app":"eggly"}'),
  ('00000000-0000-0000-0000-0000000000b1','barn1@kids.eggly.invalid','{"app":"eggly"}'),
  ('00000000-0000-0000-0000-0000000000b2','barn2@kids.eggly.invalid','{"app":"eggly"}'),
  ('00000000-0000-0000-0000-0000000000c1','foralder@test.invalid','{"app":"eggly"}'),
  ('00000000-0000-0000-0000-0000000000f1','festadmin@test.invalid','{}');
insert into eggly.profiles (id, role, alias, username) values
  ('00000000-0000-0000-0000-0000000000a1','teacher','Lärare A',null),
  ('00000000-0000-0000-0000-0000000000a2','teacher','Lärare B',null),
  ('00000000-0000-0000-0000-0000000000b1','child','Mjukamoln','mjukamoln'),
  ('00000000-0000-0000-0000-0000000000b2','child','Regnbåge','regnbage'),
  ('00000000-0000-0000-0000-0000000000c1','guardian','Förälder',null);
insert into eggly.skills (id, subject, strand, title, kid_title, grade_min, grade_max, kind)
values ('ma.test','matte','taluppfattning','Test','Test',1,3,'fact');
insert into eggly.child_skill_state (child_id, skill_id, attempts) values
  ('00000000-0000-0000-0000-0000000000b1','ma.test',5),
  ('00000000-0000-0000-0000-0000000000b2','ma.test',7);

create function pg_temp.as_user(uid text, app text default 'eggly') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'app_metadata', json_build_object('app', app))::text, false);
end $$;
create function pg_temp.expect(label text, ok boolean) returns void language plpgsql as $$
begin
  if not ok then raise exception 'MISSLYCKADES: %', label; end if;
  raise notice 'ok: %', label;
end $$;
set client_min_messages = notice;
grant execute on all functions in schema pg_temp to authenticated;

-- 1. Läraren skapar en klass, barn 1 ansöker, läraren godkänner.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
create temp table t_class as select * from eggly.create_class('4B', '4B');
reset role;
grant select on t_class to authenticated;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
create temp table t_req as select eggly.request_join((select join_code from t_class)) as id;
reset role;
grant select on t_req to authenticated;

-- Barnet får inte godkänna sin egen ansökan
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  perform eggly.decide_join((select id from t_req), true);
  raise exception 'MISSLYCKADES: barnet kunde godkänna sin egen ansökan';
exception when insufficient_privilege then raise notice 'ok: barnet kan inte godkänna sin egen ansökan';
end $$;
reset role;

-- Fel lärare får inte godkänna
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set role authenticated;
do $$ begin
  perform eggly.decide_join((select id from t_req), true);
  raise exception 'MISSLYCKADES: fel lärare kunde godkänna';
exception when insufficient_privilege then raise notice 'ok: fel lärare kan inte godkänna';
end $$;
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
select pg_temp.expect('rätt lärare godkänner', eggly.decide_join((select id from t_req), true) = 'approved');

-- 2. AT-12: läraren ser sin elev men inte andras.
select pg_temp.expect('lärare A ser barn 1:s färdigheter',
  (select count(*) from eggly.child_skill_state where child_id = '00000000-0000-0000-0000-0000000000b1') = 1);
select pg_temp.expect('lärare A ser INTE barn 2:s färdigheter',
  (select count(*) from eggly.child_skill_state where child_id = '00000000-0000-0000-0000-0000000000b2') = 0);
select pg_temp.expect('lärare A ser två profiler (sig själv och barn 1)', (select count(*) from eggly.profiles) = 2);
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set role authenticated;
select pg_temp.expect('lärare B ser ingen elevdata', (select count(*) from eggly.child_skill_state) = 0);
select pg_temp.expect('lärare B ser inte klass 4B', (select count(*) from eggly.classes) = 0);
reset role;

-- 3. Barn ser bara sig själva.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
select pg_temp.expect('barn 2 ser bara sin egen rad', (select count(*) from eggly.child_skill_state) = 1
  and (select child_id from eggly.child_skill_state) = '00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect('barn 2 ser bara sin egen profil', (select count(*) from eggly.profiles) = 1);
-- Direkt skrivning ska vara stängd
do $$ begin
  update eggly.child_skill_state set attempts = 999;
  raise exception 'MISSLYCKADES: barnet kunde skriva direkt';
exception when insufficient_privilege then raise notice 'ok: direkt skrivning stoppas';
end $$;
reset role;

-- 4. Föräldern kopplar sig med barnets kod och ser bara det barnet.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
create temp table t_code as select eggly.create_link_code('guardian') as code;
reset role;
grant select on t_code to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select pg_temp.expect('föräldern ser inget före kopplingen', (select count(*) from eggly.child_skill_state) = 0);
select eggly.link_guardian((select code from t_code));
select pg_temp.expect('föräldern ser barn 2 efter kopplingen', (select count(*) from eggly.child_skill_state) = 1
  and (select child_id from eggly.child_skill_state) = '00000000-0000-0000-0000-0000000000b2');
do $$ begin
  perform eggly.link_guardian((select code from t_code));
  raise exception 'MISSLYCKADES: koden gick att använda två gånger';
exception when no_data_found then raise notice 'ok: koden fungerar bara en gång';
end $$;
reset role;

-- 5. Ett konto utan Eggly-märkning (t.ex. uppsalafest) ser ingenting, även med samma id som ett barn.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'uppsalafest');
set role authenticated;
select pg_temp.expect('omärkt konto ser inga färdigheter', (select count(*) from eggly.child_skill_state) = 0);
select pg_temp.expect('omärkt konto ser inga profiler', (select count(*) from eggly.profiles) = 0);
reset role;

-- 6. Utloggad (anon) når inget.
set role anon;
do $$ begin
  perform count(*) from eggly.profiles;
  raise exception 'MISSLYCKADES: anon kunde läsa';
exception when insufficient_privilege then raise notice 'ok: utloggad når inget';
end $$;
reset role;

-- 7. Läraren skickar uppmuntran bara till egna elever.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
select pg_temp.expect('uppmuntran till egen elev',
  eggly.send_teacher_feedback((select id from t_class), '00000000-0000-0000-0000-0000000000b1', 'preset', 'Bra jobbat!') is not null);
do $$ begin
  perform eggly.send_teacher_feedback((select id from t_class), '00000000-0000-0000-0000-0000000000b2', 'text', 'Hej');
  raise exception 'MISSLYCKADES: läraren kunde skriva till en elev utanför klassen';
exception when insufficient_privilege then raise notice 'ok: ingen återkoppling till elev utanför klassen';
end $$;
reset role;

-- 8. Lärarens inbjudan: barn 2 ser klassens namn medan inbjudan väntar, och kan tacka ja själv.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
create temp table t_tcode as select eggly.create_link_code('teacher') as code;
reset role;
grant select on t_tcode to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
create temp table t_inv as select eggly.invite_child((select id from t_class), (select code from t_tcode)) as id;
reset role;
grant select on t_inv to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
select pg_temp.expect('barn 2 ser klassen i inbjudan', (select count(*) from eggly.classes) = 1);
select pg_temp.expect('barn 2 tackar ja', eggly.decide_join((select id from t_inv), true) = 'approved');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
select pg_temp.expect('lärare A ser nu båda eleverna', (select count(*) from eggly.child_skill_state) = 2);
reset role;

\echo 'ALLA BEHÖRIGHETSTESTER GICK IGENOM'
