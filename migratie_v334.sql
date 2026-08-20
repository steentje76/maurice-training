-- ══════════════════════════════════════════════════════════
-- Migratie v334 — gym-leden tellen pas mee na e-mailbevestiging
-- ══════════════════════════════════════════════════════════
-- Aanleiding: provision_public_user() (migratie v330) maakt de public.users-rij aan
-- op het moment van REGISTREREN (auth.users AFTER INSERT), niet pas na bevestiging
-- van het e-mailadres. Daardoor stonden nooit-bevestigde test-accounts als volwaardig
-- "Lid" in de Team-ledenlijst. Besluit (Product Owner, 1 augustus 2026): pas tellen
-- als lid ná e-mailbevestiging.
--
-- Aanpak: de public.users-rij blijft wél meteen bestaan (de rest van de app leunt
-- erop voor rolcontroles), maar krijgt een email_confirmed_at-spiegelkolom die wordt
-- bijgewerkt zodra auth.users.email_confirmed_at gezet wordt. gym-team.js filtert
-- daarop bij het tonen van de ledenlijst.
-- Idempotent: veilig opnieuw te draaien.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;

-- Backfill: bestaande rijen (incl. je eigen owner-account) synchroniseren vanuit auth.users.
UPDATE users u SET email_confirmed_at = au.email_confirmed_at
FROM auth.users au
WHERE au.id::text = u.id AND u.email_confirmed_at IS NULL;

-- provision_public_user() aangepast: geeft de bevestigingsstatus meteen mee bij aanmaken
-- (dekt ook het geval dat auto-confirm aanstaat en een account meteen al bevestigd is).
CREATE OR REPLACE FUNCTION provision_public_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, gym_id, gym_role, role, created_at, email_confirmed_at)
  VALUES (NEW.id::text, NEW.email, NEW.email, 'art-crossfit', 'lid', 'authenticated', now(), NEW.email_confirmed_at)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger trg_provision_public_user zelf hoeft niet opnieuw aangemaakt (blijft ongewijzigd).

-- Nieuwe trigger: zodra iemand zijn e-mail bevestigt (auth.users.email_confirmed_at gaat
-- van NULL naar een waarde), de spiegelkolom in public.users bijwerken.
CREATE OR REPLACE FUNCTION sync_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
    UPDATE public.users SET email_confirmed_at = NEW.email_confirmed_at WHERE id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_email_confirmed ON auth.users;
CREATE TRIGGER trg_sync_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_email_confirmed();

-- Eenmalige opruiming: de spookrij van de eerder verwijderde test — delete-account.js
-- ruimt dit voortaan zelf op (zie fix van vandaag), maar deze specifieke rij was er al
-- vóór die fix.
DELETE FROM users WHERE email = 'maurice@medscan.nl';
