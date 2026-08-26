-- ============================================================================
-- ARCHITECTUURHARDENING (v4.94.0) — NOT NULL op vier child-FK's zonder bewijs
-- van nullable-gebruik
-- ============================================================================
-- Reeds uitgevoerd op de live database, geverifieerd (alle vijf kolommen
-- bevestigd is_nullable='NO' na uitvoering).
--
-- BEVINDING: vier tabellen hadden een nullable FK naar hun logische "ouder",
-- terwijl 100% van de bestaande rijen die FK al altijd invulde (0 NULL-waarden
-- over in totaal 276 rijen verdeeld over de vier tabellen). Dit is geen
-- bewuste architectuurkeuze (in tegenstelling tot bv. sessions.training_instance_id,
-- dat WEL legitiem nullable is voor niet-race trainingen) maar een ontwerp-
-- omissie: een "exercise binnen een trainingsblok/-plan" zonder dat blok/plan
-- is een betekenisloze wees-rij.
--
-- BEWUST NIET AANGESCHERPT:
-- - sessions.exercise_id (116 rijen, ook 0 nulls) -- te centraal/breed gebruikt
--   (talrijke schrijfpaden door de hele 24000+ regels code) om zonder een
--   uitputtende her-audit van elk pad veilig te bevestigen dat GEEN enkel
--   legitiem pad ooit een lege exercise_id zou kunnen schrijven.
-- - race_segments.exercise_id (2 rijen) -- bewust nullable ontworpen in
--   migratie_v491.sql (eigen eerdere architectuurbeslissing), te weinig rijen
--   als aanvullend bewijs om die eerdere beslissing nu te herzien.
-- - organizations/teams en overige nog volledig lege tabellen -- nog geen
--   enkele rij, dus geen bewijs beschikbaar; de white-label/commercial-
--   featureset is nog niet gebouwd (zie CURRENT_ROADMAP.md, FUTURE-sectie).
--
-- Puur restrictief op toekomstige writes, geen RLS/toegangscontrolewijziging,
-- geen enkele bestaande rij overtreedt de nieuwe constraint (geverifieerd
-- vóór uitvoering: 0 NULL-waarden in alle vier kolommen).
-- ============================================================================

alter table public.custom_training_exercises alter column custom_training_id set not null;
alter table public.program_block_exercises alter column program_block_id set not null;
alter table public.program_block_exercises alter column exercise_id set not null;
alter table public.program_blocks alter column program_id set not null;
alter table public.training_exercises alter column exercise_id set not null;
