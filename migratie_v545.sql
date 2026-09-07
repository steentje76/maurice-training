-- migratie_v545.sql
-- NUT-RLS-01 — nutrition_meal_items mist een UPDATE-policy.
--
-- AANLEIDING
-- Bevestigd tijdens de post-migratie-verificatie van v544 (NUT-SCHEMA-01D):
-- nutrition_meal_items heeft RLS aan, authenticated heeft de tabel-brede
-- UPDATE-grant, maar er bestaat GEEN UPDATE-policy. Zonder een permissive
-- policy voor een specifiek command is Postgres RLS default-deny: de
-- bestaande app-aanroep (sbPatchQ('nutrition_meal_items', ...), gebruikt
-- om quantity/quantity_unit/nutrient_snapshot van een bestaand item te
-- bewerken) raakt daardoor stil 0 rijen -- geen foutmelding, de wijziging
-- wordt gewoon niet opgeslagen.
--
-- SCOPE (bewust minimaal)
-- - Precies één policy: UPDATE op nutrition_meal_items.
-- - Zelfde, al bestaande ownership-model als select/insert/delete op deze
--   tabel (nutrition_meal_items.meal_id -> nutrition_meals.id ->
--   nutrition_meals.user_id = auth.uid()). Geen nieuw ownership-concept.
-- - Geen tabelwijziging, geen nieuwe kolom, geen databehandeling.
-- - Geen enkele andere Nutrition-policy aangeraakt.
--
-- WAAROM WITH CHECK HETZELFDE IS ALS USING
-- USING bepaalt welke bestaande rijen een gebruiker mag zien/wijzigen.
-- WITH CHECK bepaalt of de rij, NA de wijziging, nog voldoet aan de
-- voorwaarde. Door WITH CHECK exact dezelfde ownership-check te geven,
-- kan een gebruiker een eigen item niet naar een meal_id van een andere
-- gebruiker "verplaatsen" (UPDATE ... SET meal_id = <andermans-meal>) --
-- die nieuwe meal_id zou de EXISTS-check laten falen omdat
-- nutrition_meals.user_id daar niet gelijk is aan auth.uid(), dus de
-- update wordt geweigerd in plaats van de rij te laten "overlopen" naar
-- een andere gebruiker.
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor.

-- ── STAP 0 — vóórmeting ──────────────────────────────────────────────────
select policyname, cmd from pg_policies
where schemaname='public' and tablename='nutrition_meal_items'
order by cmd, policyname;
-- Verwacht: uitsluitend nmi_select_own (SELECT), nmi_insert_own (INSERT),
-- nmi_delete_own (DELETE). Geen UPDATE-rij.

-- ── STAP 1 — de policy ───────────────────────────────────────────────────
begin;

drop policy if exists nmi_update_own on public.nutrition_meal_items;
create policy nmi_update_own on public.nutrition_meal_items
  for update
  using (
    exists (
      select 1 from public.nutrition_meals m
      where m.id = nutrition_meal_items.meal_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.nutrition_meals m
      where m.id = nutrition_meal_items.meal_id
        and m.user_id = auth.uid()
    )
  );

commit;

-- ── STAP 2 — nameting ────────────────────────────────────────────────────
select policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='nutrition_meal_items'
order by cmd, policyname;
-- Verwacht: nu vier policies (select/insert/update/delete), select/
-- insert/delete ongewijzigd t.o.v. de vóórmeting, plus de nieuwe
-- nmi_update_own met identieke USING/WITH CHECK.

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK
--   drop policy if exists nmi_update_own on public.nutrition_meal_items;
-- ══════════════════════════════════════════════════════════════════════════
