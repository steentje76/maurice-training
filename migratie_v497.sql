-- migratie_v497.sql
-- MS-F1-01 (Multi-tenant RLS Security Closure) — P0-FIX
--
-- BEVINDING (live bevestigd, teruggerold, geen echte data gewijzigd):
-- policy "users_update_own" (USING id = auth.uid()) had GEEN kolomrestrictie,
-- en de rol "authenticated" had UPDATE-GRANT op de kolommen gym_role, gym_id
-- en system_role. Een gewone ingelogde gebruiker kon via een directe
-- PATCH /rest/v1/users?id=eq.<eigen-id> zichzelf naar gym_role='owner' EN
-- system_role='developer' promoveren — volledig buiten de hiërarchie-checks
-- van netlify/functions/gym-team.js om (dat correct valideert wie welke rol
-- aan wie mag toekennen, maar simpelweg omzeild kon worden door de Supabase
-- REST-API rechtstreeks aan te roepen in plaats van de Netlify Function).
--
-- FIX: BEFORE UPDATE-trigger die gym_role/gym_id/system_role terugzet naar
-- hun oude waarde tenzij de aanroep van service_role komt (het patroon dat
-- gym-team.js en gym-team-set-pin.js al gebruiken). Zelfde architectuur als
-- de bestaande set_exercise_scope_context/set_equipment_catalog_owner-
-- triggers elders in dit schema.
--
-- Live geverifieerd (transactie, rollback):
--  - authenticated self-update van gym_role/system_role/gym_id -> waarden
--    blijven ongewijzigd (exploit geblokkeerd).
--  - service_role-update van gym_role -> slaagt zoals bedoeld (gym-team.js
--    blijft functioneren).

CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.gym_role := OLD.gym_role;
    NEW.gym_id := OLD.gym_id;
    NEW.system_role := OLD.system_role;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_privileged_user_columns ON public.users;
CREATE TRIGGER trg_protect_privileged_user_columns
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_user_columns();

-- ROLLBACK (afgeraden — herstelt de privilege-escalatie):
--   DROP TRIGGER trg_protect_privileged_user_columns ON public.users;
--   DROP FUNCTION public.protect_privileged_user_columns();
