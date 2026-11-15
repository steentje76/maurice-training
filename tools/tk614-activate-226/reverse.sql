-- DEC-FK-226-001 — terugdraaien (fase C-equivalent). NIET uitgevoerd.
-- Zet alleen de 226 originele bindingen terug op inactief + ongereviewd. Verwijdert geen sessies,
-- aliassen of media. Al gelogde sessies op TKC-000001..226 blijven bestaan (historie intact);
-- nieuwe writes op die id's worden daarna door tk504_typed_session_fk_guard geweigerd.
-- Vereist een nieuw, uniek besluit-id (formaat TK614-OWNER-REVERSE-YYYYMMDD-XXXX).
do $rev$
declare v_rows int; v_decision constant text := 'TK614-OWNER-REVERSE-YYYYMMDD-VUL-IN';
begin
  if v_decision like '%VUL-IN' then raise exception 'TK614: vul eerst een besluit-id in'; end if;
  update public.movekit_catalog_fk_bindings set active = false, reviewed_at = null
   where substring(catalog_id from 4)::int between 1 and 226 and (active or reviewed_at is not null);
  get diagnostics v_rows = row_count;
  insert into public.tk614_admin_release_audit
    (decision_id, phase, prior_decision_id, approval_sha256, all_sha256, source_mapping_sha256, source_catalog_sha256,
     precondition_sha256, registry_before_sha256, registry_after_sha256, rows_changed)
  select v_decision, 'reverse', 'TK614-OWNER-ACTIVATE-20261115-CHAT01', encode(sha256(convert_to(v_decision, 'UTF8')), 'hex'),
         all_sha256, source_mapping_sha256, source_catalog_sha256, precondition_sha256, registry_after_sha256,
         encode(sha256(convert_to((select string_agg(catalog_id||'|'||exercise_id||'|'||provider_id||'|'||active::text||'|'||(reviewed_at is not null)::text, ';' order by catalog_id) from public.movekit_catalog_fk_bindings), 'UTF8')), 'hex'),
         v_rows
    from public.tk614_admin_release_audit where decision_id = 'TK614-OWNER-ACTIVATE-20261115-CHAT01';
end $rev$;
