-- TK504 #504 / TK614: original 226 publication + owner media decision binding.
-- STAGED ONLY, owner signed approval absent, NOT TO APPLY WITHOUT DBA/OWNER RELEASE.
-- Code-only review artifact. Additive and inert:
--  * no row inserts/updates/backfills, no grants/revokes, no RLS policies;
--  * movekit_media_grants PK (user_id,scope), scope check 'movekit_v2',
--    RLS and privileges are unchanged; the broker's existing
--    select-by-(user_id,scope) limit 2 / exactly-one-row rule is unaffected;
--  * a media_decision_id value NEVER authorizes original 226 media on its own;
--    signed owner record verification stays an independent server-side gate;
--  * tk504_publication_review_gate and trigger tk504_catalog_publication_guard
--    (publish denied until approved active FK binding) are NOT modified.
-- All CHECK expressions use explicit IS NULL / IS NOT NULL so no branch can
-- pass via SQL UNKNOWN.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';

-- 1. Grants: optional owner decision reference on the existing single row.
alter table public.movekit_media_grants
  add column media_decision_id text,
  add constraint tk614_media_grants_decision_format
    check (media_decision_id is null or
      media_decision_id ~ '^TK614-OWNER-MEDIA226-[0-9]{8}-[A-Z0-9]{2,32}$');
comment on column public.movekit_media_grants.media_decision_id is
  'TK614 owner media decision reference (format only). Not an entitlement; never authorizes original 226 media by itself.';

-- 2. Publications: original-226 specific provenance columns (nullable).
alter table public.movekit_v2_catalog_publications
  add column publication_reference text,
  add column media_decision_id text,
  add column manifest_all_sha256 text,
  add column revoked_at timestamptz;

-- 3. Atomically swap ONLY the range constraint (single ALTER statement).
--    227..582: original-specific columns must all stay NULL (existing 356 valid).
--    1..226 staged:    revoked_at NULL; other columns NULL or format-valid.
--    1..226 published: all of publication_reference, media_decision_id,
--                      exact pinned manifest_all_sha256 present; revoked_at NULL.
--    1..226 revoked:   revoked_at NOT NULL; other columns NULL or format-valid.
alter table public.movekit_v2_catalog_publications
  drop constraint tk504_publication_new_only,
  add constraint tk614_publication_scoped_1_582
    check (catalog_id ~ '^TK-[0-9]{6}$' and (
      (substring(catalog_id from 4)::integer between 227 and 582
        and publication_reference is null
        and media_decision_id is null
        and manifest_all_sha256 is null
        and revoked_at is null)
      or
      (substring(catalog_id from 4)::integer between 1 and 226
        and (publication_reference is null or
             publication_reference ~ '^TK614-PUB226-[0-9]{8}-[0-9]{3,6}$')
        and (media_decision_id is null or
             media_decision_id ~ '^TK614-OWNER-MEDIA226-[0-9]{8}-[A-Z0-9]{2,32}$')
        and (manifest_all_sha256 is null or
             manifest_all_sha256 = '8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10')
        and (
          (status = 'staged' and revoked_at is null)
          or
          (status = 'published'
            and publication_reference is not null
            and media_decision_id is not null
            and manifest_all_sha256 is not null
            and revoked_at is null)
          or
          (status = 'revoked' and revoked_at is not null)
        ))
    ));

comment on column public.movekit_v2_catalog_publications.publication_reference is
  'TK614 original 226 publication reference; NULL for 227..582.';
comment on column public.movekit_v2_catalog_publications.media_decision_id is
  'TK614 owner media decision reference; NULL for 227..582. Not an authorization by itself.';
comment on column public.movekit_v2_catalog_publications.manifest_all_sha256 is
  'TK614 pinned original 226 manifest hash; NULL for 227..582.';
comment on column public.movekit_v2_catalog_publications.revoked_at is
  'TK614 original 226 revocation time; required when an original row is revoked.';

commit;
-- No rows, no grants, no policies, no flags, no broker/public video change.
