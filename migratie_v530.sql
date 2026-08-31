-- migratie_v530.sql
-- F14 MS-F14-01 -- Research Consent & Withdrawal.
--
-- Append-only geschiedenis: elke actie (granted/withdrawn) is een NIEUWE
-- rij, nooit een UPDATE/DELETE van een bestaande. De huidige, geldige
-- consent-status voor een gebruiker+doel is de laatste rij (hoogste
-- created_at). Dit maakt intrekking en de volledige geschiedenis
-- vanzelf traceerbaar en auditeerbaar, zonder aparte audit-log.
--
-- Doelgebonden: research_purpose is een gesloten enum (begin met één,
-- concreet doel; uitbreidbaar via een nieuwe migratie, nooit vrije tekst).
-- Versioneerbaar: consent_version -- als de onderzoeksvoorwaarden
-- wijzigen, is een eerder gegeven "granted" voor een oudere versie NIET
-- automatisch geldig voor de nieuwe versie (de applicatielaag moet de
-- huidige, actieve versie vergelijken).
--
-- Expliciet NOOIT gekoppeld aan: account-registratie, algemene
-- voorwaarden, wearable-consent, Women's Performance-consent, coach-
-- sharing, gym/team-membership, social-sharing, commerciële voorwaarden
-- -- dit is een volledig aparte, eigen tabel, geen hergebruik van een
-- bestaand consent-veld (er bestaat er ook geen bruikbaar -- de enige
-- gevonden, gerelateerde kolom, cyclus_consent, is een ander doel en
-- niet versioneerbaar/intrekbaar, en nergens in index.html gebruikt).

create table public.research_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  research_purpose text not null check (research_purpose in ('general_research_export')),
  consent_version text not null,
  action text not null check (action in ('granted','withdrawn')),
  created_at timestamptz not null default now()
);

alter table public.research_consents enable row level security;

create policy research_consents_select_own on public.research_consents
  for select using (user_id = auth.uid());

create policy research_consents_insert_own on public.research_consents
  for insert with check (user_id = auth.uid());

create index idx_research_consents_user_purpose on public.research_consents(user_id, research_purpose, created_at desc);

-- Least privilege vanaf dag 1 (F14 mag de F13-P2-bevinding over te ruime
-- standaard anon-grants niet herhalen).
revoke all on public.research_consents from anon;
revoke update, delete, truncate, trigger, references on public.research_consents from authenticated;

-- LIVE ADVERSARIAAL GEVERIFIEERD NA TOEPASSING:
-- 1. anon: permission denied (volledig geen toegang).
-- 2. authenticated, andere user_id: RLS-violation (cross-user geweigerd).
-- 3. authenticated, eigen user_id, granted: insert slaagt.
-- 4. UPDATE op een bestaande rij: permission denied (append-only
--    architecturaal afgedwongen, geen UPDATE-grant aan authenticated).
-- 5. authenticated, eigen user_id, withdrawn (nieuwe rij): insert slaagt --
--    intrekking werkt via een nieuwe rij, niet via een wijziging.
