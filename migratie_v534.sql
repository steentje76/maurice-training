-- migratie_v534.sql
-- B9-03 -- Running Intelligence: minimale schema-uitbreiding.
--
-- rpe: optioneel, 0-10 Borg CR10-schaal, laat Running hergebruik maken
-- van de al bestaande, canonieke TrainingLoadCore.sessionLoadSRPE()
-- (Foster-methode) i.p.v. een tweede load-engine te bouwen. Live
-- geverifieerd: een ongeldige waarde (>10) wordt correct geweigerd
-- door de check-constraint.
--
-- is_max_effort: expliciete, opt-in markering (sectie 11) -- lost het
-- bestaande probleem op "hoe weet het systeem dat een prestatie een
-- genuine maximal effort was?" voor Critical Speed-voeding. Nooit
-- automatisch aangenomen, altijd een bewuste keuze van de gebruiker
-- na afloop van de activiteit.
--
-- Geen nieuwe RLS-policies nodig: de bestaande activities-policies
-- (B9-01) dekken deze nieuwe kolommen al volledig af (RLS werkt op
-- rijniveau, niet kolomniveau).
alter table public.activities
  add column if not exists rpe numeric check (rpe >= 0 and rpe <= 10),
  add column if not exists is_max_effort boolean not null default false;
