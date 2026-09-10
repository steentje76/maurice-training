-- migratie_v561.sql
-- DEVICES/WEARABLES V1 MUST — Garmin-fundering.
--
-- wearable_oauth_state was impliciet Google-Health-only (geen provider-
-- kolom, geen PKCE-ondersteuning). Garmin gebruikt OAuth 2.0 + PKCE
-- (bevestigd: Garmin Connect Developer Program-documentatie citeert expliciet
-- "OAuth 1.0a is retired at the end of 2026; only the current OAuth 2.0 +
-- PKCE flow" -- corroborerend bevestigd door meerdere onafhankelijke
-- integratiegidsen). PKCE vereist dat de client een code_verifier bewaart
-- tussen de auth-start en de callback -- vandaar de nieuwe kolom.
--
-- Additief or geen breaking change: bestaande rijen (allemaal Google
-- Health) krijgen provider='google_health' via de DEFAULT, code_verifier
-- blijft NULL (Google's bestaande flow gebruikt geen PKCE).

ALTER TABLE public.wearable_oauth_state
  ADD COLUMN provider text NOT NULL DEFAULT 'google_health',
  ADD COLUMN code_verifier text NULL;

COMMENT ON COLUMN public.wearable_oauth_state.provider IS
  'Devices/Wearables V1 MUST: welke provider deze eenmalige OAuth-state-rij betreft (google_health/garmin/...). Voorheen impliciet altijd google_health.';
COMMENT ON COLUMN public.wearable_oauth_state.code_verifier IS
  'PKCE code_verifier (RFC 7636), alleen gebruikt door providers die PKCE vereisen (bv. Garmin OAuth 2.0). NULL voor providers zonder PKCE.';
