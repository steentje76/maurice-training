-- migratie_v568.sql — MS-BETA-01 Slice B: geïsoleerde opslag voor in-app beta-feedback.
--
-- Contractbron: core/betaFeedback.js (user_feedback.v1, Slice A). Deze tabel is een eigen sink:
-- NIET client_telemetry_events (crash), NIET product_telemetry_events (producttelemetry),
-- NIET sessions/athlete-data, NIET coach_workout_feedback (coach<->atleet).
--
-- Schrijven: uitsluitend server-side (netlify/functions/beta-feedback.js, service_role) na
--   hervalidatie met hetzelfde contract. Geen enkele client INSERT/UPDATE/DELETE/TRUNCATE.
-- Lezen (triage): uitsluitend de BESTAANDE, platform-brede system_role ('support','developer'),
--   exact hetzelfde model als support_access_log en de globale oefeningencatalogus (v526).
--   system_role is door protect_privileged_user_columns() alleen via service_role te wijzigen en
--   users heeft geen client-INSERT-policy. 'tester' leest bewust NIET mee.
--   Contract-POLICY feedback_readers (product_triage/product_admin) mapt op support/developer.
-- Vrije tekst: USER_CONTENT_POTENTIALLY_SENSITIVE (kan gezondheidsinformatie bevatten die de
--   gebruiker zelf typt) -> alleen triage-rollen, begrensde lengte, geen afgeleide verwerking.
-- Retentie: 365 dagen (voorlopig productbeleid DEC-BETA-001), dagelijkse server-side cleanup
--   (netlify/functions/cleanup-beta-feedback.js). Account verwijderd -> feedback mee (cascade).
-- Geen screenshots/bijlagen in deze slice.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract text not null,
  category text not null,
  status text not null default 'SUBMITTED',
  description text,
  reproduction_steps text,
  free_text_classification text not null,
  redactions text[] not null default '{}'::text[],
  technical_context_consent boolean not null default false,
  technical_context jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null,
  constraint beta_feedback_contract_chk check (contract = 'user_feedback.v1'),
  constraint beta_feedback_category_chk check (category in ('problem','idea','unclear','works_well')),
  constraint beta_feedback_status_chk check (status in ('SUBMITTED','TRIAGED','ACCEPTED','REJECTED','DUPLICATE','PRIORITIZED','PLANNED','FIXED','RELEASED','VERIFIED')),
  constraint beta_feedback_description_len_chk check (description is null or char_length(description) between 1 and 2000),
  constraint beta_feedback_steps_len_chk check (reproduction_steps is null or char_length(reproduction_steps) between 1 and 2000),
  constraint beta_feedback_classification_chk check (free_text_classification = 'USER_CONTENT_POTENTIALLY_SENSITIVE'),
  constraint beta_feedback_redactions_chk check (redactions <@ array['jwt','bearer','email','url','phone']::text[]),
  constraint beta_feedback_tech_object_chk check (jsonb_typeof(technical_context) = 'object'),
  constraint beta_feedback_tech_consent_chk check (technical_context_consent or technical_context = '{}'::jsonb),
  constraint beta_feedback_tech_size_chk check (octet_length(technical_context::text) <= 2048)
);

alter table public.beta_feedback enable row level security;

-- Supabase-default-ACL geeft anon/authenticated alles op nieuwe tabellen: expliciet intrekken.
revoke all on public.beta_feedback from anon, authenticated;
-- Alleen SELECT voor authenticated, en die wordt volledig door RLS begrensd tot triage-rollen.
grant select on public.beta_feedback to authenticated;

drop policy if exists beta_feedback_select_triage on public.beta_feedback;
create policy beta_feedback_select_triage on public.beta_feedback
  for select to authenticated
  using (exists (select 1 from public.users u
                 where u.id = (auth.uid())::text and u.system_role in ('support','developer')));
-- Bewust GEEN insert/update/delete-policies: clients kunnen niet schrijven (en hebben er ook geen grant voor).

create index if not exists idx_beta_feedback_created_at on public.beta_feedback(created_at);
create index if not exists idx_beta_feedback_status_created on public.beta_feedback(status, created_at desc);

comment on table public.beta_feedback is 'MS-BETA-01 in-app beta feedback (user_feedback.v1). Server-side ingestion only; triage read via system_role support/developer; free text potentially sensitive; 365-day retention.';
