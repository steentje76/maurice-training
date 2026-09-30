-- migratie_v575.sql — residual least-privilege closure (F-SEC-007/-008/-009; triage in
-- docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md, "Residual triage + F-SEC-006").
--
-- F-SEC-007 increment_usage(text, date, integer) en F-SEC-008 consume_credit(uuid, integer): SECURITY DEFINER,
-- auth.uid()-gebonden, EXECUTE voor authenticated sinds v522, maar zonder enige caller (frontend, Netlify,
-- databasefuncties, policies of triggers). Alleen zelfbenadeling mogelijk; onnodige client-RPC-oppervlakte (B).
-- F-SEC-009: anon/authenticated hadden UPDATE (setval) op alle 7 public sequences en via de default privileges van
-- postgres/public op elke nieuwe sequence. Alle 7 horen bij GENERATED ALWAYS AS IDENTITY-kolommen; inserts hebben geen
-- sequence-UPDATE nodig (bewezen in een teruggedraaide transactie). setval is niet via PostgREST-rpc bereikbaar (B).
--
-- Wijziging: alleen rechten. Geen functiebody/signature/owner/security/search_path-wijziging, geen sequence
-- verwijderd, geen sequencewaarde gewijzigd, USAGE/SELECT op sequences behouden, service_role ongemoeid, geen
-- wijziging aan supabase_admin-defaults. Idempotent.

revoke execute on function public.increment_usage(text, date, integer) from public, anon, authenticated;
revoke execute on function public.consume_credit(uuid, integer) from public, anon, authenticated;

do $$
declare rc record;
begin
  for rc in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
  loop
    execute format('revoke update on sequence public.%I from public, anon, authenticated', rc.relname);
  end loop;
end $$;

alter default privileges for role postgres in schema public
  revoke update on sequences from anon, authenticated, public;
