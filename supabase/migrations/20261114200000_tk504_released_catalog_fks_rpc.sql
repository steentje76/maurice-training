-- DEC-OFFLINE-CAT-001 — fase 2a: offline loggen op vrijgegeven MoveKit-oefeningen.
--
-- Additief, alleen-lezend, idempotent. Levert aan een ingelogde gebruiker de lijst van
-- vrijgegeven catalogus-bindingen (active + reviewed), zodat de app die offline kan gebruiken.
-- Autoriseert niets: elke sessie-write wordt door tk504_typed_session_fk_guard opnieuw gecontroleerd.
-- De tabel movekit_catalog_fk_bindings blijft voor clients onleesbaar (RLS zonder policy).

create or replace function public.tk504_released_catalog_fks()
returns table (catalog_id text, provider_id text, exercise_id text)
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  select b.catalog_id, b.provider_id, b.exercise_id
  from public.movekit_catalog_fk_bindings b
  where auth.uid() is not null
    and b.active = true
    and b.reviewed_at is not null
    and b.exercise_id = 'TKC-' || substring(b.catalog_id from 4)
  order by b.catalog_id;
$$;

revoke all on function public.tk504_released_catalog_fks() from public, anon;
grant execute on function public.tk504_released_catalog_fks() to authenticated;

comment on function public.tk504_released_catalog_fks() is
  'DEC-OFFLINE-CAT-001: vrijgegeven MoveKit-bindingen voor offline loggen (alleen ingelogd, alleen-lezend).';
