-- DEC-EXLINK-004 — fase 2b-3: rusttijd per gebruiker per oefening.
--
-- Additief en idempotent. Raakt geen bestaande tabel of rij (exercises.rest_seconds blijft bestaan
-- als terugval; er staat nergens een waarde in).
-- Eén rij per gebruiker per oefening. Geen rij = app-standaard. Werkt voor eigen oefeningen én voor
-- MoveKit-oefeningen (op hun MoveKit-id TKC-, dat globaal in exercises staat).
-- Schrijven loopt via tk_set_exercise_rest(): set-semantiek, dus veilig bij herhaald afspelen
-- vanuit de offline-wachtrij (laatste waarde wint, null = verwijderen).

create table if not exists public.exercise_rest_settings (
  user_id      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id  text        not null references public.exercises(id) on update restrict on delete cascade,
  rest_seconds integer     not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, exercise_id),
  constraint exercise_rest_settings_range_chk check (rest_seconds between 1 and 1800)
);

alter table public.exercise_rest_settings enable row level security;

revoke all on public.exercise_rest_settings from public, anon;
grant select, insert, update, delete on public.exercise_rest_settings to authenticated;

drop policy if exists exercise_rest_settings_select_own on public.exercise_rest_settings;
create policy exercise_rest_settings_select_own on public.exercise_rest_settings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists exercise_rest_settings_insert_own on public.exercise_rest_settings;
create policy exercise_rest_settings_insert_own on public.exercise_rest_settings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists exercise_rest_settings_update_own on public.exercise_rest_settings;
create policy exercise_rest_settings_update_own on public.exercise_rest_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists exercise_rest_settings_delete_own on public.exercise_rest_settings;
create policy exercise_rest_settings_delete_own on public.exercise_rest_settings
  for delete to authenticated using (user_id = auth.uid());

-- Idempotente setter: waarde zetten (upsert) of wissen (null of 0). Security invoker: RLS blijft leidend.
create or replace function public.tk_set_exercise_rest(p_exercise_id text, p_rest_seconds integer)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'not authenticated';
  end if;
  if p_exercise_id is null or length(p_exercise_id) = 0 or length(p_exercise_id) > 120 then
    raise exception using errcode = '22023', message = 'invalid exercise_id';
  end if;
  if p_rest_seconds is null or p_rest_seconds <= 0 then
    delete from public.exercise_rest_settings where user_id = v_uid and exercise_id = p_exercise_id;
    return null;
  end if;
  if p_rest_seconds > 1800 then
    raise exception using errcode = '22023', message = 'rest_seconds out of range';
  end if;
  insert into public.exercise_rest_settings (user_id, exercise_id, rest_seconds)
  values (v_uid, p_exercise_id, p_rest_seconds)
  on conflict (user_id, exercise_id)
  do update set rest_seconds = excluded.rest_seconds, updated_at = now();
  return p_rest_seconds;
end;
$$;

revoke execute on function public.tk_set_exercise_rest(text, integer) from public, anon;
grant  execute on function public.tk_set_exercise_rest(text, integer) to authenticated, service_role;

comment on table public.exercise_rest_settings is
  'DEC-EXLINK-004: rusttijd per gebruiker per oefening (eigen of MoveKit TKC-id). Owner-only RLS.';
comment on function public.tk_set_exercise_rest(text, integer) is
  'DEC-EXLINK-004: zet (upsert) of wist (null/0) de rusttijd van de ingelogde gebruiker. Idempotent, wachtrij-veilig.';
