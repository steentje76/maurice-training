-- migratie_v567.sql — MS-TELEMETRY-01 product telemetry storage.
-- Separate from client_telemetry_events: crash/error diagnostics remain unchanged.
create table if not exists public.product_telemetry_events (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 user_id uuid references auth.users(id) on delete set null, event_id text not null, event_version integer not null,
 app_version text not null, environment text not null, platform text not null, route_id text, correlation_id text,
 properties jsonb not null default '{}'::jsonb,
 constraint product_telemetry_event_id_len check (char_length(event_id) between 1 and 100),
 constraint product_telemetry_event_version_positive check (event_version > 0),
 constraint product_telemetry_properties_object check (jsonb_typeof(properties)='object')
);
alter table public.product_telemetry_events enable row level security;
revoke all on public.product_telemetry_events from anon, authenticated;
create index if not exists idx_product_telemetry_created_at on public.product_telemetry_events(created_at desc);
create index if not exists idx_product_telemetry_event_created on public.product_telemetry_events(event_id,created_at desc);
comment on table public.product_telemetry_events is 'MS-TELEMETRY-01 registry-approved product usage events; excludes athlete/training values, crash payloads and user feedback.';
