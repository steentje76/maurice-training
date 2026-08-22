-- ============================================================================
-- MASTER SPRINT v4.76.0 — RACE CONTEXT MIGRATIE (HYROX)
-- (v4.77.0-update: Adaptive CHECK-constraint + 13 canonieke waarden toegevoegd
-- aan het einde van dit bestand, zie sectie "v4.77.0 — ADAPTIVE CHECK-CONSTRAINT"
-- hieronder. Deze migratie is nog steeds NIET op Supabase uitgevoerd.)
-- ============================================================================
-- Additief. Geen enkele bestaande kolom gewijzigd of verwijderd.
-- training_instances.race_division en .race_is_official (v4.59.0) blijven
-- ONGEWIJZIGD bestaan voor backward compatibility met bestaande queries/rapportage.
--
-- Bronverificatie: v4.73.0 (initiële audit), v4.74.0 (contractontwerp), v4.74.1 en
-- v4.74.2 (dedicated bronverificatie, uitsluitend hyrox.com-rulebooks — geen blogs).
--
-- v4.76.0 STOP-PUNT — INMIDDELS OPGELOST IN v4.77.0:
-- race_adaptive_class kreeg in v4.76.0 bewust GEEN CHECK-constraint. De toen
-- beschikbare bronfragmenten leverden 9 classificatienamen op, terwijl de
-- rulebook zelf spreekt van "13 Adaptive divisions" — die 9-versus-13-relatie
-- kon niet worden gereconstrueerd uit fragmenten alleen. In v4.77.0 is het
-- VOLLEDIGE officiële Adaptive Rulebook 26/27 rechtstreeks geraadpleegd
-- (hyrox.com/maintain.hyrox.com, het complete PDF-document, niet slechts
-- zoekfragmenten). Sectie 5.1 "HYROX Adaptive Divisions" somt exact 13 namen
-- op: de eerdere lijst van 9 was zelf onvolledig (Lower Limb/Upper Limb waren
-- niet gesplitst in Major/Minor, Neurological miste "Moderate", Vision en
-- D/deaf waren ten onrechte samengevoegd). Zie de CHECK-constraint onderaan
-- dit bestand voor de exacte, nu bronbevestigde 13 waarden.
-- ============================================================================


alter table public.training_instances
  add column if not exists race_format text;

alter table public.training_instances
  add column if not exists race_tier text;

alter table public.training_instances
  add column if not exists race_gender text;

alter table public.training_instances
  add column if not exists race_relay_age_category text;

alter table public.training_instances
  add column if not exists race_relay_division text;

alter table public.training_instances
  add column if not exists race_adaptive_class text;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'training_instances_race_format_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_format_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_format_check
    check (race_format is null or race_format in ('single','doubles','relay','adaptive'));
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'training_instances_race_tier_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_tier_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_tier_check
    check (race_tier is null or race_tier in ('open','pro'));
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'training_instances_race_gender_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_gender_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_gender_check
    check (race_gender is null or race_gender in ('male','female','mixed'));
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'training_instances_race_relay_age_category_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_relay_age_category_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_relay_age_category_check
    check (race_relay_age_category is null or race_relay_age_category in ('under_40','40_plus'));
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'training_instances_race_relay_division_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_relay_division_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_relay_division_check
    check (race_relay_division is null or race_relay_division in ('men','women','mixed'));
end $$;

comment on column public.training_instances.race_format is
  'v4.76.0 -- HYROX race-format: single/doubles/relay/adaptive. NULL bij trainingen zonder race-context, of bij oude records van vóór dit veld bestond (in dat geval wordt format op leesniveau afgeleid uit het legacy race_division-veld, nooit in de database zelf teruggeschreven).';

comment on column public.training_instances.race_tier is
  'v4.76.0 -- open/pro. Uitsluitend relevant bij format=single of format=doubles. NULL betekent UNKNOWN bij die formats, of NOT_APPLICABLE bij format=relay/adaptive -- het onderscheid wordt op leesniveau bepaald aan de hand van race_format, nooit als aparte databasewaarde opgeslagen.';

comment on column public.training_instances.race_gender is
  'v4.76.0 -- male/female (single) of male/female/mixed (doubles). NULL = UNKNOWN bij single/doubles, NOT_APPLICABLE bij format=relay (Relay heeft een eigen race_relay_division-veld in plaats hiervan).';

comment on column public.training_instances.race_relay_age_category is
  'v4.76.0 -- under_40/40_plus, uitsluitend bij format=relay (bronbevestigd: hyrox.com Relay Rulebook 25/26 en 26/27, sectie 4.2, o.b.v. gemiddelde leeftijd van de vier teamleden). NULL = UNKNOWN.';

comment on column public.training_instances.race_relay_division is
  'v4.76.0 -- men/women/mixed, uitsluitend bij format=relay (HYROX noemt dit zelf "division" voor Relay; bronbevestigd hyrox.com Relay Rulebook 26/27, secties 4.1 en 5.1). NULL = UNKNOWN.';

comment on column public.training_instances.race_adaptive_class is
  'v4.77.0 -- 13 bronbevestigde HYROX Adaptive-classificaties (hyrox.com Adaptive Rulebook 26/27, sectie 5.1, volledig PDF-brondocument geraadpleegd, niet slechts fragmenten). Uitsluitend relevant bij format=adaptive. NULL = UNKNOWN bij dat format, NOT_APPLICABLE bij elk ander format (bepaald op leesniveau).';

-- ============================================================================
-- v4.77.0 — ADAPTIVE CHECK-CONSTRAINT (aanvulling op deze zelfde, nog niet
-- uitgevoerde migratie). De 9-versus-13-onduidelijkheid uit v4.74.1/v4.74.2/
-- v4.76.0 is opgelost door het VOLLEDIGE officiële Adaptive Rulebook 26/27
-- rechtstreeks te raadplegen (hyrox.com/maintain.hyrox.com), niet slechts
-- zoekfragmenten. Sectie 5.1 "HYROX Adaptive Divisions" somt exact 13 namen op:
-- Lower Limb Major/Minor (2), Upper Limb Major/Minor (2), Short Stature (1),
-- Vision Impairment (1), D/deaf or Hard of Hearing (1), Neurological Major/
-- Moderate/Minor (3), Seated With/Without Hip Function/Without Core Function
-- (3) = 13. De eerdere lijst van 9 was zelf onvolledig (Lower Limb en Upper
-- Limb waren niet gesplitst in Major/Minor, Neurological miste "Moderate",
-- Vision en D/deaf waren ten onrechte samengevoegd).
-- ============================================================================

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'training_instances_race_adaptive_class_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_adaptive_class_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_adaptive_class_check
    check (race_adaptive_class is null or race_adaptive_class in (
      'lower_limb_major','lower_limb_minor',
      'upper_limb_major','upper_limb_minor',
      'short_stature_impairment',
      'vision_impairment',
      'deaf_or_hard_of_hearing',
      'neurological_major','neurological_moderate','neurological_minor',
      'seated_with_hip_function','seated_without_hip_function','seated_without_core_function'
    ));
end $$;

