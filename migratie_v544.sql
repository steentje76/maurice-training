-- migratie_v544.sql
-- NUT-SCHEMA-01/01B — Nutrition Foundation 2.0: volledige, versioned baseline.
--
-- AANLEIDING
-- De negen Foundation 2.0-tabellen (nutrition_foods/products/
-- product_identifiers/nutrient_values/meals/meal_items/hydration_entries/
-- supplement_definitions/supplement_logs) plus nutrition_targets bestonden
-- live in Supabase, maar stonden in GEEN ENKELE versioned migratie in deze
-- repo (alleen nutrition_entries was gedekt, via v536/v537/v543). Dit
-- bestand legt exact vast wat via live-verificatie (NUT-SCHEMA-01B,
-- read-only pg_catalog/information_schema-queries) is bevestigd te bestaan.
--
-- VOORWAARDE VOOR DIT BESTAND: alle tien betrokken tabellen zijn per
-- Product Owner-besluit leeggemaakt nadat objectief was vastgesteld dat de
-- aanwezige data uitsluitend testdata was (zelfde account als de live
-- 5+ maanden trainingshistorie, maar alle Nutrition-rijen geconcentreerd
-- in één ~15-uur testvenster, met letterlijke testartefacten: producten
-- genaamd 'Test'/'X', een 'ontbijt' geregistreerd om 21:12 uur). Daardoor
-- zijn er GEEN legacy-rijen om te migreren, dedupliceren of backfillen --
-- dit is dus een schone ADOPTION-migratie, geen transformatie.
--
-- SCOPE
-- - CREATE TABLE IF NOT EXISTS voor alle tien tabellen, met exact de live-
--   geverifieerde kolommen/defaults/checks. Op een omgeving waar de tabel
--   al identiek bestaat is dit een no-op; er wordt niets overschreven.
-- - ALTER TABLE ... ADD CONSTRAINT voor de ontbrekende owner-FK's naar
--   auth.users (live bevestigd afwezig op vijf tabellen).
-- - Eén nieuwe UNIQUE constraint (nutrition_meals) die vóór de reset
--   onveilig was, nu niet meer (tabel is leeg).
-- - Indexes op de veelgebruikte FK/query-kolommen.
-- - RLS + policies: exact de live-bevestigde, reeds werkende policies,
--   opnieuw vastgelegd (DROP POLICY IF EXISTS + CREATE POLICY, geen
--   inhoudelijke wijziging).
-- - REVOKE van TRUNCATE/TRIGGER/REFERENCES van authenticated op de negen
--   nog niet eerder geharde tabellen (zelfde patroon als migratie_v543.sql
--   voor nutrition_entries). Geen wijziging aan SELECT/INSERT/UPDATE/
--   DELETE voor authenticated. Geen wijziging aan anon (was en blijft 0
--   privileges op alle elf tabellen, live bevestigd).
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor.

-- ── STAP 0 — vóórmeting (apart draaien, uitkomst bewaren) ─────────────────
select table_name, count(*) as rows
from (
  select 'nutrition_foods' as table_name union all select 'nutrition_products'
  union all select 'nutrition_product_identifiers' union all select 'nutrition_nutrient_values'
  union all select 'nutrition_meals' union all select 'nutrition_meal_items'
  union all select 'nutrition_hydration_entries' union all select 'nutrition_supplement_definitions'
  union all select 'nutrition_supplement_logs' union all select 'nutrition_targets'
) t
group by table_name;
-- Verwacht op het moment van draaien: alle tellingen 0 (data is per
-- PO-besluit al verwijderd vóór dit bestand wordt toegepast).

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 1 — CREATE (idempotent, geen destructieve wijziging)
-- ══════════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.nutrition_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 1 and char_length(name) <= 200),
  category text,
  source_type text not null check (source_type in ('EXTERNAL_DATABASE','MANUFACTURER','COMMUNITY','USER','TRAININGSKOMPAS_CURATED','UNKNOWN','USER_LABEL_SCAN')),
  source_name text,
  source_record_id text,
  source_version text,
  fetched_at timestamptz,
  data_quality text not null default 'UNKNOWN' check (data_quality in ('UNKNOWN','LOW','MEDIUM','HIGH','VERIFIED')),
  verification_state text not null default 'USER_PRIVATE' check (verification_state in ('USER_PRIVATE','COMMUNITY_UNVERIFIED','COMMUNITY_REVIEWED','VERIFIED')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 1 and char_length(name) <= 200),
  brand text,
  food_id uuid,
  source_type text not null check (source_type in ('EXTERNAL_DATABASE','MANUFACTURER','COMMUNITY','USER','TRAININGSKOMPAS_CURATED','UNKNOWN','USER_LABEL_SCAN')),
  source_name text,
  source_record_id text,
  source_version text,
  fetched_at timestamptz,
  data_quality text not null default 'UNKNOWN' check (data_quality in ('UNKNOWN','LOW','MEDIUM','HIGH','VERIFIED')),
  verification_state text not null default 'USER_PRIVATE' check (verification_state in ('USER_PRIVATE','COMMUNITY_UNVERIFIED','COMMUNITY_REVIEWED','VERIFIED')),
  allergen_metadata jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  identifier_type text not null check (identifier_type in ('EAN_13','EAN_8','UPC_A','GTIN_14','OTHER')),
  value text not null check (char_length(value) >= 1 and char_length(value) <= 32),
  canonical_gtin14 text generated always as (
    case when identifier_type in ('EAN_8','EAN_13','UPC_A','GTIN_14') then lpad(value, 14, '0') else null end
  ) stored,
  created_at timestamptz not null default now(),
  constraint nutrition_product_identifiers_identifier_type_value_key unique (identifier_type, value)
);

create table if not exists public.nutrition_nutrient_values (
  id uuid primary key default gen_random_uuid(),
  food_id uuid,
  product_id uuid,
  basis text not null check (basis in ('PER_100G','PER_100ML','PER_SERVING')),
  serving_size_g numeric,
  serving_size_ml numeric,
  piece_weight_g numeric check (piece_weight_g is null or piece_weight_g > 0),
  energy_kcal numeric check (energy_kcal is null or energy_kcal >= 0),
  protein_g numeric check (protein_g is null or protein_g >= 0),
  carbohydrate_g numeric check (carbohydrate_g is null or carbohydrate_g >= 0),
  fat_g numeric check (fat_g is null or fat_g >= 0),
  fiber_g numeric check (fiber_g is null or fiber_g >= 0),
  sugar_g numeric check (sugar_g is null or sugar_g >= 0),
  saturated_fat_g numeric check (saturated_fat_g is null or saturated_fat_g >= 0),
  sodium_mg numeric check (sodium_mg is null or sodium_mg >= 0),
  data_quality text not null default 'UNKNOWN' check (data_quality in ('UNKNOWN','LOW','MEDIUM','HIGH','VERIFIED')),
  source_type text check (source_type is null or source_type in ('EXTERNAL_DATABASE','MANUFACTURER','COMMUNITY','USER','TRAININGSKOMPAS_CURATED','UNKNOWN','USER_LABEL_SCAN')),
  extraction_confidence numeric check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  created_at timestamptz not null default now(),
  constraint nutrition_nutrient_values_check check (
    (food_id is not null and product_id is null) or (food_id is null and product_id is not null)
  )
);

create table if not exists public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occurred_at timestamptz not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null,
  food_id uuid,
  product_id uuid,
  quantity numeric not null check (quantity > 0),
  quantity_unit text not null check (quantity_unit in ('g','ml','serving','piece')),
  nutrient_snapshot jsonb,
  snapshot_source_version text,
  created_at timestamptz not null default now(),
  constraint nutrition_meal_items_check check (food_id is not null or product_id is not null)
);

create table if not exists public.nutrition_hydration_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occurred_at timestamptz not null,
  amount_ml numeric not null check (amount_ml > 0 and amount_ml < 10000),
  beverage_type text,
  source text not null default 'manual' check (source in ('manual','device')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_supplement_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 1 and char_length(name) <= 200),
  brand text,
  form text,
  serving_unit text,
  ingredient_metadata jsonb,
  source_type text not null check (source_type in ('EXTERNAL_DATABASE','MANUFACTURER','COMMUNITY','USER','TRAININGSKOMPAS_CURATED','UNKNOWN')),
  evidence_status text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  supplement_id uuid not null,
  occurred_at timestamptz not null,
  dose numeric check (dose is null or dose > 0),
  unit text,
  source text not null default 'manual' check (source in ('manual','device')),
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  effective_from date not null,
  energy_kcal numeric check (energy_kcal is null or energy_kcal > 0),
  protein_g numeric check (protein_g is null or protein_g > 0),
  carbohydrate_g numeric check (carbohydrate_g is null or carbohydrate_g > 0),
  fat_g numeric check (fat_g is null or fat_g > 0),
  source text not null default 'USER_DEFINED' check (source = 'USER_DEFINED'),
  created_at timestamptz not null default now(),
  constraint nutrition_targets_any_field check (coalesce(energy_kcal, protein_g, carbohydrate_g, fat_g) is not null)
);

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 2 — FOREIGN KEYS (voegt uitsluitend toe wat live-verificatie als
-- afwezig aantoonde: de owner-FK's naar auth.users op vijf tabellen, plus
-- de al bestaande FK's als guard voor omgevingen zonder deze tabellen).
-- ══════════════════════════════════════════════════════════════════════════
begin;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nutrition_products_food_id_fkey') then
    alter table public.nutrition_products add constraint nutrition_products_food_id_fkey
      foreign key (food_id) references public.nutrition_foods(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_products_created_by_fkey') then
    alter table public.nutrition_products add constraint nutrition_products_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_foods_created_by_fkey') then
    alter table public.nutrition_foods add constraint nutrition_foods_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_product_identifiers_product_id_fkey') then
    alter table public.nutrition_product_identifiers add constraint nutrition_product_identifiers_product_id_fkey
      foreign key (product_id) references public.nutrition_products(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_nutrient_values_product_id_fkey') then
    alter table public.nutrition_nutrient_values add constraint nutrition_nutrient_values_product_id_fkey
      foreign key (product_id) references public.nutrition_products(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_nutrient_values_food_id_fkey') then
    alter table public.nutrition_nutrient_values add constraint nutrition_nutrient_values_food_id_fkey
      foreign key (food_id) references public.nutrition_foods(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_meals_user_id_fkey') then
    alter table public.nutrition_meals add constraint nutrition_meals_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_meal_items_meal_id_fkey') then
    alter table public.nutrition_meal_items add constraint nutrition_meal_items_meal_id_fkey
      foreign key (meal_id) references public.nutrition_meals(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_meal_items_product_id_fkey') then
    alter table public.nutrition_meal_items add constraint nutrition_meal_items_product_id_fkey
      foreign key (product_id) references public.nutrition_products(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_meal_items_food_id_fkey') then
    alter table public.nutrition_meal_items add constraint nutrition_meal_items_food_id_fkey
      foreign key (food_id) references public.nutrition_foods(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_hydration_entries_user_id_fkey') then
    alter table public.nutrition_hydration_entries add constraint nutrition_hydration_entries_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_supplement_definitions_created_by_fkey') then
    alter table public.nutrition_supplement_definitions add constraint nutrition_supplement_definitions_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_supplement_logs_user_id_fkey') then
    alter table public.nutrition_supplement_logs add constraint nutrition_supplement_logs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_supplement_logs_supplement_id_fkey') then
    alter table public.nutrition_supplement_logs add constraint nutrition_supplement_logs_supplement_id_fkey
      foreign key (supplement_id) references public.nutrition_supplement_definitions(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'nutrition_targets_user_id_fkey') then
    alter table public.nutrition_targets add constraint nutrition_targets_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- NIEUW t.o.v. de live staat (alleen mogelijk omdat de tabel nu leeg is):
-- voorkomt twee meal-rijen voor dezelfde gebruiker/dag/type.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nutrition_meals_user_day_type_key') then
    alter table public.nutrition_meals add constraint nutrition_meals_user_day_type_key
      unique (user_id, meal_type, (occurred_at::date));
  end if;
end $$;

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 3 — INDEXES
-- ══════════════════════════════════════════════════════════════════════════
begin;
create index if not exists idx_nutrition_products_food_id on public.nutrition_products(food_id);
create index if not exists idx_nutrition_products_created_by on public.nutrition_products(created_by);
create index if not exists idx_nutrition_product_identifiers_product_id on public.nutrition_product_identifiers(product_id);
create index if not exists idx_nutrition_nutrient_values_product_id on public.nutrition_nutrient_values(product_id);
create index if not exists idx_nutrition_nutrient_values_food_id on public.nutrition_nutrient_values(food_id);
create index if not exists idx_nutrition_meals_user_occurred on public.nutrition_meals(user_id, occurred_at);
create index if not exists idx_nutrition_meal_items_meal_id on public.nutrition_meal_items(meal_id);
create index if not exists idx_nutrition_meal_items_product_id on public.nutrition_meal_items(product_id);
create index if not exists idx_nutrition_hydration_entries_user_occurred on public.nutrition_hydration_entries(user_id, occurred_at);
create index if not exists idx_nutrition_supplement_logs_user_occurred on public.nutrition_supplement_logs(user_id, occurred_at);
create index if not exists idx_nutrition_supplement_logs_supplement_id on public.nutrition_supplement_logs(supplement_id);
create index if not exists idx_nutrition_targets_user_effective on public.nutrition_targets(user_id, effective_from);
commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 4 — RLS + POLICIES (herbevestigt exact de live-werkende situatie;
-- geen inhoudelijke wijziging, DROP+CREATE is de standaard idempotente
-- vorm omdat Postgres geen "CREATE POLICY IF NOT EXISTS" kent).
-- ══════════════════════════════════════════════════════════════════════════
begin;

alter table public.nutrition_foods enable row level security;
drop policy if exists nf_select_all on public.nutrition_foods;
create policy nf_select_all on public.nutrition_foods for select using (true);
drop policy if exists nf_insert_own on public.nutrition_foods;
create policy nf_insert_own on public.nutrition_foods for insert with check (created_by = auth.uid());
drop policy if exists nf_update_own on public.nutrition_foods;
create policy nf_update_own on public.nutrition_foods for update
  using (created_by = auth.uid() and verification_state <> 'VERIFIED')
  with check (created_by = auth.uid() and verification_state <> 'VERIFIED');

alter table public.nutrition_products enable row level security;
drop policy if exists np_select_all on public.nutrition_products;
create policy np_select_all on public.nutrition_products for select using (true);
drop policy if exists np_insert_own on public.nutrition_products;
create policy np_insert_own on public.nutrition_products for insert with check (created_by = auth.uid());
drop policy if exists np_update_own on public.nutrition_products;
create policy np_update_own on public.nutrition_products for update
  using (created_by = auth.uid() and verification_state <> 'VERIFIED')
  with check (created_by = auth.uid() and verification_state <> 'VERIFIED');

alter table public.nutrition_product_identifiers enable row level security;
drop policy if exists npi_select_all on public.nutrition_product_identifiers;
create policy npi_select_all on public.nutrition_product_identifiers for select using (true);
drop policy if exists npi_insert_own on public.nutrition_product_identifiers;
create policy npi_insert_own on public.nutrition_product_identifiers for insert with check (
  exists (select 1 from public.nutrition_products p where p.id = nutrition_product_identifiers.product_id and p.created_by = auth.uid())
);

alter table public.nutrition_nutrient_values enable row level security;
drop policy if exists nnv_select_all on public.nutrition_nutrient_values;
create policy nnv_select_all on public.nutrition_nutrient_values for select using (true);
drop policy if exists nnv_insert_own on public.nutrition_nutrient_values;
create policy nnv_insert_own on public.nutrition_nutrient_values for insert with check (
  (food_id is not null and exists (select 1 from public.nutrition_foods f where f.id = nutrition_nutrient_values.food_id and f.created_by = auth.uid()))
  or
  (product_id is not null and exists (select 1 from public.nutrition_products p where p.id = nutrition_nutrient_values.product_id and p.created_by = auth.uid()))
);

alter table public.nutrition_meals enable row level security;
drop policy if exists nm_select_own on public.nutrition_meals;
create policy nm_select_own on public.nutrition_meals for select using (user_id = auth.uid());
drop policy if exists nm_insert_own on public.nutrition_meals;
create policy nm_insert_own on public.nutrition_meals for insert with check (user_id = auth.uid());
drop policy if exists nm_update_own on public.nutrition_meals;
create policy nm_update_own on public.nutrition_meals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nm_delete_own on public.nutrition_meals;
create policy nm_delete_own on public.nutrition_meals for delete using (user_id = auth.uid());

alter table public.nutrition_meal_items enable row level security;
drop policy if exists nmi_select_own on public.nutrition_meal_items;
create policy nmi_select_own on public.nutrition_meal_items for select using (
  exists (select 1 from public.nutrition_meals m where m.id = nutrition_meal_items.meal_id and m.user_id = auth.uid())
);
drop policy if exists nmi_insert_own on public.nutrition_meal_items;
create policy nmi_insert_own on public.nutrition_meal_items for insert with check (
  exists (select 1 from public.nutrition_meals m where m.id = nutrition_meal_items.meal_id and m.user_id = auth.uid())
);
drop policy if exists nmi_delete_own on public.nutrition_meal_items;
create policy nmi_delete_own on public.nutrition_meal_items for delete using (
  exists (select 1 from public.nutrition_meals m where m.id = nutrition_meal_items.meal_id and m.user_id = auth.uid())
);

alter table public.nutrition_hydration_entries enable row level security;
drop policy if exists nh_select_own on public.nutrition_hydration_entries;
create policy nh_select_own on public.nutrition_hydration_entries for select using (user_id = auth.uid());
drop policy if exists nh_insert_own on public.nutrition_hydration_entries;
create policy nh_insert_own on public.nutrition_hydration_entries for insert with check (user_id = auth.uid());
drop policy if exists nh_update_own on public.nutrition_hydration_entries;
create policy nh_update_own on public.nutrition_hydration_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nh_delete_own on public.nutrition_hydration_entries;
create policy nh_delete_own on public.nutrition_hydration_entries for delete using (user_id = auth.uid());

alter table public.nutrition_supplement_definitions enable row level security;
drop policy if exists nsd_select_all on public.nutrition_supplement_definitions;
create policy nsd_select_all on public.nutrition_supplement_definitions for select using (true);
drop policy if exists nsd_insert_own on public.nutrition_supplement_definitions;
create policy nsd_insert_own on public.nutrition_supplement_definitions for insert with check (created_by = auth.uid());

alter table public.nutrition_supplement_logs enable row level security;
drop policy if exists nsl_select_own on public.nutrition_supplement_logs;
create policy nsl_select_own on public.nutrition_supplement_logs for select using (user_id = auth.uid());
drop policy if exists nsl_insert_own on public.nutrition_supplement_logs;
create policy nsl_insert_own on public.nutrition_supplement_logs for insert with check (user_id = auth.uid());
drop policy if exists nsl_update_own on public.nutrition_supplement_logs;
create policy nsl_update_own on public.nutrition_supplement_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nsl_delete_own on public.nutrition_supplement_logs;
create policy nsl_delete_own on public.nutrition_supplement_logs for delete using (user_id = auth.uid());

alter table public.nutrition_targets enable row level security;
drop policy if exists nt_select_own on public.nutrition_targets;
create policy nt_select_own on public.nutrition_targets for select using (user_id = auth.uid());
drop policy if exists nt_insert_own on public.nutrition_targets;
create policy nt_insert_own on public.nutrition_targets for insert with check (user_id = auth.uid());
drop policy if exists nt_update_own on public.nutrition_targets;
create policy nt_update_own on public.nutrition_targets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nt_delete_own on public.nutrition_targets;
create policy nt_delete_own on public.nutrition_targets for delete using (user_id = auth.uid());

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 5 — GRANTS: anon blijft ongewijzigd (live bevestigd: 0 privileges op
-- alle elf tabellen). Alleen TRUNCATE/TRIGGER/REFERENCES van authenticated
-- intrekken op de negen tabellen die dit nog hadden (nutrition_entries en
-- nutrition_targets zijn al gehard, v543/eerder). SELECT/INSERT/UPDATE/
-- DELETE voor authenticated blijft ongewijzigd op alle tabellen.
-- ══════════════════════════════════════════════════════════════════════════
begin;
revoke truncate, trigger, references on public.nutrition_foods from authenticated;
revoke truncate, trigger, references on public.nutrition_products from authenticated;
revoke truncate, trigger, references on public.nutrition_product_identifiers from authenticated;
revoke truncate, trigger, references on public.nutrition_nutrient_values from authenticated;
revoke truncate, trigger, references on public.nutrition_meals from authenticated;
revoke truncate, trigger, references on public.nutrition_meal_items from authenticated;
revoke truncate, trigger, references on public.nutrition_hydration_entries from authenticated;
revoke truncate, trigger, references on public.nutrition_supplement_definitions from authenticated;
revoke truncate, trigger, references on public.nutrition_supplement_logs from authenticated;
commit;

-- ── STAP 6 — nameting ───────────────────────────────────────────────────
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relname like 'nutrition_%'
order by relname;

select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema='public' and table_name like 'nutrition_%' and grantee in ('anon','authenticated')
group by table_name, grantee order by table_name, grantee;

-- Rooktest: log een echte maaltijd/hydratatie/supplement in de app en
-- bevestig dat dit ongewijzigd slaagt; bevestig dat een tweede meal-rij
-- voor dezelfde dag/type nu een 409 (unique violation) geeft i.p.v. een
-- stille duplicaat.

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- Dit bestand voegt uitsluitend toe (CREATE IF NOT EXISTS, ADD CONSTRAINT
-- IF NOT EXISTS-guard, REVOKE van nooit-gebruikte rechten). Een rollback
-- zou de negen tabellen weer op hun vorige, ongeversioneerde staat willen
-- zetten -- dat is geen zinvolle SQL-rollback maar een besluit; overleg bij
-- problemen eerst voordat er iets wordt teruggedraaid.
-- ══════════════════════════════════════════════════════════════════════════
