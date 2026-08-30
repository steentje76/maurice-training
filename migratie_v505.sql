-- migratie_v505.sql
-- MS-F9-02 (Clubs, Groups & Challenges -- Challenges-gedeelte)
--
-- Social is een CONSUMENT van canonieke trainingsdata, GEEN tweede
-- Calculation Engine. V1 ondersteunt UITSLUITEND metric_type=
-- 'completed_sessions_count' -- een pure telling van reeds-bestaande,
-- voltooide training_instances-records, geen berekening.
--
-- TIJDGRENZEN: starts_at/ends_at zijn DATE (geen timestamptz) -- inherent
-- timezone-safe kalenderdag-vergelijking, consistent met de bestaande
-- conventie (hrv_log.date, cycle_periods.start_date). Voorkomt het
-- GAP-P3-004-patroon (blinde toISOString()-daggrenzen rond middernacht).

create table if not exists public.social_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.social_groups(id) on delete cascade,
  title text not null,
  description text,
  metric_type text not null check (metric_type in ('completed_sessions_count')),
  starts_at date not null,
  ends_at date not null,
  created_at timestamptz not null default now(),
  constraint social_challenges_valid_period check (ends_at >= starts_at)
);
comment on table public.social_challenges is
  'MS-F9-02 -- V1 uitsluitend completed_sessions_count. group_id null = ongescoopt.';

alter table public.social_challenges enable row level security;

create table if not exists public.social_challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.social_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','left')),
  constraint social_challenge_participants_unique unique (challenge_id, user_id)
);
comment on table public.social_challenge_participants is
  'MS-F9-02 -- geen rol-kolom: er bestaat geen admin/moderator-rol binnen een challenge, dus geen self-elevation-oppervlak mogelijk.';

alter table public.social_challenge_participants enable row level security;

create policy social_challenges_lezen on public.social_challenges
  for select using (
    auth.uid() is not null
    and (group_id is null or public.social_is_group_member(auth.uid(), group_id))
  );

create policy social_challenges_creator_schrijft on public.social_challenges
  for all
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- ============================================================================
-- KRITIEKE GARANTIE (live adversarial getest): block wint ook tegenover de
-- challenge-creator, en group-only challenges zijn onzichtbaar/niet-joinbaar
-- voor niet-leden. Live bevestigd:
--  - B (geblokkeerd door creator A) kreeg bij een join-poging een expliciete
--    RLS-policy-schending (INSERT geweigerd, 0 rijen).
--  - B (geen lid van de scoping-groep) zag de group-only challenge zelf al
--    niet (0 rijen bij SELECT) -- defense-in-depth.
-- ============================================================================
create policy social_challenge_participants_joinen on public.social_challenge_participants
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.social_challenges c
      where c.id = challenge_id
        and not public.social_is_blocked_pair(auth.uid(), c.creator_id)
        and (c.group_id is null or public.social_is_group_member(auth.uid(), c.group_id))
    )
  );

create policy social_challenge_participants_verlaten on public.social_challenge_participants
  for delete using (user_id = auth.uid());

-- Geen UPDATE-policy voor participants: geen wijzigbaar veld (geen rol) dat
-- een participant zou mogen aanpassen -- self-elevation is hierdoor
-- architecturaal onmogelijk, niet uitsluitend via een aparte check.

create policy social_challenge_participants_lezen on public.social_challenge_participants
  for select using (
    auth.uid() is not null
    and (
      user_id = auth.uid()
      or exists (select 1 from public.social_challenges c where c.id = challenge_id and c.creator_id = auth.uid())
      or exists (
        select 1 from public.social_challenge_participants me
        where me.challenge_id = social_challenge_participants.challenge_id and me.user_id = auth.uid() and me.status = 'active'
      )
    )
  );

create index if not exists idx_scp_challenge on public.social_challenge_participants(challenge_id, status);
create index if not exists idx_sc_group on public.social_challenges(group_id);

-- BEKENDE, NIET-BLOKKERENDE BEVINDING (live getest): een anonieme (anon-rol)
-- SELECT op social_challenges geeft een expliciete "permission denied for
-- function social_is_group_member"-foutmelding in plaats van een schone lege
-- resultatenset. Dit lekt GEEN data (0 rijen, geen rij-inhoud in de
-- foutmelding) maar is minder elegant dan een stille lege set. Root cause:
-- Postgres garandeert geen expressie-korte-sluiting voor functie-aanroepen
-- binnen een OR-conditie op query-planningsniveau. Niet gerepareerd binnen
-- deze sprint (geen veiligheidsimpact); vastgelegd als toekomstig UX-punt.
