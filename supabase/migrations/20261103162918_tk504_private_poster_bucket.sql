-- TK504 / Movekit V2: reproducible private poster bucket.
-- The hosted Supabase bucket was first created and verified via the
-- authorized Supabase management connection on 2026-11-03.
-- This idempotent migration is retained for fresh environments; it does not
-- upload media, create access policies or change the production app.
-- Never make the poster bucket public, and never attach generic user RLS grants.

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exercise-posters', 'exercise-posters', false, 1048576,
   array['image/webp']::text[])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'exercise-posters'
      and name = 'exercise-posters'
      and public = false
      and file_size_limit = 1048576
      and allowed_mime_types = array['image/webp']::text[]
  ) then
    raise exception 'TK504_EXERCISE_POSTERS_PRIVATE_BUCKET_CONFIGURATION_MISMATCH';
  end if;
end $$;
