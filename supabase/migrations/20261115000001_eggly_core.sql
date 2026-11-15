-- Eggly 2.0 – grunddatamodell (fas 0)
-- Ägare: Willworks AB. Körs i Supabase-projektet uppsalafest tills Eggly flyttar till ett eget projekt.
-- Allt ligger i schemat "eggly". Inget i public, auth eller mattespel ändras.
--
-- Princip: klienten får LÄSA det den har rätt att se (radnivåskydd), men all SKRIVNING av elevdata
-- går genom funktioner (rpc) som kontrollerar behörighet och regler på servern.

create schema if not exists eggly;
revoke all on schema eggly from public;
grant usage on schema eggly to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- Hjälpare
-- ─────────────────────────────────────────────────────────────

-- Är den inloggade ett Eggly-konto? Kontot märks app_metadata.app = 'eggly' när det skapas.
create or replace function eggly.is_eggly() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app', '') = 'eggly'
$$;

-- Kod utan förväxlingsbara tecken (ingen 0/O, 1/I/L).
create or replace function eggly.new_code(len int default 6) returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Konton och organisationer
-- ─────────────────────────────────────────────────────────────

create table eggly.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  role           text not null check (role in ('child','teacher','guardian','staff')),
  alias          text not null check (char_length(alias) between 2 and 24),
  username       text unique check (username ~ '^[a-z0-9åäö_]{3,24}$'),  -- bara barnkonton, alltid gemener
  age_band       text check (age_band in ('6-8','9-10','11-12','13-15','16+')),
  avatar         jsonb not null default '{}'::jsonb,
  settings       jsonb not null default '{}'::jsonb,                  -- ljud, rörelse, tempo m.m.
  legacy_user_id uuid unique,                                         -- id i det gamla schemat mattespel
  created_at     timestamptz not null default now(),
  last_seen      timestamptz not null default now(),
  deleted_at     timestamptz
);
comment on table eggly.profiles is 'Ett Eggly-konto. Barn har alias och användarnamn, aldrig riktigt namn, e-post eller födelsedag.';

create table eggly.organizations (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('school','municipality','family')),
  name       text not null,
  org_number text,
  created_at timestamptz not null default now()
);

create table eggly.org_members (
  org_id     uuid not null references eggly.organizations(id) on delete cascade,
  profile_id uuid not null references eggly.profiles(id) on delete cascade,
  role       text not null check (role in ('admin','teacher')),
  primary key (org_id, profile_id)
);

create table eggly.classes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references eggly.organizations(id) on delete set null,
  owner_id    uuid not null references eggly.profiles(id),
  name        text not null check (char_length(name) between 1 and 60),
  grade_label text,                                                  -- t.ex. "4B". Bara etikett.
  subjects    text[] not null default array['matte','svenska','engelska'],
  join_code   text not null unique default eggly.new_code(6),
  join_open   boolean not null default true,
  created_at  timestamptz not null default now(),
  archived_at timestamptz,
  check (subjects <@ array['matte','svenska','engelska'])
);

create table eggly.class_teachers (
  class_id   uuid not null references eggly.classes(id) on delete cascade,
  teacher_id uuid not null references eggly.profiles(id) on delete cascade,
  primary key (class_id, teacher_id)
);

create table eggly.class_members (
  class_id  uuid not null references eggly.classes(id) on delete cascade,
  child_id  uuid not null references eggly.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, child_id)
);

-- "Gå med i klass" (barnet) och "Lägg till elev" (läraren) blir båda en förfrågan.
create table eggly.join_requests (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references eggly.classes(id) on delete cascade,
  child_id   uuid not null references eggly.profiles(id) on delete cascade,
  direction  text not null check (direction in ('child_asks','teacher_invites')),
  status     text not null default 'pending' check (status in ('pending','approved','declined','expired')),
  created_by uuid not null references eggly.profiles(id),
  decided_by uuid references eggly.profiles(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index join_requests_one_pending on eggly.join_requests (class_id, child_id) where status = 'pending';

create table eggly.guardian_links (
  guardian_id uuid not null references eggly.profiles(id) on delete cascade,
  child_id    uuid not null references eggly.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (guardian_id, child_id)
);

-- Engångskoder: barnet visar en kod som föräldern skriver in, eller som läraren använder vid "Lägg till elev".
create table eggly.link_codes (
  code       text primary key default eggly.new_code(8),
  child_id   uuid not null references eggly.profiles(id) on delete cascade,
  purpose    text not null check (purpose in ('guardian','teacher')),
  expires_at timestamptz not null default now() + interval '48 hours',
  used_at    timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- Behörighetsfrågor (security definer så att de inte själva fastnar i radnivåskyddet)
-- ─────────────────────────────────────────────────────────────

create or replace function eggly.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from eggly.profiles p where p.id = auth.uid() and p.deleted_at is null and eggly.is_eggly()
$$;

create or replace function eggly.teaches_class(cls uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select eggly.is_eggly() and exists (
    select 1 from eggly.classes c
    where c.id = cls and (c.owner_id = auth.uid()
      or exists (select 1 from eggly.class_teachers t where t.class_id = c.id and t.teacher_id = auth.uid()))
  )
$$;

create or replace function eggly.teaches_child(child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select eggly.is_eggly() and exists (
    select 1 from eggly.class_members m
    join eggly.classes c on c.id = m.class_id and c.archived_at is null
    where m.child_id = child and (c.owner_id = auth.uid()
      or exists (select 1 from eggly.class_teachers t where t.class_id = c.id and t.teacher_id = auth.uid()))
  )
$$;

create or replace function eggly.guards_child(child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select eggly.is_eggly() and exists (
    select 1 from eggly.guardian_links g where g.child_id = child and g.guardian_id = auth.uid()
  )
$$;

create or replace function eggly.can_see_child(child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select eggly.is_eggly() and (child = auth.uid() or eggly.teaches_child(child) or eggly.guards_child(child))
$$;

-- ─────────────────────────────────────────────────────────────
-- Innehåll: färdigheter (synkas från kodförrådets kunskapskarta)
-- ─────────────────────────────────────────────────────────────

create table eggly.skills (
  id              text primary key,                 -- t.ex. 'ma.add.inom10'
  subject         text not null check (subject in ('matte','svenska','engelska')),
  strand          text not null,                    -- t.ex. 'taluppfattning'
  title           text not null,                    -- för vuxna
  kid_title       text not null,                    -- för barnet
  grade_min       smallint not null check (grade_min between 0 and 12),
  grade_max       smallint not null check (grade_max between 0 and 12),
  curriculum      text[] not null default '{}',     -- t.ex. 'lgr22:ma:1-3:taluppfattning'
  kind            text not null check (kind in ('fact','procedure','concept','problem')),
  content_version int not null default 1,
  active          boolean not null default true
);

create table eggly.skill_prereqs (
  skill_id  text not null references eggly.skills(id) on delete cascade,
  prereq_id text not null references eggly.skills(id) on delete cascade,
  primary key (skill_id, prereq_id),
  check (skill_id <> prereq_id)
);

-- ─────────────────────────────────────────────────────────────
-- Elevens lärande (skrivs bara av serverfunktioner)
-- ─────────────────────────────────────────────────────────────

create table eggly.child_skill_state (
  child_id          uuid not null references eggly.profiles(id) on delete cascade,
  skill_id          text not null references eggly.skills(id),
  status            text not null default 'not_seen'
                    check (status in ('not_seen','introduced','practicing','secure','mastered')),
  needs_review      boolean not null default false,
  rating            real not null default 0,          -- Elo-skattning av förmågan
  rating_n          int not null default 0,
  attempts          int not null default 0,
  correct           int not null default 0,
  hints_used        int not null default 0,
  representations   text[] not null default '{}',     -- frågetyper som klarats, krävs för "mastered"
  sessions_secure   int not null default 0,           -- antal separata pass med säker prestation
  fsrs              jsonb,                             -- minnesmodell för fakta (stabilitet, svårighet)
  review_due_at     timestamptz,
  last_practiced_at timestamptz,
  primary key (child_id, skill_id)
);

create table eggly.play_sessions (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references eggly.profiles(id) on delete cascade,
  subject           text not null check (subject in ('matte','svenska','engelska')),
  mode              text not null default 'aventyr' check (mode in ('mysigt','aventyr','klurigt')),
  activity          text,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  challenge_probes  smallint not null default 0,
  frustration_flags jsonb not null default '[]'::jsonb
);

create table eggly.attempts (
  id               bigint generated always as identity primary key,
  idempotency_key  text not null unique,
  session_id       uuid not null references eggly.play_sessions(id) on delete cascade,
  child_id         uuid not null references eggly.profiles(id) on delete cascade,
  skill_id         text not null references eggly.skills(id),
  template_id      text not null,
  template_version int not null,
  params           jsonb not null,
  representation   text not null,
  reason           text not null check (reason in
                   ('review_due','safe_practice','challenge_probe','scaffold_recovery','new_skill','teacher_assignment','child_choice','fallback')),
  difficulty       real not null,
  presented_at     timestamptz not null,
  answered_at      timestamptz,
  answer           text,
  correct          boolean,
  hint_level       smallint not null default 0 check (hint_level between 0 and 3),
  response_ms      int
);
create index attempts_child_time on eggly.attempts (child_id, presented_at desc);
create index attempts_skill on eggly.attempts (skill_id);

-- Uppgiftsmallarnas svårighet lär sig av alla barns svar (Elo för uppgiften).
create table eggly.item_stats (
  template_id text not null,
  bucket      text not null,                          -- parametergrupp, t.ex. 'a<10,b<10'
  rating      real not null default 0,
  n           int not null default 0,
  primary key (template_id, bucket)
);

-- ─────────────────────────────────────────────────────────────
-- Spelet: belöningar, samling, värld
-- ─────────────────────────────────────────────────────────────

create table eggly.reward_ledger (
  id              bigint generated always as identity primary key,
  idempotency_key text not null unique,
  child_id        uuid not null references eggly.profiles(id) on delete cascade,
  kind            text not null check (kind in ('xp','stars','energy','egg','item','fragment','squishy')),
  amount          int not null,
  ref             text,
  reason          text not null,
  created_at      timestamptz not null default now()
);
create index reward_ledger_child on eggly.reward_ledger (child_id, created_at desc);

create table eggly.inventory (
  child_id uuid not null references eggly.profiles(id) on delete cascade,
  item_id  text not null,
  qty      int not null check (qty >= 0),
  primary key (child_id, item_id)
);

create table eggly.owned_squishies (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references eggly.profiles(id) on delete cascade,
  squishy_id    text not null,
  nickname      text check (char_length(nickname) <= 20),
  customization jsonb not null default '{}'::jsonb,
  obtained_at   timestamptz not null default now()
);
create index owned_squishies_child on eggly.owned_squishies (child_id);

create table eggly.world_progress (
  child_id   uuid not null references eggly.profiles(id) on delete cascade,
  island     text not null check (island in ('matte','svenska','engelska')),
  node       int not null default 0,                  -- senaste upplåsta steget
  stars      jsonb not null default '{}'::jsonb,      -- steg -> 1–5 stjärnor
  decor      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (child_id, island)
);

-- ─────────────────────────────────────────────────────────────
-- Lärarens verktyg
-- ─────────────────────────────────────────────────────────────

-- Lås eller lås upp en grind på kartan, för hela klassen (child_id null) eller en elev.
create table eggly.unlocks (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references eggly.classes(id) on delete cascade,
  child_id   uuid references eggly.profiles(id) on delete cascade,
  island     text not null check (island in ('matte','svenska','engelska')),
  gate_id    text not null,
  unlocked   boolean not null,
  set_by     uuid not null references eggly.profiles(id),
  created_at timestamptz not null default now()
);

create table eggly.assignments (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references eggly.classes(id) on delete cascade,
  created_by      uuid not null references eggly.profiles(id),
  title           text not null,
  skill_ids       text[] not null,
  sessions_target smallint not null default 3,
  due_at          timestamptz,
  created_at      timestamptz not null default now()
);

create table eggly.teacher_feedback (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references eggly.profiles(id) on delete cascade,
  child_id   uuid not null references eggly.profiles(id) on delete cascade,
  class_id   uuid not null references eggly.classes(id) on delete cascade,
  kind       text not null check (kind in ('preset','text')),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

-- "Tyck till eller rapportera fel" – till oss som leverantör.
create table eggly.product_feedback (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references eggly.profiles(id) on delete set null,
  role       text,
  page       text,
  category   text not null check (category in ('idea','bug','wrong_answer','other')),
  body       text not null check (char_length(body) between 1 and 4000),
  status     text not null default 'new' check (status in ('new','read','done')),
  created_at timestamptz not null default now()
);

create table eggly.licenses (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references eggly.organizations(id) on delete cascade,
  class_id   uuid references eggly.classes(id) on delete cascade,
  package    text not null check (package in ('teacher_free','class','school','municipality')),
  subjects   text[] not null,
  seats      int,
  valid_from date not null,
  valid_to   date not null,
  created_at timestamptz not null default now(),
  check (org_id is not null or class_id is not null)
);

-- Begränsar inloggningsförsök (barn har korta bildlösenord).
create table eggly.login_attempts (
  id  bigint generated always as identity primary key,
  key text not null,
  ok  boolean not null,
  at  timestamptz not null default now()
);
create index login_attempts_key_at on eggly.login_attempts (key, at desc);

-- ─────────────────────────────────────────────────────────────
-- Radnivåskydd
-- ─────────────────────────────────────────────────────────────

alter table eggly.profiles          enable row level security;
alter table eggly.organizations     enable row level security;
alter table eggly.org_members       enable row level security;
alter table eggly.classes           enable row level security;
alter table eggly.class_teachers    enable row level security;
alter table eggly.class_members     enable row level security;
alter table eggly.join_requests     enable row level security;
alter table eggly.guardian_links    enable row level security;
alter table eggly.link_codes        enable row level security;
alter table eggly.skills            enable row level security;
alter table eggly.skill_prereqs     enable row level security;
alter table eggly.child_skill_state enable row level security;
alter table eggly.play_sessions     enable row level security;
alter table eggly.attempts          enable row level security;
alter table eggly.item_stats        enable row level security;
alter table eggly.reward_ledger     enable row level security;
alter table eggly.inventory         enable row level security;
alter table eggly.owned_squishies   enable row level security;
alter table eggly.world_progress    enable row level security;
alter table eggly.unlocks           enable row level security;
alter table eggly.assignments       enable row level security;
alter table eggly.teacher_feedback  enable row level security;
alter table eggly.product_feedback  enable row level security;
alter table eggly.licenses          enable row level security;
alter table eggly.login_attempts    enable row level security;

-- Grundregel: inloggade får bara läsa. Inga direkta skrivningar från klienten.
grant select on all tables in schema eggly to authenticated;
revoke select on eggly.login_attempts, eggly.item_stats from authenticated;
grant all on all tables in schema eggly to service_role;
grant usage, select on all sequences in schema eggly to service_role;

-- Profiler: sig själv, sina elever, sina barn. Läraren ser barnets alias, inte mer än det som behövs.
create policy profiles_read on eggly.profiles for select to authenticated
  using (eggly.is_eggly() and (id = auth.uid() or eggly.teaches_child(id) or eggly.guards_child(id)));

create policy orgs_read on eggly.organizations for select to authenticated
  using (eggly.is_eggly() and exists (select 1 from eggly.org_members m where m.org_id = organizations.id and m.profile_id = auth.uid()));
create policy org_members_read on eggly.org_members for select to authenticated
  using (eggly.is_eggly() and profile_id = auth.uid());

-- Klasser: lärare ser sina, barn ser klasser de är med i.
create policy classes_read on eggly.classes for select to authenticated
  using (eggly.is_eggly() and (eggly.teaches_class(classes.id)
    or exists (select 1 from eggly.class_members m where m.class_id = classes.id and m.child_id = auth.uid())
    or exists (select 1 from eggly.join_requests r where r.class_id = classes.id and r.child_id = auth.uid() and r.status = 'pending')));
create policy class_teachers_read on eggly.class_teachers for select to authenticated
  using (eggly.teaches_class(class_id));
create policy class_members_read on eggly.class_members for select to authenticated
  using (eggly.is_eggly() and (child_id = auth.uid() or eggly.teaches_class(class_id)));
create policy join_requests_read on eggly.join_requests for select to authenticated
  using (eggly.is_eggly() and (child_id = auth.uid() or eggly.teaches_class(class_id) or eggly.guards_child(child_id)));
create policy guardian_links_read on eggly.guardian_links for select to authenticated
  using (eggly.is_eggly() and (guardian_id = auth.uid() or child_id = auth.uid()));
create policy link_codes_read on eggly.link_codes for select to authenticated
  using (eggly.is_eggly() and child_id = auth.uid());

-- Innehåll är öppet för alla inloggade Eggly-konton.
create policy skills_read on eggly.skills for select to authenticated using (eggly.is_eggly());
create policy skill_prereqs_read on eggly.skill_prereqs for select to authenticated using (eggly.is_eggly());

-- Elevdata: barnet själv, barnets lärare, barnets vårdnadshavare.
create policy css_read on eggly.child_skill_state for select to authenticated using (eggly.can_see_child(child_id));
create policy sessions_read on eggly.play_sessions for select to authenticated using (eggly.can_see_child(child_id));
create policy attempts_read on eggly.attempts for select to authenticated using (eggly.can_see_child(child_id));
create policy rewards_read on eggly.reward_ledger for select to authenticated using (eggly.can_see_child(child_id));
create policy inventory_read on eggly.inventory for select to authenticated using (eggly.can_see_child(child_id));
create policy squishies_read on eggly.owned_squishies for select to authenticated using (eggly.can_see_child(child_id));
create policy world_read on eggly.world_progress for select to authenticated using (eggly.can_see_child(child_id));

create policy unlocks_read on eggly.unlocks for select to authenticated
  using (eggly.is_eggly() and (eggly.teaches_class(class_id) or child_id = auth.uid()
    or (child_id is null and exists (select 1 from eggly.class_members m where m.class_id = unlocks.class_id and m.child_id = auth.uid()))));
create policy assignments_read on eggly.assignments for select to authenticated
  using (eggly.is_eggly() and (eggly.teaches_class(class_id)
    or exists (select 1 from eggly.class_members m where m.class_id = assignments.class_id and m.child_id = auth.uid())));
create policy teacher_feedback_read on eggly.teacher_feedback for select to authenticated
  using (eggly.is_eggly() and (teacher_id = auth.uid() or child_id = auth.uid() or eggly.guards_child(child_id)));
create policy product_feedback_read on eggly.product_feedback for select to authenticated
  using (eggly.is_eggly() and (profile_id = auth.uid() or eggly.my_role() = 'staff'));
create policy licenses_read on eggly.licenses for select to authenticated
  using (eggly.is_eggly() and ((class_id is not null and eggly.teaches_class(class_id))
    or exists (select 1 from eggly.org_members m where m.org_id = licenses.org_id and m.profile_id = auth.uid())));

-- ─────────────────────────────────────────────────────────────
-- Serverfunktioner för skrivningar
-- ─────────────────────────────────────────────────────────────

create or replace function eggly.require_role(wanted text[]) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r text;
begin
  r := eggly.my_role();
  if r is null or not (r = any (wanted)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return r;
end $$;

-- Läraren skapar en klass.
create or replace function eggly.create_class(p_name text, p_grade_label text default null,
  p_subjects text[] default array['matte','svenska','engelska'])
returns eggly.classes language plpgsql volatile security definer set search_path = '' as $$
declare c eggly.classes;
begin
  perform eggly.require_role(array['teacher','staff']);
  insert into eggly.classes (owner_id, name, grade_label, subjects)
  values (auth.uid(), trim(p_name), nullif(trim(p_grade_label), ''), p_subjects)
  returning * into c;
  return c;
end $$;

-- Barnet skriver in en klasskod. Blir en förfrågan som läraren godkänner.
create or replace function eggly.request_join(p_code text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare cls eggly.classes; req uuid;
begin
  perform eggly.require_role(array['child']);
  select * into cls from eggly.classes
   where join_code = upper(trim(p_code)) and archived_at is null;
  if cls.id is null or not cls.join_open then
    raise exception 'unknown_code' using errcode = 'P0002';
  end if;
  if exists (select 1 from eggly.class_members where class_id = cls.id and child_id = auth.uid()) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  insert into eggly.join_requests (class_id, child_id, direction, created_by)
  values (cls.id, auth.uid(), 'child_asks', auth.uid())
  on conflict (class_id, child_id) where status = 'pending' do update set created_at = now()
  returning id into req;
  return req;
end $$;

-- Läraren lägger till en elev med barnets engångskod (barnet visar den i sin profil).
create or replace function eggly.invite_child(p_class uuid, p_link_code text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare lc eggly.link_codes; req uuid;
begin
  perform eggly.require_role(array['teacher','staff']);
  if not eggly.teaches_class(p_class) then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into lc from eggly.link_codes
   where code = upper(trim(p_link_code)) and purpose = 'teacher' and used_at is null and expires_at > now();
  if lc.code is null then raise exception 'unknown_code' using errcode = 'P0002'; end if;
  update eggly.link_codes set used_at = now() where code = lc.code;
  insert into eggly.join_requests (class_id, child_id, direction, created_by)
  values (p_class, lc.child_id, 'teacher_invites', auth.uid())
  on conflict (class_id, child_id) where status = 'pending' do update set created_at = now()
  returning id into req;
  return req;
end $$;

-- Besluta om en förfrågan. Barnets ansökan avgörs av läraren, lärarens inbjudan av barnet
-- (eller av en kopplad vårdnadshavare).
create or replace function eggly.decide_join(p_request uuid, p_approve boolean) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare r eggly.join_requests; allowed boolean;
begin
  select * into r from eggly.join_requests where id = p_request for update;
  if r.id is null or r.status <> 'pending' then raise exception 'not_pending' using errcode = 'P0002'; end if;
  allowed := case r.direction
    when 'child_asks'      then eggly.teaches_class(r.class_id)
    when 'teacher_invites' then (eggly.is_eggly() and (r.child_id = auth.uid() or eggly.guards_child(r.child_id)))
  end;
  if not coalesce(allowed, false) then raise exception 'not_allowed' using errcode = '42501'; end if;
  update eggly.join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now()
   where id = r.id;
  if p_approve then
    insert into eggly.class_members (class_id, child_id) values (r.class_id, r.child_id)
    on conflict do nothing;
  end if;
  return case when p_approve then 'approved' else 'declined' end;
end $$;

-- Barnet skapar en engångskod till en vuxen.
create or replace function eggly.create_link_code(p_purpose text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare c text;
begin
  perform eggly.require_role(array['child']);
  insert into eggly.link_codes (child_id, purpose) values (auth.uid(), p_purpose) returning code into c;
  return c;
end $$;

-- Föräldern kopplar sig till barnet med barnets kod.
create or replace function eggly.link_guardian(p_code text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare lc eggly.link_codes;
begin
  perform eggly.require_role(array['guardian']);
  select * into lc from eggly.link_codes
   where code = upper(trim(p_code)) and purpose = 'guardian' and used_at is null and expires_at > now();
  if lc.code is null then raise exception 'unknown_code' using errcode = 'P0002'; end if;
  update eggly.link_codes set used_at = now() where code = lc.code;
  insert into eggly.guardian_links (guardian_id, child_id) values (auth.uid(), lc.child_id) on conflict do nothing;
  return lc.child_id;
end $$;

-- Läraren skickar uppmuntran till en egen elev. Elever kan aldrig skriva till varandra.
create or replace function eggly.send_teacher_feedback(p_class uuid, p_child uuid, p_kind text, p_body text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare fid uuid;
begin
  perform eggly.require_role(array['teacher','staff']);
  if not eggly.teaches_class(p_class)
     or not exists (select 1 from eggly.class_members where class_id = p_class and child_id = p_child) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into eggly.teacher_feedback (teacher_id, child_id, class_id, kind, body)
  values (auth.uid(), p_child, p_class, p_kind, trim(p_body)) returning id into fid;
  return fid;
end $$;

-- Vem som helst med ett Eggly-konto kan tycka till.
create or replace function eggly.send_product_feedback(p_category text, p_body text, p_page text default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare fid uuid;
begin
  if not eggly.is_eggly() or auth.uid() is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into eggly.product_feedback (profile_id, role, page, category, body)
  values (auth.uid(), eggly.my_role(), left(p_page, 200), p_category, trim(p_body)) returning id into fid;
  return fid;
end $$;

-- Lås eller lås upp en grind för klassen eller en elev.
create or replace function eggly.set_unlock(p_class uuid, p_island text, p_gate text, p_unlocked boolean, p_child uuid default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid;
begin
  perform eggly.require_role(array['teacher','staff']);
  if not eggly.teaches_class(p_class) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_child is not null and not exists (select 1 from eggly.class_members where class_id = p_class and child_id = p_child) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into eggly.unlocks (class_id, child_id, island, gate_id, unlocked, set_by)
  values (p_class, p_child, p_island, p_gate, p_unlocked, auth.uid()) returning id into uid;
  return uid;
end $$;

-- Bara inloggade får köra funktionerna. Hjälpfunktionerna behövs för radnivåskyddet.
revoke execute on all functions in schema eggly from public, anon;
grant execute on all functions in schema eggly to authenticated, service_role;
