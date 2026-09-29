-- migratie_v569.sql — MS-BETA-01 Slice C: governed triage lifecycle voor public.beta_feedback.
--
-- Waarom DDL nodig is (minimaal, additief):
--  1. Het canonieke contract (core/betaFeedback.js canTransition) eist voor DUPLICATE een verwijzing
--     (meta.duplicate_of). Zonder kolom zou die verwijzing verloren gaan -> duplicate_of.
--  2. Statusmutaties door triage moeten toerekenbaar zijn (wie/wanneer) -> status_updated_at/by.
-- Geen wijziging aan RLS, policies of grants: authenticated houdt uitsluitend SELECT (RLS: alleen
-- users.system_role support/developer). Statusmutaties lopen uitsluitend via de serverfunctie
-- netlify/functions/beta-feedback-triage.js (service_role), die de overgang met het contract valideert.

alter table public.beta_feedback
  add column if not exists duplicate_of uuid references public.beta_feedback(id) on delete set null,
  add column if not exists status_updated_at timestamptz,
  add column if not exists status_updated_by uuid references auth.users(id) on delete set null;

alter table public.beta_feedback drop constraint if exists beta_feedback_duplicate_ref_chk;
alter table public.beta_feedback add constraint beta_feedback_duplicate_ref_chk
  check ((status = 'DUPLICATE') = (duplicate_of is not null));
alter table public.beta_feedback drop constraint if exists beta_feedback_duplicate_self_chk;
alter table public.beta_feedback add constraint beta_feedback_duplicate_self_chk
  check (duplicate_of is null or duplicate_of <> id);

comment on column public.beta_feedback.duplicate_of is 'MS-BETA-01: verwijzing bij status DUPLICATE (contract canTransition); alleen via triage-serverfunctie.';
comment on column public.beta_feedback.status_updated_by is 'MS-BETA-01: triage-gebruiker (system_role support/developer) die de laatste statusovergang uitvoerde.';
