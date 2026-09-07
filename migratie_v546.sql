-- migratie_v546.sql
-- NUT-TIME-01 — canonieke, werkelijke consumptietijd (consumed_at).
--
-- AANLEIDING
-- occurred_at (op nutrition_meals/nutrition_hydration_entries/
-- nutrition_supplement_logs/nutrition_entries) betekent vandaag overal
-- REGISTRATIEMOMENT: de app schrijft er altijd `new Date().toISOString()`
-- in, nooit een door de gebruiker gekozen tijdstip (Nutrition Depth Audit).
-- Dit bestand voegt een apart consumed_at toe: het moment waarop iets
-- daadwerkelijk is gegeten/gedronken/ingenomen, door de gebruiker zelf
-- in te stellen (default: nu), zonder occurred_at te herdefiniëren of
-- bestaande rijen aan te nemen als "eigenlijk toch consumed_at".
--
-- SCOPE (bewust minimaal, na expliciete PO-instructie)
-- - Vier tabellen krijgen consumed_at: nutrition_meals,
--   nutrition_hydration_entries, nutrition_supplement_logs,
--   nutrition_entries. Dit zijn de tabellen waar een "wanneer" zinvol op
--   RIJNIVEAU hoort.
-- - nutrition_meal_items krijgt GEEN eigen consumed_at: een item erft het
--   moment van zijn nutrition_meals-rij (meal-niveau is voldoende, geen
--   item-niveau-tijdmodel, geen redesign van de bestaande snapshot-
--   architectuur).
-- - Geen meal-uniqueness op datum (GAP-S3 blijft expliciet: OPEN /
--   DEFERRED TO NUT-TIME-01 is hiermee juist NIET afgesloten voor de
--   consumed_at-kolom zelf -- zie de aparte GAP-S3-notitie onderaan).
-- - Geen relationship engine, geen caffeine/micronutriënten, geen
--   supplement-evidence, geen OFF-koppeling, geen bredere UX-redesign.
--
-- LEGACY-DATA-BELEID (expliciet, geen gok)
-- Op het moment van schrijven staan alle vier tabellen op 0 rijen (live
-- geverifieerd, zie STAP 0). Er is dus NIETS te backfillen. Voor het geval
-- dit bestand ooit op een niet-lege tabel wordt toegepast (bv. een andere
-- omgeving), is de backfill-regel hieronder toch expliciet en behoudend
-- geschreven: elke rij die al een consumed_at heeft blijft ONAANGEROERD;
-- een rij zonder consumed_at krijgt occurred_at overgenomen MET een
-- expliciete provenance-markering LEGACY_OCCURRED_AT_FALLBACK -- nooit
-- stilzwijgend gepromoveerd tot KNOWN TRUE CONSUMPTION TIME. Nieuwe,
-- door de gebruiker ingevoerde rijen krijgen USER_CONFIRMED.
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor.

-- ── STAP 0 — vóórmeting ──────────────────────────────────────────────────
select 'nutrition_meals' as tabel, count(*) as rows, count(*) filter (where consumed_at is not null) as heeft_al_consumed_at from public.nutrition_meals
union all
select 'nutrition_hydration_entries', count(*), count(*) filter (where consumed_at is not null) from public.nutrition_hydration_entries
union all
select 'nutrition_supplement_logs', count(*), count(*) filter (where consumed_at is not null) from public.nutrition_supplement_logs
union all
select 'nutrition_entries', count(*), count(*) filter (where consumed_at is not null) from public.nutrition_entries;
-- Verwacht op het moment van draaien: rows = 0 voor alle vier (dus ook
-- heeft_al_consumed_at = 0) -- niets om te backfillen.

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 1 — kolommen toevoegen (idempotent, additief, niets verwijderd)
-- ══════════════════════════════════════════════════════════════════════════
begin;

alter table public.nutrition_meals
  add column if not exists consumed_at timestamptz,
  add column if not exists consumed_at_source text
    check (consumed_at_source is null or consumed_at_source in ('user_confirmed','legacy_occurred_at_fallback'));

alter table public.nutrition_hydration_entries
  add column if not exists consumed_at timestamptz,
  add column if not exists consumed_at_source text
    check (consumed_at_source is null or consumed_at_source in ('user_confirmed','legacy_occurred_at_fallback'));

alter table public.nutrition_supplement_logs
  add column if not exists consumed_at timestamptz,
  add column if not exists consumed_at_source text
    check (consumed_at_source is null or consumed_at_source in ('user_confirmed','legacy_occurred_at_fallback'));

alter table public.nutrition_entries
  add column if not exists consumed_at timestamptz,
  add column if not exists consumed_at_source text
    check (consumed_at_source is null or consumed_at_source in ('user_confirmed','legacy_occurred_at_fallback'));

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 2 — behoudende backfill: raakt UITSLUITEND rijen zonder consumed_at.
-- Op vandaag 0 rijen per tabel, dus dit is nu een no-op; idempotent en
-- veilig als dit bestand later nogmaals draait of ooit op gevulde data.
-- ══════════════════════════════════════════════════════════════════════════
begin;

update public.nutrition_meals
  set consumed_at = occurred_at, consumed_at_source = 'legacy_occurred_at_fallback'
  where consumed_at is null;

update public.nutrition_hydration_entries
  set consumed_at = occurred_at, consumed_at_source = 'legacy_occurred_at_fallback'
  where consumed_at is null;

update public.nutrition_supplement_logs
  set consumed_at = occurred_at, consumed_at_source = 'legacy_occurred_at_fallback'
  where consumed_at is null;

update public.nutrition_entries
  set consumed_at = occurred_at, consumed_at_source = 'legacy_occurred_at_fallback'
  where consumed_at is null;

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 3 — NOT NULL pas ná de backfill (garandeert dat geen enkele rij
-- zonder consumed_at overblijft; veilig want STAP 2 dekt elke rij).
-- ══════════════════════════════════════════════════════════════════════════
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='nutrition_meals' and column_name='consumed_at' and is_nullable='NO'
  ) then
    alter table public.nutrition_meals alter column consumed_at set not null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='nutrition_hydration_entries' and column_name='consumed_at' and is_nullable='NO'
  ) then
    alter table public.nutrition_hydration_entries alter column consumed_at set not null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='nutrition_supplement_logs' and column_name='consumed_at' and is_nullable='NO'
  ) then
    alter table public.nutrition_supplement_logs alter column consumed_at set not null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='nutrition_entries' and column_name='consumed_at' and is_nullable='NO'
  ) then
    alter table public.nutrition_entries alter column consumed_at set not null;
  end if;
end $$;

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- STAP 4 — indexes op consumed_at (vervangt/vult aan naast de bestaande
-- occurred_at-indexes; occurred_at-indexes blijven ongewijzigd staan).
-- ══════════════════════════════════════════════════════════════════════════
begin;
create index if not exists idx_nutrition_meals_user_consumed on public.nutrition_meals(user_id, consumed_at);
create index if not exists idx_nutrition_hydration_entries_user_consumed on public.nutrition_hydration_entries(user_id, consumed_at);
create index if not exists idx_nutrition_supplement_logs_user_consumed on public.nutrition_supplement_logs(user_id, consumed_at);
commit;
-- (nutrition_entries had al idx_nutrition_entries_user_occurred; een losse
-- consumed_at-index is daar vooralsnog niet nodig gezien het huidige
-- queryvolume -- toevoegen zodra dat wijzigt, geen premature index.)

-- ── STAP 5 — nameting ────────────────────────────────────────────────────
select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema='public' and column_name in ('consumed_at','consumed_at_source')
  and table_name in ('nutrition_meals','nutrition_hydration_entries','nutrition_supplement_logs','nutrition_entries')
order by table_name, column_name;

-- ══════════════════════════════════════════════════════════════════════════
-- OPEN GAP, BEWUST NIET HIER OPGELOST
-- GAP-S3 (mogelijke dubbele nutrition_meals-rij per dag/type door
-- check-then-insert zonder DB-unique) blijft OPEN. consumed_at is nu wel
-- de canonieke tijd, maar een unique constraint daarop zou nog steeds een
-- productbeslissing vereisen los van deze migratie (welke granulariteit,
-- welk gedrag bij conflict) -- niet stilzwijgend meegenomen.
-- ══════════════════════════════════════════════════════════════════════════
--
-- ROLLBACK
--   begin;
--     alter table public.nutrition_meals drop column if exists consumed_at, drop column if exists consumed_at_source;
--     alter table public.nutrition_hydration_entries drop column if exists consumed_at, drop column if exists consumed_at_source;
--     alter table public.nutrition_supplement_logs drop column if exists consumed_at, drop column if exists consumed_at_source;
--     alter table public.nutrition_entries drop column if exists consumed_at, drop column if exists consumed_at_source;
--   commit;
-- ══════════════════════════════════════════════════════════════════════════
