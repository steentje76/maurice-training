-- DEC-EXLINK-001 — fase 1: eigen oefening ↔ MoveKit-catalogusitem (koppelen + samenvoegen).
--
-- Additief en idempotent. Raakt geen bestaande tabel of rij.
-- Per eigenaar één rij per eigen oefening:
--   merged_into = null, hidden = false  → koppeling: toon de eigen oefening als MoveKit-item catalog_id
--   merged_into = <id>                  → samengevoegd: verborgen, nieuwe verwijzingen gaan naar <id>
--   hidden = true                       → vast race-onderdeel (HYROX/triathlon): niet in kieslijsten,
--                                         nooit omgeleid; wel MoveKit-beeld en -uitleg
-- De koppeling autoriseert geen media: broker + grants blijven beslissen.

create table if not exists public.exercise_catalog_links (
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id text        not null references public.exercises(id) on update restrict on delete restrict,
  catalog_id  text        not null,
  merged_into text        null     references public.exercises(id) on update restrict on delete restrict,
  hidden      boolean     not null default false,
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id),
  constraint exercise_catalog_links_catalog_chk
    check (catalog_id ~ '^TK-[0-9]{6}$' and substring(catalog_id from 4)::int between 1 and 582),
  constraint exercise_catalog_links_not_self
    check (merged_into is null or merged_into <> exercise_id),
  constraint exercise_catalog_links_hidden_not_merged
    check (not (hidden and merged_into is not null))
);

create index if not exists exercise_catalog_links_user_catalog_idx
  on public.exercise_catalog_links (user_id, catalog_id);

alter table public.exercise_catalog_links enable row level security;

revoke all on public.exercise_catalog_links from public, anon;
grant select, insert, update, delete on public.exercise_catalog_links to authenticated;

drop policy if exists exercise_catalog_links_select_own on public.exercise_catalog_links;
create policy exercise_catalog_links_select_own on public.exercise_catalog_links
  for select to authenticated using (user_id = auth.uid());

drop policy if exists exercise_catalog_links_insert_own on public.exercise_catalog_links;
create policy exercise_catalog_links_insert_own on public.exercise_catalog_links
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists exercise_catalog_links_update_own on public.exercise_catalog_links;
create policy exercise_catalog_links_update_own on public.exercise_catalog_links
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists exercise_catalog_links_delete_own on public.exercise_catalog_links;
create policy exercise_catalog_links_delete_own on public.exercise_catalog_links
  for delete to authenticated using (user_id = auth.uid());

comment on table public.exercise_catalog_links is
  'DEC-EXLINK-001: per eigenaar koppeling eigen oefening -> MoveKit-catalogusitem (fase 1). Owner-only RLS.';
