-- Staged only. No exercise insertion, history rewrite, media grant or activation.
-- New DB identities are distinct from catalog IDs; legacy/personal rows cannot bind.
begin;
create table if not exists public.movekit_exercise_bindings (
  catalog_id text primary key check (catalog_id ~ '^TK-[0-9]{6}$'
    and substring(catalog_id from 4)::integer between 1 and 582),
  exercise_id text not null unique references public.exercises(id) on delete restrict on update restrict,
  provider_id text not null unique check (provider_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  inventory_sha256 text not null check (inventory_sha256 ~ '^[a-f0-9]{64}$'),
  approved boolean not null default false,
  review_ref text,
  reviewer_kind text check (reviewer_kind in ('ai','human')),
  reviewed_at timestamptz,
  check (exercise_id = 'movekit-v2-' || catalog_id),
  check (not approved or (review_ref is not null and length(trim(review_ref)) between 1 and 256
    and reviewer_kind is not null and reviewed_at is not null))
);
alter table public.movekit_exercise_bindings enable row level security;
revoke all on public.movekit_exercise_bindings from public,anon,authenticated,service_role;
grant select on public.movekit_exercise_bindings to service_role;
comment on table public.movekit_exercise_bindings is
 'Explicit reviewed canonical identity mapping; not a media entitlement. Admin writes only. No inferred legacy bindings.';
create or replace function public.tk504_validate_exercise_binding()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  perform 1 from public.exercises e where e.id=new.exercise_id
    and e.scope='global' and e.user_id is null and e.created_by is null for share;
  if not found then raise exception 'TK504_BINDING_REQUIRES_OWNERLESS_GLOBAL'; end if;
  return new;
end;
$$;
revoke all on function public.tk504_validate_exercise_binding() from public,anon,authenticated,service_role;
drop trigger if exists tk504_validate_exercise_binding on public.movekit_exercise_bindings;
create trigger tk504_validate_exercise_binding before insert or update
 on public.movekit_exercise_bindings for each row execute function public.tk504_validate_exercise_binding();

-- Only reserved canonical taxonomy edits touch the admin-only crosswalk.
-- Ordinary unrelated exercise updates retain their existing permissions.
create or replace function public.tk504_preserve_canonical_identity()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if tg_op='UPDATE' and old.id like 'movekit-v2-%' then
    if new.id is distinct from old.id then
      raise exception 'TK504_CANONICAL_IDENTITY_IMMUTABLE';
    end if;
    if new.name is distinct from old.name or new.type is distinct from old.type
      or new.category is distinct from old.category
      or new.muscle_primary is distinct from old.muscle_primary
      or new.muscle_secondary is distinct from old.muscle_secondary then
      -- Admin-only correction invalidates current approval; retains review reference as provenance.
      update public.movekit_exercise_bindings set approved=false where exercise_id=old.id;
    end if;
  end if;
  if new.id like 'movekit-v2-%' and
    (new.scope is distinct from 'global' or new.user_id is not null or new.created_by is not null) then
    raise exception 'TK504_CANONICAL_REQUIRES_OWNERLESS_GLOBAL';
  end if;
  return new;
end;
$$;
revoke all on function public.tk504_preserve_canonical_identity() from public,anon,authenticated,service_role;
drop trigger if exists tk504_preserve_canonical_identity on public.exercises;
create trigger tk504_preserve_canonical_identity before insert or update
 on public.exercises for each row execute function public.tk504_preserve_canonical_identity();
commit;
