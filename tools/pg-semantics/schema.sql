-- Geïsoleerde testdatabase voor de PostgREST-semantiek van de schrijf- en verificatielaag (19-10-2026).
-- Afgeleid uit read-only productiemetadata (information_schema, pg_constraint, pg_policies, triggers) voor de tabellen
-- die de app idempotent schrijft of terugleest. Bevat GEEN productiedata. Alleen voor een lokale, wegwerpbare database.
drop schema if exists public cascade; create schema public;
drop schema if exists auth cascade; create schema auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login password 'tk_lokaal' noinherit; end if;
end $$;
grant anon, authenticated to authenticator;
-- Zoals Supabase: auth.uid() uit de JWT-claim 'sub' die PostgREST per verzoek zet.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
-- Zoals productie: BEFORE INSERT-trigger die user_id overschrijft met de ingelogde gebruiker.
create function public.set_user_id_from_auth() returns trigger language plpgsql as $$
begin if auth.uid() is not null then new.user_id := auth.uid(); end if; return new; end $$;

create table training_instances(id uuid primary key default gen_random_uuid(), user_id uuid not null, vaste_training_id text,
  custom_training_id text, status text not null default 'gestart', snapshot jsonb, started_at timestamptz not null default now(),
  completed_at timestamptz, created_at timestamptz not null default now(), weather jsonb);
create table sessions(id uuid primary key default gen_random_uuid(), date date not null default current_date, exercise_id text, sets integer,
  reps integer, weight numeric, rpe numeric, distance integer, time_str text, watt integer, note text, training_type text,
  created_at timestamptz default now(), user_id uuid, sets_detail jsonb, training_instance_id uuid references training_instances(id) on delete set null,
  duration_s integer, start_at timestamptz, finish_at timestamptz, edit_revision integer not null default 0);
create trigger trg_set_user_id before insert on sessions for each row execute function set_user_id_from_auth();
create table custom_trainings(id text primary key, user_id uuid, naam text not null, kleur text, notitie text, sort_order integer default 0,
  created_at timestamptz default now(), gym_id text, scope text not null default 'personal', source text, metadata jsonb);
create trigger trg_set_user_id before insert on custom_trainings for each row execute function set_user_id_from_auth();
create table custom_training_exercises(id uuid primary key default gen_random_uuid(), custom_training_id text not null references custom_trainings(id) on delete cascade,
  user_id uuid, exercise_id text, sort_order integer default 0, sets integer, reps text, rpe numeric, rest integer, pick text);
create trigger trg_set_user_id before insert on custom_training_exercises for each row execute function set_user_id_from_auth();
create table nutrition_meals(id uuid primary key default gen_random_uuid(), user_id uuid not null, occurred_at timestamptz not null default now(),
  meal_type text, created_at timestamptz not null default now(), consumed_at timestamptz not null default now(), consumed_at_source text);
create table nutrition_meal_items(id uuid primary key default gen_random_uuid(), meal_id uuid not null references nutrition_meals(id) on delete cascade,
  food_id uuid, product_id uuid, quantity numeric not null, quantity_unit text not null, created_at timestamptz not null default now(), nutrient_snapshot jsonb);
create table activities(id uuid primary key default gen_random_uuid(), user_id uuid not null, sport text not null, distance_meters numeric,
  duration_seconds integer, avg_heart_rate_bpm integer, source_provenance text not null default 'manual', data_quality text not null default 'unverified',
  recorded_at timestamptz not null default now(), created_at timestamptz not null default now(), dedupe_key text, rpe numeric, is_max_effort boolean not null default false);
create unique index activities_user_dedupe on activities(user_id, dedupe_key) where dedupe_key is not null;
create table activity_laps(id uuid primary key default gen_random_uuid(), activity_id uuid not null references activities(id) on delete cascade,
  lap_index integer not null, distance_meters numeric, duration_seconds integer, avg_heart_rate_bpm integer, avg_power_watts numeric);
create unique index activity_laps_activity_lap on activity_laps(activity_id, lap_index);
create table exercises(id text primary key, name text not null, type text, scope text, active boolean default true, created_by uuid);
create table exercise_goals(id bigint generated always as identity primary key, user_id uuid not null, exercise_id text not null,
  peak_goal numeric, pr numeric, one_rm numeric, updated_at timestamptz, unique(user_id, exercise_id));
create table cycle_symptom_logs(id uuid primary key default gen_random_uuid(), user_id uuid, log_date date not null, symptoms jsonb, unique(user_id, log_date));
create trigger trg_set_user_id before insert on cycle_symptom_logs for each row execute function set_user_id_from_auth();
create table calendar_feed_tokens(id uuid primary key default gen_random_uuid(), user_id uuid not null, token_hash text, active boolean default true, revoked_at timestamptz);
create unique index calendar_feed_tokens_one_active_per_user on calendar_feed_tokens(user_id) where active = true;
create table goals(id bigint generated always as identity primary key, user_id uuid not null, type text, naam text);

-- RLS zoals productie (custom_trainings vereenvoudigd tot scope 'personal').
alter table training_instances enable row level security;
create policy ti_all on training_instances for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
alter table sessions enable row level security;
create policy eigen_data_alleen on sessions for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table custom_trainings enable row level security;
create policy ct_all on custom_trainings for all using (scope='personal' and user_id=auth.uid()) with check (scope='personal' and user_id=auth.uid());
alter table custom_training_exercises enable row level security;
create policy cte_all on custom_training_exercises for all using (exists(select 1 from custom_trainings ct where ct.id=custom_training_exercises.custom_training_id and ct.scope='personal' and ct.user_id=auth.uid()))
  with check (exists(select 1 from custom_trainings ct where ct.id=custom_training_exercises.custom_training_id and ct.scope='personal' and ct.user_id=auth.uid()));
alter table nutrition_meals enable row level security;
create policy nm_all on nutrition_meals for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table nutrition_meal_items enable row level security;
create policy nmi_all on nutrition_meal_items for all using (exists(select 1 from nutrition_meals m where m.id=nutrition_meal_items.meal_id and m.user_id=auth.uid()))
  with check (exists(select 1 from nutrition_meals m where m.id=nutrition_meal_items.meal_id and m.user_id=auth.uid()));
alter table activities enable row level security;
create policy act_all on activities for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table activity_laps enable row level security;
create policy lap_all on activity_laps for all using (exists(select 1 from activities a where a.id=activity_laps.activity_id and a.user_id=auth.uid()))
  with check (exists(select 1 from activities a where a.id=activity_laps.activity_id and a.user_id=auth.uid()));
alter table exercises enable row level security;
create policy ex_sel on exercises for select using (scope='global' or (scope='personal' and created_by=auth.uid()));
create policy ex_ins on exercises for insert with check (scope='personal');
alter table exercise_goals enable row level security;
create policy eg_all on exercise_goals for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
alter table cycle_symptom_logs enable row level security;
create policy csl_all on cycle_symptom_logs for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table calendar_feed_tokens enable row level security;
create policy cft_all on calendar_feed_tokens for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table goals enable row level security;
create policy goals_all on goals for all using (user_id=auth.uid()) with check (user_id=auth.uid());
-- exercises.created_by zoals set_exercise_scope_context (vereenvoudigd)
create function public.set_exercise_created_by() returns trigger language plpgsql as $$ begin new.created_by := auth.uid(); return new; end $$;
create trigger trg_ex before insert on exercises for each row execute function set_exercise_created_by();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
