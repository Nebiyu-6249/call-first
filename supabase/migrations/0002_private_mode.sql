-- Call First: private mode. When it is on, the parent's phone checks with the rules only and
-- sends nothing to the AI service. Only the family can change it, with the PIN.
-- Safe to run more than once. The new function argument has a default, so a server still
-- running the previous code keeps working until it is redeployed.

alter table circles add column if not exists private_mode boolean not null default false;

drop function if exists create_circle(text, text, text, text, text, jsonb, jsonb);
drop function if exists replace_circle_settings(uuid, text, text, text, text, jsonb, jsonb);

create or replace function create_circle(
  p_family_code text,
  p_parent_name text,
  p_text_size text,
  p_emergency_number text,
  p_pin_hash text,
  p_members jsonb,
  p_contacts jsonb,
  p_private_mode boolean default false
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into circles (family_code, parent_name, text_size, emergency_number, private_mode, pin_hash)
  values (p_family_code, p_parent_name, p_text_size, p_emergency_number, p_private_mode, p_pin_hash)
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

create or replace function replace_circle_settings(
  p_circle_id uuid,
  p_parent_name text,
  p_text_size text,
  p_emergency_number text,
  p_pin_hash text,
  p_members jsonb,
  p_contacts jsonb,
  p_private_mode boolean default false
) returns void
language plpgsql
as $$
begin
  update circles
  set parent_name = p_parent_name,
      text_size = p_text_size,
      emergency_number = p_emergency_number,
      private_mode = p_private_mode,
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

-- Only the server's service role may call these, as in 0001.
do $$
declare
  fn text;
  r text;
begin
  foreach fn in array array[
    'create_circle(text, text, text, text, text, jsonb, jsonb, boolean)',
    'replace_circle_settings(uuid, text, text, text, text, jsonb, jsonb, boolean)'
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
