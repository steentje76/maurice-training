-- Migratie v336 — Sprint 2.5 bugfix
-- Aanleiding: live console-fout op maurice-art.netlify.app tijdens Sprint 2-onboarding:
--   sbUpsert atleet_profiel 400 — "Could not find the 'doel' column of 'atleet_profiel'
--   in the schema cache" (PGRST204)
-- Oorzaak: de Sprint 2-onboarding-wizard (index.html, obFinish()) slaat een nieuw
-- atleet.doel-veld op via sbUpsert('atleet_profiel', ...), maar de bijbehorende
-- kolom is nooit als migratie aangemaakt. Meerdere keren opgetreden in Maurice's
-- eigen testsessie (device-lokaal is de waarde wel bewaard, Supabase-sync faalde
-- stil op de achtergrond).
-- Idempotent, backwards compatible (nullable, geen default nodig op bestaande rijen).

ALTER TABLE public.atleet_profiel
  ADD COLUMN IF NOT EXISTS doel text;

COMMENT ON COLUMN public.atleet_profiel.doel IS
  'Minimaal doelveld uit de Sprint 2-onboarding (kracht/conditie/afvallen/prestatie/algemeen) — placeholder vooruitlopend op het volwaardige Doelen-scherm (Handbook H6, 7.1).';
