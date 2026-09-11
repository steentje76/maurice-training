-- migratie_v562.sql
-- CANONICAL USER AVATAR — profielfoto-ondersteuning.
--
-- Er bestond nog GEEN avatarveld en GEEN Supabase Storage in dit project
-- (storage.buckets was leeg). Dit is dus de eerste bucket. Forensisch
-- vastgesteld vóór deze migratie:
--   * atleet_profiel is het canonieke profielrecord (user_id PK-achtig,
--     upsert met merge-duplicates vanuit de app).
--   * social_profiles is een tweede, al bestaand record (display_name/bio/
--     visibility/theme_id). Bewust NIET samengevoegd: dat zou een
--     bestaande architectuurscheiding wijzigen zonder bewezen P0/P1.
--   * index.html rendert al `atleet.foto` op twee plekken met initialen-
--     fallback, maar dat veld werd nergens gezet -- dormante render-hook.
--
-- ONTWERPKEUZE: avatar_path bewaart een STORAGE-PAD, geen URL. Een URL in
-- de database zou de autorisatie verplaatsen naar een raadbare permalink;
-- met een pad blijft zichtbaarheid bepaald door RLS, social_profiles.
-- visibility en social_is_blocked_pair(). avatar_path is dus een
-- storage-referentie en NOOIT de bron van autorisatie.
--
-- Additief en achterwaarts compatibel: de kolom is nullable, bestaande
-- rijen blijven geldig en vallen terug op de bestaande initialen-render.

alter table public.atleet_profiel
  add column if not exists avatar_path text null;

comment on column public.atleet_profiel.avatar_path is
  'Storage-pad binnen de private bucket ''avatars'' ({user_id}/{uuid}.{ext}), NIET een publieke URL. Autorisatie blijft via RLS/visibility/blocking; null = gebruiker heeft geen profielfoto en valt terug op initialen.';

-- ── PRIVATE BUCKET ────────────────────────────────────────────────────
-- public = false: objecten zijn niet via een raadbare URL bereikbaar.
-- Levering loopt via een signed URL met korte TTL, zodat het bestaande
-- privacymodel (zichtbaarheid/blokkeren) leidend blijft.
-- SVG is bewust NIET toegestaan: SVG kan script bevatten en zou als
-- avatar uitvoerbare inhoud introduceren.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', false,
  2097152,                                   -- 2 MB; client comprimeert ruim daaronder
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── STORAGE OWNERSHIP POLICIES ────────────────────────────────────────
-- Ownership wordt afgeleid uit het EERSTE PADSEGMENT, dat gelijk moet zijn
-- aan auth.uid(). De eigenaar komt dus uit het token en nooit uit een door
-- de client meegestuurde user_id. Cross-user write is daarmee structureel
-- onmogelijk, niet slechts conventioneel.
--
-- storage.foldername(name) geeft de padsegmenten; [1] is het eerste.

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- LEZEN: bewust GEEN brede select-policy voor authenticated.
-- Zou iedere ingelogde gebruiker elk avatarobject mogen selecteren, dan
-- omzeilt dat social_profiles.visibility en social_is_blocked_pair().
-- Levering loopt daarom via een server-side signed URL die de bestaande
-- zichtbaarheidsregels toepast vóór het ondertekenen. De eigenaar mag zijn
-- eigen object wel lezen (nodig voor beheer/vervangen in Profiel).
drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- NB: anon krijgt geen enkele policy op deze bucket -> unauthenticated
-- upload/lezen is default-deny. Dat is dezelfde default-deny-constructie
-- die elders in dit schema al wordt gebruikt (o.a. wearable_connections).
