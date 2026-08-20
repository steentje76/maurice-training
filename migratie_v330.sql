-- ══════════════════════════════════════════════════════════
-- Migratie v330 — Gym-fundament: eerste gym, backfill, auto-provisioning,
-- coach-toegang-pincode, auditlog
-- ══════════════════════════════════════════════════════════
-- Aanleiding: het rollen-schema uit migratie_v322 (gym_role, gym_role_level,
-- system_role op users; gyms-tabel) was aangelegd maar nooit gevuld — users en
-- gyms bleken beide leeg (1 augustus 2026). Er was ook geen mechanisme dat bij
-- registratie automatisch een public.users-rij aanmaakt. Dit is dat fundament.
--
-- Rolhiërarchie (gym_role_level, hoger = meer rechten):
--   0 = lid, 1 = coach, 2 = manager, 3 = owner
-- Idempotent: veilig opnieuw te draaien.

-- ── Stap 1: eerste gym ──────────────────────────────────────────────
INSERT INTO gyms (id, name, owner_email, created_at)
SELECT 'art-crossfit', 'ART CrossFit', 'steentje76@gmail.com', now()
WHERE NOT EXISTS (SELECT 1 FROM gyms WHERE id = 'art-crossfit');

-- ── Stap 2: coach-toegang-pincode per gym (door owner instelbaar) ──────
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS coach_pin_hash text;

-- ── Stap 3: backfill — Maurice's bestaande account wordt owner ────────
-- gym_role_level is een GENERATED kolom (automatisch afgeleid van gym_role) — mag niet
-- expliciet worden meegegeven bij INSERT, vandaar niet in de kolomlijst hieronder.
INSERT INTO users (id, email, name, gym_id, gym_role, role, created_at)
SELECT au.id::text, au.email, au.email, 'art-crossfit', 'owner', 'authenticated', now()
FROM auth.users au
WHERE au.email = 'steentje76@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id::text);

-- ── Stap 4: auto-provisioning — elke nieuwe registratie krijgt automatisch
-- een public.users-rij (standaard: lid, gekoppeld aan art-crossfit — dit is
-- voorlopig single-gym; zodra er een tweede gym bijkomt moet dit aangepast
-- worden naar een registratieflow die de gym laat kiezen).
CREATE OR REPLACE FUNCTION provision_public_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, gym_id, gym_role, role, created_at)
  VALUES (NEW.id::text, NEW.email, NEW.email, 'art-crossfit', 'lid', 'authenticated', now())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_provision_public_user ON auth.users;
CREATE TRIGGER trg_provision_public_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION provision_public_user();

-- ── Stap 5: auditlog — uitsluitend gym-/lidmaatschapsniveau, NOOIT
-- atleet-/trainingsdata. Wordt alleen weggeschreven door server-side Netlify
-- Functions (service_role) — bewust geen INSERT-policy voor authenticated,
-- zodat niemand een vervalste logregel kan insturen.
CREATE TABLE IF NOT EXISTS gym_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id text NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  actor_user_id text NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_user_id text,
  target_email text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gym_audit_log ENABLE ROW LEVEL SECURITY;
-- Geen policies — uitsluitend service_role-toegang (via Netlify Functions,
-- die zelf de rol/pincode van de aanroeper verifiëren vóór ze loggen tonen).
