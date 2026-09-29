-- migratie_v572.sql — F-SEC-005: least-privilege voor tabelrechten die RLS omzeilen (TRUNCATE) of DDL-achtig zijn
-- (REFERENCES, TRIGGER).
--
-- Audit (docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md, F-SEC-005): 119 tabellen in public, alle met RLS en owner
-- postgres. `authenticated` had TRUNCATE/REFERENCES/TRIGGER op 99 tabellen, `anon` op 96. TRUNCATE valt NIET onder
-- RLS: in een teruggedraaide transactie kon een authenticated- of anon-sessie een tabel volledig leegmaken, en
-- authenticated kon via een tijdelijke functie een trigger aan een applicatietabel hangen. Geen client-route
-- (PostgREST kent geen TRUNCATE/DDL, geen pg_graphql, geen dynamische SQL in aanroepbare functies) -> classificatie C.
-- Root cause: pg_default_acl voor rol postgres in schema public geeft anon/authenticated `arwdDxtm` op elke nieuwe tabel.
--
-- Wijziging (gedragsbehoudend: geen enkele TK-client of -functie gebruikt deze rechten; RI-checks en triggers draaien
-- met owner-rechten; SECURITY DEFINER-functies draaien als postgres):
--  1. TRUNCATE, REFERENCES en TRIGGER intrekken van anon, authenticated en PUBLIC op alle bestaande tabellen in public;
--  2. default privileges van rol postgres in schema public zo aanpassen dat nieuwe tabellen deze rechten niet meer erven.
-- Ongewijzigd: SELECT/INSERT/UPDATE/DELETE (begrensd door RLS), RLS, policies, service_role, owners, sequences, functies.
-- Default privileges van supabase_admin kunnen door de projectrol niet worden gewijzigd (restrisico, gedocumenteerd).
-- Idempotent.

do $$
declare rc record;
begin
  for rc in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated, public', rc.relname);
  end loop;
end $$;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated, public;
