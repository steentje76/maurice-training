-- DEC-FK-226-001 — vrijgave van de 226 originele MoveKit-bindingen voor logging (15 november 2026).
-- UITGEVOERD op productie op 15 november 2026 (eigenaarsakkoord in chat: "Nu, op mijn akkoord").
-- Besluit TK614-OWNER-ACTIVATE-20261115-CHAT01, na stage TK614-OWNER-STAGE-20261108-CHAT02.
-- Vervangt voor deze vrijgave de Ed25519-ondertekening van tools/tk614_original226_admin_release.cjs.
-- Eén transactie: voorwaarden, update, controles, auditregel. Herhalen faalt bewust (besluit-id uniek).
do $act$
declare
  n int; v_rows int; v_before text; v_after text; v_pre text;
  v_decision constant text := 'TK614-OWNER-ACTIVATE-20261115-CHAT01';
  v_stage constant text := 'TK614-OWNER-STAGE-20261108-CHAT02';
  v_approval constant text := 'TK614-OWNER-ACTIVATE-20261115-CHAT01|eigenaar Maurice|2026-11-15|chat-akkoord "Nu, op mijn akkoord": de 226 originele MoveKit-bindingen (TK-000001..TK-000226) vrijgeven voor logging, gelijk aan de 356; vervangt voor deze vrijgave de Ed25519-ondertekening (DEC-FK-226-001)';
begin
  select count(*) into n
    from public.movekit_catalog_fk_bindings b
    join public.exercises e on e.id = b.exercise_id and e.scope = 'global' and e.user_id is null and e.created_by is null and e.gym_id is null
   where substring(b.catalog_id from 4)::int between 1 and 226
     and b.exercise_id = 'TKC-' || substring(b.catalog_id from 4)
     and b.source_provider = 'movekit' and coalesce(b.provider_id, '') <> '';
  if n <> 226 then raise exception 'TK614: voorwaarde: % van 226 bindingen geldig', n; end if;
  select count(*) into n from public.movekit_catalog_fk_bindings
   where substring(catalog_id from 4)::int > 226 and active and reviewed_at is not null;
  if n <> 356 then raise exception 'TK614: de 356 zijn niet intact (%)', n; end if;
  if not exists (select 1 from public.tk614_admin_release_audit where decision_id = v_stage and phase = 'stage') then
    raise exception 'TK614: stage-besluit ontbreekt'; end if;
  if exists (select 1 from public.tk614_admin_release_audit where decision_id = v_decision) then
    raise exception 'TK614: besluit is al uitgevoerd'; end if;
  v_before := encode(sha256(convert_to((select string_agg(catalog_id||'|'||exercise_id||'|'||provider_id||'|'||active::text||'|'||(reviewed_at is not null)::text, ';' order by catalog_id) from public.movekit_catalog_fk_bindings), 'UTF8')), 'hex');
  v_pre := encode(sha256(convert_to('226 geldig; 356 actief+gereviewd; stage '||v_stage||'; app-bron-ids 226/226 gelijk aan bindingen', 'UTF8')), 'hex');
  update public.movekit_catalog_fk_bindings
     set active = true, reviewed_at = now()
   where substring(catalog_id from 4)::int between 1 and 226
     and not (active and reviewed_at is not null);
  get diagnostics v_rows = row_count;
  select count(*) into n from public.movekit_catalog_fk_bindings
   where active and reviewed_at is not null and exercise_id = 'TKC-' || substring(catalog_id from 4);
  if n <> 582 then raise exception 'TK614: na vrijgave % van 582 actief', n; end if;
  select count(*) into n from public.exercises where id ~ '^TKC-[0-9]{6}$' and active;
  if n <> 0 then raise exception 'TK614: technische MoveKit-records moeten inactief blijven (%)', n; end if;
  v_after := encode(sha256(convert_to((select string_agg(catalog_id||'|'||exercise_id||'|'||provider_id||'|'||active::text||'|'||(reviewed_at is not null)::text, ';' order by catalog_id) from public.movekit_catalog_fk_bindings), 'UTF8')), 'hex');
  insert into public.tk614_admin_release_audit
    (decision_id, phase, prior_decision_id, approval_sha256, all_sha256, source_mapping_sha256, source_catalog_sha256,
     precondition_sha256, registry_before_sha256, registry_after_sha256, rows_changed)
  select v_decision, 'activate', v_stage, encode(sha256(convert_to(v_approval, 'UTF8')), 'hex'),
         s.all_sha256, s.source_mapping_sha256, s.source_catalog_sha256, v_pre, v_before, v_after, v_rows
    from public.tk614_admin_release_audit s where s.decision_id = v_stage;
  if not found then raise exception 'TK614: auditregel niet geschreven'; end if;
end $act$;
