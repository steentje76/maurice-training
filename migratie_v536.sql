-- migratie_v536.sql
-- B9-09 -- Nutrition Foundation.
--
-- SCOPEBESLISSING (na existing-state audit + benchmark): één, duidelijke
-- event-tabel i.p.v. een gigantische "nutrition"-tabel EN i.p.v. een
-- aparte hydration_logs-tabel (zou taxonomie-explosie zijn, sectie 18 --
-- hydratatie is gewoon een entry_type met uitsluitend fluid_ml ingevuld).
--
-- MINIMALE V1-DATASET (per veld gemotiveerd):
-- - occurred_at: wanneer het gebeurde (gebruikersinvoer, niet created_at).
-- - entry_type: kleinst mogelijke, niet-overlappende taxonomie.
-- - timing_context: LOSSTAAND van entry_type (een meal kan pre_training
--   zijn) -- voorkomt een combinatorische explosie van entry_types.
-- - source_type: uitsluitend 'user_entered' toegestaan in B9-09 (geen
--   provider verzonnen die nog niet bestaat, sectie 15), maar het veld
--   bestaat al zodat een latere import geen schema-chaos vereist.
-- - energy_kcal/protein_g/carbohydrate_g/fat_g/fluid_ml: allemaal
--   NULLABLE (missing != zero, sectie 14) -- 0 is een expliciete,
--   ingevoerde waarde, NULL is "niet ingevoerd/onbekend". Brede,
--   technische sanity-checks (geen medische norm, sectie 24).
-- - training_instance_id/activity_id: optionele koppeling aan
--   bestaande, canonieke trainingsdata (sectie 17) -- ON DELETE SET
--   NULL (niet CASCADE): een verwijderde training mag de nutrition-
--   entry zelf niet laten verdwijnen, alleen de koppeling.
-- - note: vrije tekst, lengte begrensd, XSS-safe rendering in de UI
--   (nooit trusted HTML), NOOIT naar AI gestuurd (sectie 25/31).
--
-- BEWUST NIET IN DEZE MIGRATIE (zie het rapport): geen voedingsmiddelen-
-- database, geen caloriedoel/macro-target-kolommen, geen allergie-/
-- dieetvoorkeurenveld (data-minimalisatie, sectie 19 -- geen directe
-- B9-09-productwaarde vastgesteld).

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  entry_type text not null check (entry_type in ('meal','snack','hydration','other')),
  timing_context text check (timing_context in ('pre_training','during_training','post_training')),
  source_type text not null default 'user_entered' check (source_type = 'user_entered'),
  energy_kcal numeric check (energy_kcal >= 0 and energy_kcal < 20000),
  protein_g numeric check (protein_g >= 0 and protein_g < 1000),
  carbohydrate_g numeric check (carbohydrate_g >= 0 and carbohydrate_g < 2000),
  fat_g numeric check (fat_g >= 0 and fat_g < 1000),
  fluid_ml numeric check (fluid_ml >= 0 and fluid_ml < 20000),
  training_instance_id uuid references public.training_instances(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nutrition_entries_user_occurred on public.nutrition_entries(user_id, occurred_at);

alter table public.nutrition_entries enable row level security;

-- Default: uitsluitend eigen data (sectie 23). Geen social/coach/gym/
-- research-policy -- die bestaan bewust niet, dus 0 automatische
-- exposure buiten de eigenaar zelf.
create policy nutrition_entries_select_own on public.nutrition_entries
  for select using (user_id = auth.uid());
create policy nutrition_entries_insert_own on public.nutrition_entries
  for insert with check (user_id = auth.uid());
create policy nutrition_entries_update_own on public.nutrition_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nutrition_entries_delete_own on public.nutrition_entries
  for delete using (user_id = auth.uid());
