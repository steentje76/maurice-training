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
--   Dit is een FRESH-INSTALL-garantie (zet een lege database compleet
--   neer); op de huidige live database is elke CREATE-regel een no-op
--   die uitsluitend documenteert wat al bestaat (ADOPTION), nooit een
--   correctie van eventuele afwijkingen in een bestaande tabel.
-- - ALTER TABLE ... ADD CONSTRAINT voor de ontbrekende owner-FK's naar
--   auth.users, uitsluitend op de drie PRIVATE tabellen waar dit veilig
--   aantoonbaar correct is (nutrition_meals, nutrition_hydration_entries,
--   nutrition_supplement_logs). Voor de drie GEDEELDE catalogusobjecten
--   (nutrition_products/nutrition_foods.created_by, nutrition_supplement_
--   definitions.created_by) wordt bewust GEEN FK toegevoegd -- gedeferred,
--   zie sectie 5 van het corrective-review-rapport (NUT-SCHEMA-01C).
-- - GEEN nieuwe UNIQUE constraint op nutrition_meals. Een eerdere versie
--   van dit bestand voegde die toe; teruggedraaid op expliciete PO-
--   instructie (NUT-SCHEMA-01C, blocker 1) omdat occurred_at vandaag
--   registratietijd is, geen betrouwbaar consumptietijdstip. GAP-S3
--   blijft: OPEN / DEFERRED TO NUT-TIME-01.
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
-- CORRECTIE (NUT-SCHEMA-01C, blocker 2): de eerdere versie telde een
-- inline literal-lijst i.p.v. de echte tabellen en leverde dus geen bewijs.
-- Dit telt daadwerkelijk elke Nutrition-tabel, inclusief nutrition_entries
-- (al gedekt door v536/v537/v543, hier alleen ter controle meegenomen).
select 'nutrition_entries' as table_name, count(*) as row_count from public.nutrition_entries
union all
select 'nutrition_foods', count(*) from public.nutrition_foods
union all
select 'nutrition_products', count(*) from public.nutrition_products
union all
select 'nutrition_product_identifiers', count(*) from public.nutrition_product_identifiers
union all
select 'nutrition_nutrient_values', count(*) from public.nutrition_nutrient_values
union all
select 'nutrition_meals', count(*) from public.nutrition_meals
union all
select 'nutrition_meal_items', count(*) from public.nutrition_meal_items
union all
select 'nutrition_hydration_entries', count(*) from public.nutrition_hydration_entries
union all
select 'nutrition_supplement_definitions', count(*) from public.nutrition_supplement_definitions
union all
select 'nutrition_supplement_logs', count(*) from public.nutrition_supplement_logs
union all
select 'nutrition_targets', count(*) from public.nutrition_targets;
-- Verwacht op het moment van draaien: alle elf tellingen 0 (data is per
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
-- STAP 2 — FOREIGN KEYS
-- Voegt de owner-FK naar auth.users toe op de drie PRIVATE (niet-gedeelde)
-- tabellen waar live-verificatie hem afwezig toonde: nutrition_meals,
-- nutrition_hydration_entries, nutrition_supplement_logs (RLS: eigen data
-- via user_id=auth.uid(), zelfde CASCADE-patroon als het al langer
-- bestaande nutrition_entries.user_id/nutrition_targets.user_id).
-- Voor de DRIE GEDEELDE catalogusobjecten (nutrition_products.created_by,
-- nutrition_foods.created_by, nutrition_supplement_definitions.created_by)
-- wordt BEWUST GEEN FK toegevoegd -- zie de toelichting bij elk van de
-- drie hieronder (NUT-SCHEMA-01C, sectie 5: gedeferred, geen gok over
-- ON DELETE-gedrag van een gedeeld object).
-- Alle overige FK's hieronder bestonden al live en staan hier alleen als
-- idempotente guard voor omgevingen waar deze tabellen nog moeten ontstaan.
-- ══════════════════════════════════════════════════════════════════════════
begin;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nutrition_products_food_id_fkey') then
    alter table public.nutrition_products add constraint nutrition_products_food_id_fkey
      foreign key (food_id) references public.nutrition_foods(id);
  end if;
  -- CORRECTIE (NUT-SCHEMA-01C, sectie 5): created_by-FK op
  -- nutrition_products/nutrition_foods is HIER BEWUST NIET toegevoegd.
  -- Beide zijn gedeelde/canonical catalogusobjecten (RLS: select_all,
  -- door iedereen leesbaar en herbruikbaar via meal_items/nutrient_values
  -- van andere gebruikers). ON DELETE CASCADE zou een product/food laten
  -- verdwijnen zodra de MAKER zijn account verwijdert, ook als andere
  -- gebruikers er via hun eigen meal_items/nutrient_values nog naar
  -- verwijzen (die FK's zijn zelf niet CASCADE) -- dat is een ander
  -- lifecycle-model dan private user data en niet zonder een expliciete
  -- productbeslissing (CASCADE? SET NULL? RESTRICT + soft-delete?) veilig
  -- te kiezen. Live bestaat deze FK niet; hij wordt hier gedeferred, niet
  -- gegokt. Kolom blijft nullable, dus dit blokkeert niets.
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
  -- CORRECTIE (NUT-SCHEMA-01C, sectie 5): created_by-FK op
  -- nutrition_supplement_definitions is HIER BEWUST NIET toegevoegd,
  -- zelfde reden als products/foods hierboven -- ook deze tabel heeft
  -- RLS select_all (gedeeld/catalog) en wordt door nutrition_supplement_
  -- logs van andere gebruikers gerefereerd (niet-CASCADE FK). Gedeferred.
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

-- GAP-S3 (dubbele meal-rij per dag/type door check-then-insert zonder
-- DB-unique) is UITDRUKKELIJK NIET opgelost in deze migratie.
-- CORRECTIE (NUT-SCHEMA-01C, blocker 1): een eerdere versie van dit
-- bestand voegde hier een UNIQUE (user_id, meal_type, occurred_at::date)
-- toe. Dat is teruggedraaid op expliciete PO-instructie: occurred_at is
-- vandaag registratietijd, geen betrouwbaar consumptietijdstip (zie de
-- Nutrition Depth Audit). Een unique-constraint op die kolom zou een
-- aanname over toekomstige NUT-TIME-01-tijdsemantiek vastbetonneren
-- vóórdat die is ontworpen. GAP-S3 blijft daarom:
--   STATUS: OPEN / DEFERRED TO NUT-TIME-01
-- Geen vervangende constraint, geen index, geen andere vorm toegevoegd.

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
-- bevestig dat dit ongewijzigd slaagt. GAP-S3 (mogelijke dubbele meal-rij
-- per dag/type) blijft bestaan en is bewust niet in deze migratie
-- opgelost -- zie GAP-S3-notitie bij STAP 2.

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- Dit bestand voegt uitsluitend toe (CREATE IF NOT EXISTS, ADD CONSTRAINT
-- IF NOT EXISTS-guard, REVOKE van nooit-gebruikte rechten). Een rollback
-- zou de negen tabellen weer op hun vorige, ongeversioneerde staat willen
-- zetten -- dat is geen zinvolle SQL-rollback maar een besluit; overleg bij
-- problemen eerst voordat er iets wordt teruggedraaid.
-- ══════════════════════════════════════════════════════════════════════════
