-- migratie_v454.sql — Menstruatiecyclus/training: expliciete consent-kolom
--
-- MASTER SPRINT v4.54.0. Eén kolom, boolean, nullable, additief.
--
-- Context: hrv_log.cyclus_fase bestaat al (geen wijziging hier) en wordt al gebruikt in
-- de dagfactor-berekening (dayfactor.v1). Deze migratie voegt UITSLUITEND een expliciet,
-- los consentveld toe — de bevestiging dat de sporter zelf koos om cyclusgegevens bij te
-- houden, los van het bredere profielveld geslacht.
--
-- Zolang deze migratie niet is uitgevoerd, detecteert de app dit via een lichte
-- kolom-probe (tkCyclusConsentKolomBeschikbaar, zelfde patroon als de eerdere sprints
-- v4.49/v4.52) en bewaart het consent alleen lokaal (localStorage) — er wordt nooit een
-- write geprobeerd op een kolom die niet bestaat, en geen enkele bestaande
-- atleet_profiel-sync (profiel opslaan, onboarding) kan hierdoor stukgaan: die syncs
-- sturen dit veld bewust nooit mee (zie tkAtleetSyncVeld() in index.html).
--
-- Idempotent: `if not exists`, veilig opnieuw te draaien.

-- ══════════════════════════════════════════════════════════════════════════════

-- STAP 1 — de kolom
alter table public.atleet_profiel
  add column if not exists cyclus_consent boolean;

-- STAP 2 — documentatie in de database zelf
comment on column public.atleet_profiel.cyclus_consent is
  'Expliciete toestemming van de sporter om menstruatiecyclusgegevens bij te houden (hrv_log.cyclus_fase). NULL = nog geen keuze gemaakt (app toont dan het consentmoment opnieuw); TRUE = toestemming gegeven; FALSE = expliciet geweigerd (app vraagt niet opnieuw, maar respecteert een latere wijziging via Lichaam → Gezondheidsgegevens). Losstaand van het geslacht-veld, dat alleen bepaalt of de vraag relevant is.';

-- STAP 3 — verificatie (leest alleen)
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'atleet_profiel'
  and column_name = 'cyclus_consent';
