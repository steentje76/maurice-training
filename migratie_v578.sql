-- migratie_v578.sql — MOVEKIT PRIVATE MEDIA FOUNDATION (Phase 1)
--
-- Doel: maak een PRIVATE Supabase Storage-bucket voor gelicentieerde
-- oefeningmedia. Dit is uitsluitend infrastructuur; de actieve app blijft
-- in deze fase de bestaande Netlify-media gebruiken totdat dual-read,
-- migratie-integriteit en device proof groen zijn.
--
-- Security-contract:
--   * public = false;
--   * geen storage.objects-policy voor exercise-media;
--   * dus anon/authenticated hebben default-deny voor list/read/write/delete;
--   * alleen server-side service_role mag uploads/beheer/signing uitvoeren;
--   * de client krijgt later uitsluitend een kortlevende signed playback URL
--     via de Netlify access broker, nooit een zelfgekozen Storage-pad.
--
-- Live preflight 2026-10-01:
--   storage.objects heeft alleen 4 avatar-policies, alle expliciet
--   bucket_id='avatars'; er is dus geen brede bestaande policy die deze
--   bucket automatisch ontsluit.
--
-- Bestandslimiet:
--   huidige 226 MoveKit-video's = 528,679,284 bytes totaal;
--   grootste bestaand bestand = cycling-sprint.mp4, 8,514,448 bytes.
--   32 MiB geeft >3.9x bewezen headroom zonder onbeperkte uploads toe te staan.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media',
  'exercise-media',
  false,
  33554432,
  array['video/mp4']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- BELANGRIJK: bewust GEEN create policy op storage.objects voor deze bucket.
-- Service-role bypasses RLS server-side. Eindgebruikersrollen blijven
-- default-deny. Deze expliciete drops zorgen dat een eerdere/handmatige
-- proefpolicy met onze gereserveerde namen niet ongemerkt kan blijven staan.
drop policy if exists "exercise_media_select_authenticated" on storage.objects;
drop policy if exists "exercise_media_insert_authenticated" on storage.objects;
drop policy if exists "exercise_media_update_authenticated" on storage.objects;
drop policy if exists "exercise_media_delete_authenticated" on storage.objects;
drop policy if exists "exercise_media_public_read" on storage.objects;
