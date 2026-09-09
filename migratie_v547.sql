-- migratie_v547.sql
-- Backend Ordering Integrity Hardening — Training Execution.
--
-- DOEL: bewezen P2 sluiten: "twee snel opeenvolgende PATCH-edits op dezelfde
-- bestaande sessions-rij eindigen bij out-of-order netwerkarrival op de
-- OUDERE user-intent (last-arrival-wins i.p.v. last-user-intent-wins)."
--
-- OPLOSSING (kleinste correcte optie, zie sprintrapport voor de volledige
-- vergelijking van alternatieven A-F): een monotoon oplopende, client-
-- gegenereerde edit_revision-kolom + compare-and-set via de bestaande
-- PostgREST-filterquery (?id=eq.X&edit_revision=lt.N). Geen RPC nodig, geen
-- wijziging aan sbPatchQ's kernlogica of aan de offline-queue-machinerie:
-- de filter+body worden bij het queuen al met de revision-voorwaarde
-- opgebouwd en door flushOfflineQueue() ongewijzigd afgespeeld.
--
-- SCOPE (expliciet, V1): beschermt tegen out-of-order delivery, retries,
-- offline/reconnect en app-restart BINNEN HETZELFDE DEVICE (scenario's 1-4
-- uit het sprintcontract). Meerdere tabs/vensters en meerdere apparaten van
-- dezelfde gebruiker (scenario 5-6) vallen BEWUST buiten V1-scope -- een
-- client-lokale monotone teller kan cross-device geen totale ordening
-- garanderen zonder een server-autoritatieve sequence (bv. via een RPC met
-- atomische increment), wat een grotere, hier niet uitgevoerde
-- architectuurwijziging zou zijn. Dit is een bewust geaccepteerd restrisico,
-- geen onopgemerkt gat.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS edit_revision integer NOT NULL DEFAULT 0;

-- Backfill: bestaande rijen krijgen expliciet revision 0 (dekt DEFAULT al af
-- voor toekomstige inserts, maar wordt hier voor de volledigheid herhaald
-- zodat een eventuele NOT NULL-constraint nooit op bestaande data kan falen).
UPDATE public.sessions SET edit_revision = 0 WHERE edit_revision IS NULL;

COMMENT ON COLUMN public.sessions.edit_revision IS
  'Monotoon oplopende, client-gegenereerde revisie voor de historie-editflow (bewerken van een reeds gelogde set via het edit-sessie-modal). Gebruikt als compare-and-set-voorwaarde (edit_revision=lt.N) om te garanderen dat een oudere, laat-arriverende write een aantoonbaar nieuwere edit nooit stil overschrijft. NIET gebruikt voor live set-logging tijdens een actieve training (die is al veilig via de bestaande array-index-overschrijving in sessionLog). Scope: single-device V1 -- geen cross-device/cross-tab garantie.';

-- RLS: geen wijziging nodig. edit_revision is een gewone kolom binnen de
-- bestaande sessions-rij; de bestaande owner-gebaseerde policies op
-- sessions (SELECT/INSERT/UPDATE/DELETE beperkt tot user_id = auth.uid())
-- blijven ongewijzigd van toepassing en dekken deze kolom automatisch mee.
-- Er wordt geen nieuwe GRANT, policy, of functie toegevoegd.

-- Legacy-clientcompatibiliteit: een oudere appversie die nog een PATCH
-- zonder edit_revision in de body en zonder de filter-voorwaarde verstuurt,
-- blijft werken zoals voorheen (de kolom heeft een DEFAULT, ontbreken in de
-- body laat de bestaande waarde ongemoeid) -- de write wordt gewoon
-- toegepast, alleen zonder de nieuwe orderingbescherming voor DIE ene write.
-- Voor een PWA met een service-worker-forced-update-mechanisme (CORE_SIG/
-- CACHE_STATIC) is dit een kortstondig, transiënt rolloutkenmerk, geen
-- structureel meerdere-versies-naast-elkaar-risico zoals bij een native
-- app-store-rollout.
