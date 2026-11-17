-- DEC-EXLINK-005 portie 4 — record Overhead Press corrigeren (eigenaar, 17 november 2026: optie 2).
-- Het record stond op 500 kg door een foutief gelogde sessie (12 september, door de eigenaar verwijderd).
-- Nieuw record = zwaarste gelogde gewicht (63,5 kg). Draaien ná apply-portie.sql in dezelfde transactie;
-- de oorspronkelijke doelrij staat in bak_tkx3_exercise_goals.
do $c$
declare v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid; v_n int;
begin
  if v_owner is null then raise exception 'C4: tk.exlink_owner ontbreekt'; end if;
  update public.exercise_goals set pr = 63.5
   where user_id = v_owner and exercise_id = 'TKC-000030' and pr = 500;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'C4: verwacht 1 record van 500 kg op TKC-000030, gevonden %', v_n; end if;
  if (select max(weight) from public.sessions where user_id = v_owner and exercise_id = 'TKC-000030') > 63.5 then
    raise exception 'C4: er is een zwaardere sessie dan 63,5 kg; eerst beoordelen'; end if;
end $c$;
