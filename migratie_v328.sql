-- ══════════════════════════════════════════════════════════
-- Migratie v328 — Wearable-koppeling (Fitbit via Google Health API)
-- ══════════════════════════════════════════════════════════
-- Multi-user vanaf het begin: elke gebruiker koppelt zijn EIGEN Fitbit/Google-account.
-- Belangrijk ontwerpprincipe: access_token/refresh_token zijn NOOIT rechtstreeks door de
-- client leesbaar, ook niet door de eigenaar zelf — sbGet() in de app doet altijd
-- select=*, dus zodra een client-side SELECT-policy zou bestaan, staan de tokens gewoon
-- in de netwerk-response. Daarom bewust GEEN policies voor authenticated op deze tabel;
-- alle lezen/schrijven loopt via Netlify Functions met de service_role key (die RLS altijd
-- omzeilt). Dit is dezelfde aanpak als delete-account.js: JWT server-side verifiëren,
-- nooit een user_id van de client zelf vertrouwen.
-- Idempotent: veilig opnieuw te draaien.

CREATE TABLE IF NOT EXISTS wearable_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google_health',
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  provider_user_id text,
  scope text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_sync_status text,
  UNIQUE(user_id, provider)
);

ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
-- Bewust geen enkele policy hier — default-deny voor anon/authenticated. Zie toelichting
-- hierboven. Alleen de service_role (Netlify Functions) kan deze tabel benaderen.

-- Herbruikt de bestaande trg_set_user_id()-functie (aanwezig op de andere 16
-- gebruikersdata-tabellen, zie CURRENT_STATE.md). CONTROLEER voor het draaien van deze
-- migratie of die functie exact zo heet in jouw Supabase-project — zo niet, pas de
-- EXECUTE FUNCTION-regel hieronder aan naar de juiste naam.
CREATE TRIGGER trg_set_user_id_wearable_connections
  BEFORE INSERT ON wearable_connections
  FOR EACH ROW EXECUTE FUNCTION trg_set_user_id();

-- ── Kortlevende koppel-tabel voor de OAuth-state ──────────────────────────
-- Nodig omdat Google's redirect terugkomt als kale browser-GET (geen Authorization-
-- header), dus moet de user_id ergens tussentijds bewaard worden. 'state' is een
-- eenmalig te gebruiken willekeurige sleutel; rijen ouder dan 10 minuten zijn ongeldig
-- (afgedwongen in de Netlify Function, niet hier — Postgres heeft geen ingebouwde TTL).
CREATE TABLE IF NOT EXISTS wearable_oauth_state (
  state uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wearable_oauth_state ENABLE ROW LEVEL SECURITY;
-- Ook hier: geen policies, uitsluitend service_role-toegang.
