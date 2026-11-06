-- Administrative rollback of crosswalk infrastructure ONLY.
-- Does not delete exercises, workout logs, programs, media or grants.
-- First disable the V2 runtime; snapshot the mapping before this transaction.
begin;
drop trigger if exists tk504_validate_exercise_binding on public.movekit_exercise_bindings;
drop trigger if exists tk504_preserve_canonical_identity on public.exercises;
drop table public.movekit_exercise_bindings;
drop function public.tk504_validate_exercise_binding();
drop function public.tk504_preserve_canonical_identity();
commit;
