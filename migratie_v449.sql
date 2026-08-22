-- ══════════════════════════════════════════════════════════════════════════════
-- migratie_v449.sql — Trainingsduur per sessie vastleggen (duration_s)
--
-- AANLEIDING
-- docs/RELATIONSHIP_AUDIT.md §"Trainingsduur" en docs/CURRENT_ROADMAP.md (POST-V1, punt 1)
-- noemen dit al maanden als "grootste opbrengst per eenheid werk". De trainingstimer loopt
-- al in de app (currentWorkoutElapsedMs), maar de verstreken tijd werd bij het afronden
-- nergens weggeschreven. Gevolg:
--
--   1. AthleteCore.unifiedLoad() geeft bewust {beschikbaar:false, ontbreekt:['duur_per_sessie']}
--      terug zodra een dag meer dan één modaliteit heeft — kilo's en meters mogen niet bij
--      elkaar opgeteld worden. Zonder duur bestaat er geen eenheid die dat wél mag.
--   2. 105 van de 187 kenbare relaties in de Relationship Engine kunnen niet berekend worden.
--
-- Met een duur per sessie is Foster's session-RPE (sRPE = sessie-RPE × duur in minuten)
-- berekenbaar. Dat levert een modaliteit-onafhankelijke belasting in AU (arbitrary units),
-- de enige wetenschappelijk gangbare manier om kracht en cardio in één reeks te zetten.
--
-- WAT DEZE MIGRATIE DOET
-- Eén nieuwe, NULLABLE kolom op public.sessions:
--   duration_s  integer  — duur van de HELE trainingssessie waar deze rij toe behoort,
--                          in hele seconden. Alle rijen van dezelfde sessie (zelfde
--                          user_id + date + training_type) krijgen dezelfde waarde.
--                          NULL = niet gemeten (alle bestaande rijen, en elke rij die
--                          buiten de trainingsflow wordt aangemaakt).
--
-- WAAROM PER RIJ EN NIET IN EEN APARTE TABEL
-- `sessions` bevat één rij per oefening. Een aparte sessie-tabel zou een nieuwe entiteit,
-- nieuwe RLS-policies en een migratiepad voor 112 bestaande sessies vragen. De audit
-- (RELATIONSHIP_AUDIT.md) schrijft expliciet "één kolom duration_s" voor. De leeslaag
-- neemt per (datum, training_type) het maximum, zodat een gedeeltelijk geslaagde write
-- nooit een te lage duur oplevert.
--
-- NIET-DESTRUCTIEF
-- Geen bestaande kolom, rij, policy, index of functie wordt gewijzigd. De kolom is
-- nullable zonder default: bestaande rijen blijven exact zoals ze zijn en er wordt geen
-- enkele waarde verzonnen voor sessies uit het verleden. RLS op `sessions` werkt op
-- rijniveau en wordt door een extra kolom niet geraakt.
--
-- ACHTERWAARTS COMPATIBEL
-- Oudere app-versies die deze kolom niet kennen blijven werken: PostgREST negeert een
-- kolom die niet in de body zit, en `select=*` levert simpelweg een extra veld dat de
-- oude client niet gebruikt.
--
-- ROLLBACK
--   alter table public.sessions drop column if exists duration_s;
-- ══════════════════════════════════════════════════════════════════════════════

-- STAP 1 — de kolom
alter table public.sessions
  add column if not exists duration_s integer;

-- STAP 2 — plausibiliteitsgrens. Een trainingssessie duurt langer dan 0 seconden en
-- korter dan 24 uur. De check laat NULL expliciet toe (niet gemeten is geen fout).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_duration_s_range'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_duration_s_range
      check (duration_s is null or (duration_s > 0 and duration_s <= 86400));
  end if;
end $$;

-- STAP 3 — documentatie in de database zelf, zodat de betekenis niet alleen in een
-- markdown-bestand staat.
comment on column public.sessions.duration_s is
  'Duur van de hele trainingssessie waar deze rij toe behoort, in hele seconden. Alle rijen van dezelfde sessie (user_id + date + training_type) dragen dezelfde waarde. NULL = niet gemeten. Bron: de trainingstimer in de app, weggeschreven bij het afronden van de sessie.';

-- STAP 4 — verificatie (leest alleen)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sessions' and column_name = 'duration_s';
