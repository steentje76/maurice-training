-- migratie_v576.sql — F-SEC-010: default function EXECUTE hardening (toekomstige functies).
--
-- Bevinding (docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md, residual triage): een nieuwe functie die door `postgres`
-- in public wordt aangemaakt kreeg automatisch EXECUTE voor PUBLIC, anon, authenticated en service_role
-- (PostgreSQL-standaard PUBLIC EXECUTE + default ACL postgres/public `anon=X, authenticated=X`). Zo werd een nieuwe
-- SECURITY DEFINER-functie ongemerkt door anon aanroepbaar (dat was de oorzaak van F-SEC-004). Huidige blootstelling:
-- geen (alle 63 postgres-functies in public hebben expliciete ACL's, 0 anon-uitvoerbaar); dit is future drift.
--
-- Wijziging (alleen default privileges voor TOEKOMSTIGE functies van rol postgres):
--  1. de ingebouwde PUBLIC EXECUTE-default voor postgres-functies intrekken (kan alleen globaal; per-schema kan een
--     globale default niet worden ingetrokken);
--  2. in schema `extensions` PUBLIC EXECUTE per schema terugzetten, zodat extensiefuncties die postgres later
--     aanmaakt zich gedragen zoals nu (49 bestaande extensiefuncties van postgres hebben PUBLIC EXECUTE);
--  3. in schema public anon en authenticated uit de default halen; service_role blijft.
-- Gevolg voor migraties: een nieuwe functie die door clients of in een RLS-policy wordt gebruikt, heeft een
-- expliciete `grant execute ... to authenticated` nodig (trigger-functies niet: triggers vuren zonder EXECUTE van
-- de aanroeper). Afgedwongen door de CI-guard tools/check-function-grants.js.
-- Niet gewijzigd: bestaande functies, functiebodies, supabase_admin-defaults, andere schema's, tabellen, sequences.

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema extensions grant execute on functions to public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
