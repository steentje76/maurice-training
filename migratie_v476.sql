-- ============================================================================
-- MASTER SPRINT v4.76.0 — RACE CONTEXT MIGRATIE (HYROX)
-- ============================================================================
-- Additief. Geen enkele bestaande kolom gewijzigd of verwijderd.
-- training_instances.race_division en .race_is_official (v4.59.0) blijven
-- ONGEWIJZIGD bestaan voor backward compatibility met bestaande queries/rapportage.
--
-- Bronverificatie: v4.73.0 (initiële audit), v4.74.0 (contractontwerp), v4.74.1 en
-- v4.74.2 (dedicated bronverificatie, uitsluitend hyrox.com-rulebooks — geen blogs).
--
-- STOP-PUNT (expliciet, conform opdracht — niet gegokt):
-- race_adaptive_class krijgt BEWUST GEEN CHECK-constraint. De bronverificatie
-- leverde 9 met zekerheid bevestigde classificatienamen op (Lower Limb, Upper Limb,
-- Short Stature, Visual/Hearing Impairment, Neurological Major, Neurological Minor,
-- Seated With Hip Function, Seated Without Hip Function, Seated Without Core
-- Function), terwijl de officiële rulebook zelf spreekt van "13 Adaptive divisions"
-- (vermoedelijk classificatie x gender, niet 13 losse classificatiewaarden). Deze
-- 9-versus-13-relatie kon niet met volledige zekerheid worden gereconstrueerd uit de
-- beschikbare bronfragmenten. Conform expliciete instructie: NIET gegokt op de
-- exacte constraint-waarden. De kolom bestaat (additief, vrij tekstveld, geen
-- CHECK), maar wordt deze sprint NIET aangeboden in de UI/write-path — Adaptive
-- blijft dus, net als vandaag, niet selecteerbaar. Een vervolgsprint met een
-- dedicated Adaptive-classificatie-bronverificatie kan de CHECK-constraint alsnog
-- toevoegen zonder deze kolom opnieuw te hoeven aanmaken.
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
  'v4.76.0 -- BEWUST GEEN CHECK-constraint (zie uitleg bovenaan dit bestand). Niet gebruikt door de huidige UI/write-path. Vrij tekstveld in afwachting van een dedicated Adaptive-classificatie-bronverificatie.';
