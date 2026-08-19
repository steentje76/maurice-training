-- ══════════════════════════════════════════════════════════════════════════════
-- migratie_v447.sql — Security hardening van de trigger-functies
--
-- AANLEIDING
-- Bij de controle van 19 augustus 2026 bleek dat ALLE tien bestaande migraties correct
-- zijn uitgevoerd. Wat ontbrak was SQL die nooit is geschreven: de Supabase security
-- advisor meldt twee reële zwakheden op de acht SECURITY DEFINER-functies.
--
--  1. function_search_path_mutable (7x WARN)
--     Geen enkele functie zet een vaste search_path. Een SECURITY DEFINER-functie draait
--     met de rechten van de eigenaar; zonder vaste search_path kan een aanroeper een eigen
--     schema vóór 'public' zetten en zo een eigen tabel of functie laten aanroepen met
--     verhoogde rechten. Dit is het klassieke privilege-escalatiepad in Postgres.
--
--  2. anon/authenticated_security_definer_function_executable (14x WARN)
--     Alle acht functies zijn aanroepbaar als RPC via /rest/v1/rpc/<naam>, ook door
--     niet-ingelogde bezoekers. Ze zijn daar nooit voor bedoeld.
--
-- WAAROM REVOKE VEILIG IS
-- Geverifieerd op 19 augustus 2026: alle acht functies worden UITSLUITEND als trigger
-- gebruikt (set_user_id_from_auth alleen al op 17 tabellen). Een trigger voert zijn
-- functie uit namens de tabel, niet via de EXECUTE-grant van de aanroepende rol. Het
-- intrekken van EXECUTE voor anon/authenticated raakt de triggers dus niet — het sluit
-- alleen de RPC-ingang die niemand hoort te gebruiken.
--
-- NIET-DESTRUCTIEF
-- Geen data, geen tabel, geen kolom en geen policy wordt gewijzigd. Alleen twee
-- eigenschappen van bestaande functies. Volledig terug te draaien (zie ROLLBACK).
--
-- HANDMATIG UITVOEREN in de Supabase SQL-editor. Draai stap 0 apart en bewaar de uitkomst.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── STAP 0 — vóórmeting (apart draaien, uitkomst bewaren) ─────────────────────
select p.proname,
       p.prosecdef                                             as security_definer,
       coalesce(array_to_string(p.proconfig, ', '), '(geen)')   as search_path,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_mag,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as ingelogd_mag
from   pg_proc p
where  p.pronamespace = 'public'::regnamespace
  and  p.proname in ('set_user_id_from_auth','set_exercise_equipment_user',
                     'set_exercise_scope_context','set_training_scope_context',
                     'set_content_share_owner','provision_public_user',
                     'sync_email_confirmed','set_equipment_catalog_owner')
order by p.proname;

-- ── STAP 1 + 2 — het transactieblok (selecteer en draai dit in één keer) ──────
begin;

  -- 1. Vaste search_path. pg_temp staat er expliciet ACHTER public: staat hij vooraan,
  --    dan kan een aanroeper alsnog een tijdelijke tabel met dezelfde naam voorschuiven.
  alter function public.set_user_id_from_auth()        set search_path = public, pg_temp;
  alter function public.set_exercise_equipment_user()  set search_path = public, pg_temp;
  alter function public.set_exercise_scope_context()   set search_path = public, pg_temp;
  alter function public.set_training_scope_context()   set search_path = public, pg_temp;
  alter function public.set_content_share_owner()      set search_path = public, pg_temp;
  alter function public.set_equipment_catalog_owner()  set search_path = public, pg_temp;
  alter function public.sync_email_confirmed()         set search_path = public, pg_temp;
  -- provision_public_user schrijft in public.users en leest uit auth.users:
  alter function public.provision_public_user()        set search_path = public, auth, pg_temp;

  -- 2. RPC-ingang sluiten. Deze functies horen alleen door triggers aangeroepen te worden.
  --    'public' is de PostgreSQL-pseudorol (iedereen), niet het schema public.
  revoke execute on function public.set_user_id_from_auth()        from public, anon, authenticated;
  revoke execute on function public.set_exercise_equipment_user()  from public, anon, authenticated;
  revoke execute on function public.set_exercise_scope_context()   from public, anon, authenticated;
  revoke execute on function public.set_training_scope_context()   from public, anon, authenticated;
  revoke execute on function public.set_content_share_owner()      from public, anon, authenticated;
  revoke execute on function public.set_equipment_catalog_owner()  from public, anon, authenticated;
  revoke execute on function public.sync_email_confirmed()         from public, anon, authenticated;
  revoke execute on function public.provision_public_user()        from public, anon, authenticated;

commit;

-- ── STAP 3 — nameting ─────────────────────────────────────────────────────────
-- Verwacht: search_path gevuld voor alle acht, en anon_mag/ingelogd_mag overal false.
select p.proname,
       coalesce(array_to_string(p.proconfig, ', '), '(geen)')   as search_path,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_mag,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as ingelogd_mag
from   pg_proc p
where  p.pronamespace = 'public'::regnamespace
  and  p.proname in ('set_user_id_from_auth','set_exercise_equipment_user',
                     'set_exercise_scope_context','set_training_scope_context',
                     'set_content_share_owner','provision_public_user',
                     'sync_email_confirmed','set_equipment_catalog_owner')
order by p.proname;

-- ── STAP 4 — rooktest: werken de triggers nog? ────────────────────────────────
-- Voer NA de migratie één echte handeling uit in de app (bijvoorbeeld een check-in
-- opslaan) en controleer dat user_id automatisch gevuld is:
--   select user_id, date from hrv_log order by created_at desc limit 1;
-- Is user_id null, draai dan de ROLLBACK hieronder en meld het.

-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK
--   begin;
--     alter function public.set_user_id_from_auth()        reset search_path;
--     alter function public.set_exercise_equipment_user()  reset search_path;
--     alter function public.set_exercise_scope_context()   reset search_path;
--     alter function public.set_training_scope_context()   reset search_path;
--     alter function public.set_content_share_owner()      reset search_path;
--     alter function public.set_equipment_catalog_owner()  reset search_path;
--     alter function public.sync_email_confirmed()         reset search_path;
--     alter function public.provision_public_user()        reset search_path;
--     grant execute on function public.set_user_id_from_auth()        to anon, authenticated;
--     grant execute on function public.set_exercise_equipment_user()  to anon, authenticated;
--     grant execute on function public.set_exercise_scope_context()   to anon, authenticated;
--     grant execute on function public.set_training_scope_context()   to anon, authenticated;
--     grant execute on function public.set_content_share_owner()      to anon, authenticated;
--     grant execute on function public.set_equipment_catalog_owner()  to anon, authenticated;
--     grant execute on function public.sync_email_confirmed()         to anon, authenticated;
--     grant execute on function public.provision_public_user()        to anon, authenticated;
--   commit;
-- ══════════════════════════════════════════════════════════════════════════════
