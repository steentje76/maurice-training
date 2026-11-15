-- DEC-EXLINK-004 terugdraaien (NIET automatisch uitvoeren; alleen na expliciet besluit).
-- Verwijdert de rusttijden per gebruiker. De app valt dan terug op exercises.rest_seconds en de app-standaard;
-- een wachtrij-item tk_set_exercise_rest faalt daarna permanent (404) en wordt lokaal teruggezet.
begin;
drop function if exists public.tk_set_exercise_rest(text, integer);
drop table if exists public.exercise_rest_settings;
commit;
