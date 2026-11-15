-- DEC-EXLINK-005 — fase 3a: markering "gemigreerd" per koppeling.
-- Additief en idempotent. Gemigreerd = de historie van de eigenaar staat op het MoveKit-id (TKC-);
-- de app leidt het MoveKit-item dan niet meer om naar de eigen oefening en toont die niet meer.
-- Alleen de datamigratie (fase 3b, per portie, na go) zet deze waarde.
alter table public.exercise_catalog_links
  add column if not exists migrated_at timestamptz null;

alter table public.exercise_catalog_links
  drop constraint if exists exercise_catalog_links_migrated_not_merged;
alter table public.exercise_catalog_links
  add constraint exercise_catalog_links_migrated_not_merged
  check (migrated_at is null or merged_into is null);

comment on column public.exercise_catalog_links.migrated_at is
  'DEC-EXLINK-005: tijdstip waarop de historie van deze koppeling naar het MoveKit-id is verhuisd (fase 3b). Null = niet gemigreerd.';
