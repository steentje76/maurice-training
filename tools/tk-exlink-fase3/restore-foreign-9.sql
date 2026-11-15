-- DEC-EXLINK-005 terugzetten (alleen na expliciet besluit): de 9 sessies uit de back-up herstellen.
begin;
insert into public.sessions select b.* from public.bak_tkx20261115_foreign_sessions b
  where not exists (select 1 from public.sessions s where s.id = b.id);
commit;
