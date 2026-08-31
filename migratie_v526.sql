-- migratie_v526.sql
-- F13 POST-AUDIT REMEDIATION -- P1-08.
--
-- KRITIEKE, LIVE BEVESTIGDE BEVINDING: de RLS-policies op exercises voor
-- scope='global' controleerden uitsluitend "gym_role_level >= 3" -- een
-- PER-GYM gegenereerde kolom (afgeleid van gym_role: lid=1/coach=2/
-- manager=3/owner=4). Dit betekent dat de owner/manager van ELKE
-- willekeurige gym (niet alleen de platform-eigenaar) de platform-brede,
-- globale oefeningencatalogus kon muteren -- live bevestigd (transactie
-- teruggedraaid, geen permanente wijziging): een gewone gym-owner kon de
-- naam van een globale oefening wijzigen, zichtbaar voor alle gebruikers
-- van de hele app.
--
-- Root cause: het bestaande "'global' is owner-only"-ontwerp (zie
-- commentaar in index.html bij ensureExerciseRow) werd verkeerd vertaald
-- naar een PER-GYM-rolniveau i.p.v. een echte PLATFORM-brede autoriteit
-- (system_role, al bestaand voor support/developer-toegang elders,
-- bijv. support_access_log).
--
-- Het admin-scherm dat dit gebruikt (openNewExModal/saveNewEx) is
-- client-side met een PIN beveiligd -- maar een PIN is geen
-- database-autoriteit; een technisch onderlegde gym-owner kon de RLS-
-- zwakte rechtstreeks via de REST-API misbruiken, buiten de PIN-UI om.
--
-- FIX: scope='global'-mutaties vereisen voortaan system_role IN
-- ('developer','support') -- de bestaande, platform-brede rollen --
-- i.p.v. de per-gym gym_role_level. gym_role_level blijft ongewijzigd
-- van kracht voor scope='gym' (elke gym-manager/owner blijft terecht
-- bevoegd voor de EIGEN gym se content).

-- Maurice (steentje76@gmail.com, de enige huidige, feitelijke beheerder
-- van de globale catalogus via het bestaande admin-scherm) krijgt de
-- reeds bestaande, geldige system_role 'developer' -- zonder deze stap
-- zou NIEMAND meer via de app-UI globale oefeningen kunnen beheren,
-- wat een functionele regressie zou zijn voor bestaand, legitiem gebruik.
-- LET OP (geleerde les tijdens deze migratie): de bestaande
-- protect_privileged_user_columns()-trigger herstelt system_role naar
-- OLD.system_role tenzij auth.role() = 'service_role' -- deze UPDATE
-- moet dus altijd binnen een service_role-context worden uitgevoerd,
-- nooit als een gewone postgres/table-owner-sessie (die trigger
-- beschermt hiermee, terecht, ook tegen deze eigen migratie-uitvoering
-- als die per ongeluk in de verkeerde rolcontext zou draaien).
update public.users set system_role = 'developer' where id = '9b534bd1-0070-4e15-aa01-3ca3695bc9eb' and system_role is null;

drop policy if exists exercises_insert_v333 on public.exercises;
create policy exercises_insert_v333 on public.exercises for insert
  with check (
    (scope = 'personal')
    or (scope = 'gym' and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 1)
    or (scope = 'global' and (select users.system_role from users where users.id = (auth.uid())::text) in ('developer','support'))
  );

drop policy if exists exercises_update_v333 on public.exercises;
create policy exercises_update_v333 on public.exercises for update
  using (
    (scope = 'personal' and created_by = auth.uid())
    or (scope = 'gym' and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 1)
    or (scope = 'global' and (select users.system_role from users where users.id = (auth.uid())::text) in ('developer','support'))
  )
  with check (
    (scope = 'personal' and created_by = auth.uid())
    or (scope = 'gym' and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 1)
    or (scope = 'global' and (select users.system_role from users where users.id = (auth.uid())::text) in ('developer','support'))
  );

drop policy if exists exercises_delete_v333 on public.exercises;
create policy exercises_delete_v333 on public.exercises for delete
  using (
    (scope = 'personal' and created_by = auth.uid())
    or (scope = 'gym' and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 1)
    or (scope = 'global' and (select users.system_role from users where users.id = (auth.uid())::text) in ('developer','support'))
  );

-- LIVE ADVERSARIAAL GEVERIFIEERD NA TOEPASSING (met COMMIT, uiteindelijke
-- staat buiten de transactie gecontroleerd -- de meest betrouwbare
-- verificatiemethode):
-- 1. Een gewone gym-medewerker (gym_role_level=1, system_role=null)
--    kon, ook met een expliciete COMMIT, de naam van een globale
--    oefening niet wijzigen -- de rij bleef exact ongewijzigd.
-- 2. Maurice (system_role='developer') kon de globale oefening wel
--    muteren (binnen een teruggedraaide transactie getest).
