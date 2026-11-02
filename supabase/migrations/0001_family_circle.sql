-- Second Look: family circle schema.
-- Run this once in the Supabase SQL editor (or with the Supabase CLI).
-- The browser never talks to Supabase: every table has row-level security switched on with
-- no policies, so only the server (using the service role key) can read or write.

create table if not exists circles (
  id uuid primary key default gen_random_uuid(),
  -- Short code the family types with the PIN to sign in on another device.
  family_code text not null unique,
  parent_name text not null check (char_length(parent_name) between 1 and 60),
  text_size text not null default 'large' check (text_size in ('large', 'xl')),
  emergency_number text not null default '999' check (emergency_number ~ '^[0-9]{2,6}$'),
  -- scrypt hash; the PIN itself is never stored.
  pin_hash text not null,
  pin_failed_attempts integer not null default 0,
  pin_locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  position integer not null,
  name text not null check (char_length(name) between 1 and 60),
  relationship text not null check (char_length(relationship) <= 40),
  phone text not null check (char_length(phone) between 3 and 25)
);
create index if not exists family_members_circle on family_members (circle_id, position);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  position integer not null,
  label text not null check (char_length(label) between 1 and 60),
  category text not null check (category in ('bank', 'family', 'doctor', 'police', 'other')),
  phone text not null check (char_length(phone) between 3 and 25),
  note text not null default '' check (char_length(note) <= 120)
);
create index if not exists contacts_circle on contacts (circle_id, position);

-- Parent devices. Only a SHA-256 hash of the random device token is stored.
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists devices_circle on devices (circle_id);

-- One-time 6-digit pairing codes, stored as a keyed hash, valid for 15 minutes.
create table if not exists pairing_codes (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);
-- An unused code can belong to only one circle at a time.
create unique index if not exists pairing_codes_unused on pairing_codes (code_hash) where used_at is null;

-- Alerts hold only what the parent chose to share: a one-line summary and a short excerpt.
-- Never images. They expire after 7 days.
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  device_id uuid references devices (id) on delete set null,
  verdict text not null check (verdict in ('WARNING', 'NOT_SURE', 'NO_WARNING_SIGNS')),
  summary text not null check (char_length(summary) <= 200),
  excerpt text not null check (char_length(excerpt) <= 500),
  flag_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  reply_kind text check (reply_kind in ('calling', 'fine', 'wait', 'custom')),
  reply_text text check (char_length(reply_text) <= 200),
  replied_at timestamptz
);
create index if not exists alerts_circle on alerts (circle_id, created_at desc);
create index if not exists alerts_expiry on alerts (expires_at);

-- Fixed-window request counters for rate limiting /api/check, /api/transcribe and pairing.
create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table circles enable row level security;
alter table family_members enable row level security;
alter table contacts enable row level security;
alter table devices enable row level security;
alter table pairing_codes enable row level security;
alter table alerts enable row level security;
alter table rate_limits enable row level security;

-- Creates a circle with its family members and contacts in one transaction.
create or replace function create_circle(
  p_family_code text,
  p_parent_name text,
  p_text_size text,
  p_emergency_number text,
  p_pin_hash text,
  p_members jsonb,
  p_contacts jsonb
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into circles (family_code, parent_name, text_size, emergency_number, pin_hash)
  values (p_family_code, p_parent_name, p_text_size, p_emergency_number, p_pin_hash)
  returning id into v_id;

  insert into family_members (circle_id, position, name, relationship, phone)
  select v_id, (m.ord - 1)::integer, m.value ->> 'name', m.value ->> 'relationship', m.value ->> 'phone'
  from jsonb_array_elements(p_members) with ordinality as m(value, ord);

  insert into contacts (circle_id, position, label, category, phone, note)
  select v_id, (c.ord - 1)::integer, c.value ->> 'label', c.value ->> 'category', c.value ->> 'phone',
         coalesce(c.value ->> 'note', '')
  from jsonb_array_elements(p_contacts) with ordinality as c(value, ord);

  return v_id;
end;
$$;

-- Replaces a circle's settings, family members and contacts in one transaction.
-- p_pin_hash is null when the PIN is not being changed.
create or replace function replace_circle_settings(
  p_circle_id uuid,
  p_parent_name text,
  p_text_size text,
  p_emergency_number text,
  p_pin_hash text,
  p_members jsonb,
  p_contacts jsonb
) returns void
language plpgsql
as $$
begin
  update circles
  set parent_name = p_parent_name,
      text_size = p_text_size,
      emergency_number = p_emergency_number,
      pin_hash = coalesce(p_pin_hash, pin_hash)
  where id = p_circle_id;

  delete from family_members where circle_id = p_circle_id;
  insert into family_members (circle_id, position, name, relationship, phone)
  select p_circle_id, (m.ord - 1)::integer, m.value ->> 'name', m.value ->> 'relationship', m.value ->> 'phone'
  from jsonb_array_elements(p_members) with ordinality as m(value, ord);

  delete from contacts where circle_id = p_circle_id;
  insert into contacts (circle_id, position, label, category, phone, note)
  select p_circle_id, (c.ord - 1)::integer, c.value ->> 'label', c.value ->> 'category', c.value ->> 'phone',
         coalesce(c.value ->> 'note', '')
  from jsonb_array_elements(p_contacts) with ordinality as c(value, ord);
end;
$$;

-- Uses a pairing code at most once, and only before it expires. Returns the circle id or null.
create or replace function consume_pairing_code(p_code_hash text) returns uuid
language plpgsql
as $$
declare
  v_circle uuid;
begin
  update pairing_codes
  set used_at = now()
  where id = (
    select id from pairing_codes
    where code_hash = p_code_hash and used_at is null and expires_at > now()
    order by expires_at desc
    limit 1
    for update
  )
  returning circle_id into v_circle;
  return v_circle;
end;
$$;

-- Adds one to a rate-limit counter and returns the new count. Also clears old windows.
create or replace function hit_rate_limit(p_key text, p_window_start timestamptz) returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  delete from rate_limits where window_start < now() - interval '1 day';
  insert into rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

-- Removes expired alerts and pairing codes. The app also calls this as it goes; if pg_cron is
-- enabled you can schedule it too:
--   select cron.schedule('second-look-cleanup', '0 * * * *', 'select delete_expired()');
create or replace function delete_expired() returns void
language sql
as $$
  delete from alerts where expires_at < now();
  delete from pairing_codes where expires_at < now() - interval '1 day';
$$;

-- Only the server's service role may call these functions. Supabase grants new functions to the
-- anon and authenticated roles by default, so take that back (the roles only exist on Supabase).
do $$
declare
  fn text;
  r text;
begin
  foreach fn in array array[
    'create_circle(text, text, text, text, text, jsonb, jsonb)',
    'replace_circle_settings(uuid, text, text, text, text, jsonb, jsonb)',
    'consume_pairing_code(text)',
    'hit_rate_limit(text, timestamptz)',
    'delete_expired()'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('revoke execute on function %s from %I', fn, r);
      end if;
    end loop;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end;
$$;
