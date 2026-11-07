-- TK603 explicit scope-function rollback. STAGED ONLY: no cloud application or data seed.
-- Preserve existing function owner/ACL and every legacy scope branch.
-- No alias, binding, grant, publication, RLS policy or session is changed.
DO $tk603_transition$
DECLARE current_definition text;
BEGIN
  LOCK TABLE public.exercises IN SHARE ROW EXCLUSIVE MODE;
  SELECT pg_catalog.pg_get_functiondef('public.set_exercise_scope_context()'::regprocedure)
    INTO current_definition;
  IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
       pg_catalog.replace(current_definition,E'\r\n',E'\n'),'UTF8')),'hex')
       <> '094d4e4d1068ff9f04d55b66350190914d50904e8e5e20ef2a84937976c43218' THEN
    RAISE EXCEPTION USING ERRCODE='55000',
      MESSAGE='TK603_SCOPE_DEFINITION_DRIFT';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
    WHERE t.tgrelid='public.exercises'::regclass
      AND t.tgname='tk504_reserved_catalog_fk_guard'
      AND NOT t.tgisinternal AND t.tgenabled='O'
      AND t.tgfoid='public.tk504_protect_reserved_catalog_fk()'::regprocedure
      AND NOT p.prosecdef
      AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
      AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
        pg_catalog.replace(p.prosrc,pg_catalog.chr(13)||pg_catalog.chr(10),pg_catalog.chr(10)),'UTF8')),'hex')='485486db293fa2f17c0d2718e3287fa8c0c6ebde9485341c991a2f132f56d92b'
  ) THEN
    RAISE EXCEPTION USING ERRCODE='55000',
      MESSAGE='TK603_RESERVED_GUARD_REQUIRED';
  END IF;
  EXECUTE $tk603_definition$
CREATE OR REPLACE FUNCTION public.set_exercise_scope_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  caller_gym_id text;
  caller_role_level int;
BEGIN
  SELECT gym_id, gym_role_level INTO caller_gym_id, caller_role_level
  FROM users WHERE id = auth.uid()::text;

  IF NEW.scope IS NULL THEN NEW.scope := 'personal'; END IF;

  IF NEW.scope = 'personal' THEN
    NEW.gym_id := NULL;
    NEW.created_by := auth.uid();
  ELSIF NEW.scope = 'gym' THEN
    IF caller_role_level IS NULL OR caller_role_level < 1 THEN
      RAISE EXCEPTION 'Alleen coach, manager of owner mag oefeningen gym-breed delen';
    END IF;
    NEW.gym_id := caller_gym_id;
    NEW.created_by := auth.uid();
  ELSIF NEW.scope = 'global' THEN
    IF caller_role_level IS NULL OR caller_role_level < 3 THEN
      RAISE EXCEPTION 'Alleen een gym-owner mag oefeningen aan de globale bibliotheek toevoegen';
    END IF;
    NEW.gym_id := NULL;
    NEW.created_by := auth.uid();
  ELSE
    RAISE EXCEPTION 'Ongeldige scope: %', NEW.scope;
  END IF;
  RETURN NEW;
END;
$function$

$tk603_definition$;
END
$tk603_transition$;
