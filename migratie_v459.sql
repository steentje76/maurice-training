-- migratie_v459.sql — HYROX/Triathlon: race-context, segmentvolgorde, canonieke catalogus
--
-- MASTER SPRINT v4.59.0. Vastgelegde eigenaarbesluiten (v4.58.0/v4.59.0):
--   Besluit 1: race_division/race_is_official als APARTE, EXPLICIETE KOLOMMEN op
--     training_instances — NIET in training_instances.snapshot (dat is een snapshot van
--     het workoutplan bij sessiestart, een ander concept dan de race-gebeurtenis zelf).
--     Moeten later betrouwbaar querybaar zijn voor de Relationship Engine.
--   Besluit 2: GEEN total_race_time-kolom. Totale racetijd is en blijft volledig afgeleid
--     uit segment-tijdstempels (eerste start → laatste eind) — geen tweede bron van
--     waarheid. Zie ook de bevinding in het sprintrapport: de huidige cardio-tijdinvoer is
--     puur handmatig getypt (geen wall-clock-timer), dus deze aflevering bevat geen
--     schrijfpad dat al daadwerkelijk gebruikmaakt van deze berekening — dat is UI-werk
--     voor een latere sprint (v4.58.0 §18: v4.62.0).
--
-- Alle wijzigingen zijn additief en nullable. Bestaande rijen blijven NULL (geen
-- bestaande data gewijzigd), bestaande RLS-policies worden niet aangeraakt (nieuwe
-- kolommen op een tabel met rij-niveau RLS erven automatisch dezelfde bescherming).
-- Idempotent: `if not exists` / `on conflict do nothing` overal, veilig opnieuw te draaien.
-- Geen DROP, geen nieuwe tabel, geen policy-wijziging.

-- ══════════════════════════════════════════════════════════════════════════════
-- STAP 1 — race-context op training_instances (Besluit 1)
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.training_instances
  add column if not exists race_division text;

alter table public.training_instances
  add column if not exists race_is_official boolean;

-- Alleen de vier bekende divisiewaarden toestaan, NULL blijft toegestaan (geen race).
-- Idempotent via de dynamische policy-onafhankelijke aanpak: eerst droppen als hij al
-- bestaat (met een andere definitie uit een eerdere proefdraai), dan opnieuw aanmaken.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'training_instances_race_division_check'
  ) then
    alter table public.training_instances drop constraint training_instances_race_division_check;
  end if;
  alter table public.training_instances
    add constraint training_instances_race_division_check
    check (race_division is null or race_division in ('open','pro','doubles','relay'));
end $$;

comment on column public.training_instances.race_division is
  'Race-scoped (NIET profiel-scoped): Open/Pro/Doubles/Relay. NULL = geen race-context (normale training). Eén sporter kan meerdere races met verschillende divisies loggen.';
comment on column public.training_instances.race_is_official is
  'TRUE = officiële, gereglementeerde race. FALSE = trainingssimulatie. NULL = niet van toepassing. Voorkomt dat de Relationship Engine een officiële tijd vergelijkt met een thuis-getimede simulatie op niet-gekalibreerde apparatuur.';

-- ══════════════════════════════════════════════════════════════════════════════
-- STAP 2 — segmentvolgorde op sessions (v4.58.0 Besluit 7 / v4.59.0 Fase 5)
-- ══════════════════════════════════════════════════════════════════════════════
-- Geen race_id (training_instance_id vervult die rol al) en geen segment_role (de rol
-- run/station is betrouwbaar afleidbaar uit het bestaande exercise_id — zie de nieuwe
-- catalogus-ID's in STAP 3, geen dubbele opslag van wat al afleidbaar is).

alter table public.sessions
  add column if not exists segment_index integer;

comment on column public.sessions.segment_index is
  'Volgorde van dit segment binnen een race/brick (1-16 voor HYROX, 1-5 voor triathlon-brick), gegroepeerd via het bestaande training_instance_id. NULL voor elke gewone, niet-race-gebonden training — geen wijziging aan bestaand gebruik.';

-- ══════════════════════════════════════════════════════════════════════════════
-- STAP 3 — canonieke HYROX-catalogus (v4.58.0 Besluit 4, Variant A — geen nieuw type)
-- ══════════════════════════════════════════════════════════════════════════════
-- Zelfde schema als de bestaande exercises-rijen (global scope, geen wijziging aan
-- reeds bestaande exercises). SkiErg/Row/Run hergebruiken bewust dezelfde `type`-waarden
-- als de al bestaande cardio-catalogusentries (skierg/rowing) zodat CARDIO_TYPES-logica
-- ze automatisch herkent. De zes functionele stations krijgen type 'functional' — een
-- nieuwe WAARDE in het bestaande, al-flexibele type-veld (zoals 'carry' dat al is voor
-- Farmer Carry), GEEN nieuwe tabel/kolom/schema — Variant A blijft definitief.
--
-- distance/weight: GEEN nieuwe kolommen nodig. sessions.distance en sessions.weight
-- bestaan al (bevestigd via eerdere live-schema-export) en zijn al generiek genoeg voor
-- respectievelijk afgelegde afstand (sled/carry/lunges) en extern gewicht (sled/sandbag).
-- target_height (wall balls) is bewust NIET opgenomen — expliciet openstaand
-- eigenaarbesluit uit v4.58.0 §19, niet in v4.59.0 beantwoord.

insert into public.exercises (id, name, category, type, pr, sort_order, active, scope)
values
  ('hyrox_skierg',            'HYROX SkiErg',            'C', 'skierg',     null, 101, true, 'global'),
  ('hyrox_sled_push',         'HYROX Sled Push',         'C', 'functional', null, 102, true, 'global'),
  ('hyrox_sled_pull',         'HYROX Sled Pull',         'C', 'functional', null, 103, true, 'global'),
  ('hyrox_burpee_broad_jump', 'HYROX Burpee Broad Jump', 'C', 'functional', null, 104, true, 'global'),
  ('hyrox_row',               'HYROX Row',               'C', 'rowing',     null, 105, true, 'global'),
  ('hyrox_farmers_carry',     'HYROX Farmers Carry',     'C', 'functional', null, 106, true, 'global'),
  ('hyrox_sandbag_lunges',    'HYROX Sandbag Lunges',    'C', 'functional', null, 107, true, 'global'),
  ('hyrox_wall_balls',        'HYROX Wall Balls',        'C', 'functional', null, 108, true, 'global'),
  ('hyrox_run',               'HYROX Run (1km)',         'C', 'running',    null, 109, true, 'global')
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════════════════
-- STAP 4 — verificatie (leest alleen)
-- ══════════════════════════════════════════════════════════════════════════════

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'training_instances' and column_name in ('race_division','race_is_official'))
    or (table_name = 'sessions' and column_name = 'segment_index'))
order by table_name, column_name;

select id, name, category, type, sort_order
from public.exercises
where id like 'hyrox_%'
order by sort_order;
