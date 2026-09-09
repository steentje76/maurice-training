-- migratie_v550.sql
-- SPRINT B2-A — External Calendar Foundation: revocable calendar
-- subscription-token.
--
-- CONTEXT: een ICS-subscription-feed kan niet op een voorspelbare
-- '/calendar/<user_id>.ics'-URL draaien (sectie 27) -- de user_id is
-- geen geheim en zou elke agenda-app trivially enumerable maken. In
-- plaats daarvan: een hoge-entropie, revocable, opaque token dat SERVER-
-- SIDE (Netlify function) naar een user_id wordt herleid. Het token zelf
-- wordt NOOIT in plaintext opgeslagen -- alleen een hash, exact hetzelfde
-- veiligheidsprincipe als elders in het project (vergelijk
-- wearableTokenVault.js voor OAuth-tokens, hier eenvoudiger want het
-- token wordt door Trainingskompas zelf gegenereerd, niet ontvangen van
-- een externe provider, dus geen Vault/RPC-encryptielaag nodig -- een
-- SHA-256-hash van een cryptografisch random token volstaat, want het
-- token zelf heeft voldoende entropie om brute-force onhaalbaar te maken).
--
-- Eén token per gebruiker (regenereren vervangt het oude token --
-- ROTATION, sectie 29). Revocation = active=false zetten, geen delete
-- nodig (audit-trail blijft intact, geen PII in deze tabel).

CREATE TABLE public.calendar_feed_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  CONSTRAINT calendar_feed_tokens_one_active_per_user UNIQUE (user_id, active) DEFERRABLE INITIALLY IMMEDIATE
);

-- De UNIQUE(user_id, active) hierboven werkt alleen correct voor active=true
-- als "false" ook uniek zou moeten zijn, wat niet de bedoeling is (een
-- gebruiker kan meerdere GEREVOKEERDE tokens hebben, historisch). Daarom
-- vervangen door een partial unique index die uitsluitend actieve tokens
-- afdwingt tot maximaal één per gebruiker.
ALTER TABLE public.calendar_feed_tokens DROP CONSTRAINT calendar_feed_tokens_one_active_per_user;
CREATE UNIQUE INDEX calendar_feed_tokens_one_active_per_user
  ON public.calendar_feed_tokens (user_id) WHERE (active = true);

CREATE INDEX idx_calendar_feed_tokens_hash ON public.calendar_feed_tokens (token_hash) WHERE (active = true);

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: de gebruiker mag zien OF hij een actief token heeft (voor de UI --
-- "agenda gekoppeld: ja/nee") en zelf tokens aanmaken/intrekken. De
-- daadwerkelijke TOKEN-WAARDE wordt nooit via een SELECT teruggegeven
-- aan de client na aanmaak-tijd (alleen token_hash staat hier, nooit het
-- plaintext-token zelf) -- de Netlify function resolvet uitsluitend
-- server-side (via de service-role, buiten RLS om, zoals elders in het
-- project). Client-side RLS is dus alleen relevant voor UI-status/CRUD
-- van de EIGEN tokenrijen, niet voor de feed-authenticatie zelf.
CREATE POLICY calendar_feed_tokens_select_own ON public.calendar_feed_tokens
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY calendar_feed_tokens_insert_own ON public.calendar_feed_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY calendar_feed_tokens_update_own ON public.calendar_feed_tokens
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.calendar_feed_tokens IS
  'Sprint B2-A: revocable, high-entropy tokens voor de ICS/iCalendar-subscription-feed. Slaat uitsluitend een SHA-256-hash op, nooit het plaintext-token. Maximaal één actief token per gebruiker (partial unique index) -- regenereren deactiveert het vorige token impliciet via de applicatielaag. GEEN wijziging aan program_blocks, availability_periods, sessions, of training_instances.';
COMMENT ON COLUMN public.calendar_feed_tokens.token_hash IS 'SHA-256-hash van het cryptografisch random, hoge-entropie token. Het plaintext-token zelf wordt nergens in de database opgeslagen.';
