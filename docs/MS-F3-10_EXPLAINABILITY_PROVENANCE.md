# MS-F3-10_EXPLAINABILITY_PROVENANCE.md — Trainingskompas

**Auditmethode:** live schema-audit van `hrv_log` (Supabase, niet uit oude documentatie overgenomen), repo-brede write-path-inventarisatie, diepteaudit van het bestaande Decision Evidence-snapshotmechanisme.

## HRV_LOG_SCHEMA_BEFORE (live geverifieerd)
| Column | Type | Nullable |
|---|---|---|
| id, date, hrv, rhr, sleep, edema, note, created_at, user_id, cyclus_fase | (bestaand) | — |

Geen `UNIQUE(user_id,date)`-constraint. RLS: één policy `eigen_data_alleen`, `ALL`-commando's, `user_id = auth.uid()`.

## Kritiek ontwerppunt (sectie 14-16 van de opdracht): mixed-source bevestigd reëel
Beide actieve schrijfpaden — `tkMergeHealthRow()`/`upsertHrvLog()` (client) en `buildRow()` (server, `_wearableSyncLib.js`) — lezen-mergen-schrijven **per veld** (hrv/rhr/sleep onafhankelijk behouden via een `keep()`-patroon) naar dezelfde rij, zonder DB-niveau uniek-constraint. Dit betekent dat één rij aantoonbaar gemengde herkomst kan hebben: bijvoorbeeld HRV gesynchroniseerd via een wearable, en dezelfde dag later een handmatig gecorrigeerde RHR. Een enkele rij-niveau `source`-kolom zou dit foutief hebben voorgesteld.

**Reeds bestaand, maar ontoereikend provenance-signaal gevonden:** een `[src:fitbit]`-tekst-tag, verstopt in het vrije-tekst `note`-veld, rij-niveau, ondocumenteerd, regex-gematcht (`provenanceNote()`/`tkMergeHealthRow()`'s tag-behoud-logica). Dit is precies het "misleidende row-level source"-risico dat de opdracht voorspelde.

## Gekozen ontwerp: per-veld provenance (optie A, niet rij-niveau)
Drie nieuwe kolommen: `hrv_source`, `rhr_source`, `sleep_source` (`manual`/`wearable`/`unknown`). Geen aparte `provider`-kolom (bewust — precies één actieve wearable-syncbron bestaat momenteel, een provider-kolom zou ongebruikte complexiteit toevoegen).

## Migratie: `migratie_v499.sql`, live uitgevoerd en geverifieerd
- Forward-only, additief, idempotent (`ADD COLUMN IF NOT EXISTS`, constraint-check via `DO $$`-blok)
- **Live bevestigd:** 3 kolommen toegevoegd, 70 bestaande rijen ongewijzigd (`hrv_source` NULL voor alle 70 — correcte "onbekend"-semantiek, geen enkele historische bron geraden)
- RLS live herbevestigd: de bestaande `ALL`-policy dekt de nieuwe kolommen automatisch, geen policy-wijziging nodig

## Write-path-updates
- **Client** (`tkMergeHealthRow`): alleen een veld dat *deze specifieke invoer* daadwerkelijk aanlevert krijgt `'manual'`; een veld dat via `keep()` zijn bestaande waarde behield, behoudt ook zijn bestaande bron
- **Server** (`buildRow`): symmetrisch — alleen een veld dat *deze sync-run* aanlevert krijgt `'wearable'`

Beide **live functioneel getest** tegen het exacte mixed-source-scenario: wearable-HRV blijft `wearable` gelabeld nadat een gebruiker alleen zijn RHR handmatig aanvult, en omgekeerd.

## Decision Evidence-snapshotmechanisme: diepteaudit (niet op naam vertrouwd)
`buildDecisionEvidence`/`readDecisionEvidence`/`evidenceReproduceerbaar` volledig gelezen. **Bevestigd, niet aangenomen:** `readDecisionEvidence()` gebruikt een diepe kopie (`_evKopie`) — een gemuteerde teruggelezen kopie raakt het opgeslagen snapshot niet. Dit is **immutable** in de strikte zin (sectie 22: expliciet onderscheiden van "reproducible" en "explainable"). `evidenceReproduceerbaar()` vergelijkt een opgeslagen beslissing met een opnieuw genomen beslissing en onderscheidt correct "andere_uitkomst" van "andere_regelversie".

**Kleine, apart genoteerde bevinding (niet GAP-P1-007, geen blokkade):** de snapshot-structuur heeft geen dedicated top-level `quality`/`confidence`-veld — deze zouden alleen worden vastgelegd als de aanroeper ze expliciet in `calculated` meegeeft. Niet binnen deze sprint uitgebreid (buiten de scope van de HRV-provenance-fix); genoteerd als toekomstig verfijningspunt.

## GAP-P1-007 closure-gate — alle voorwaarden bevestigd
- [x] Live schema gemigreerd en geverifieerd
- [x] Alle actieve schrijfpaden bijgewerkt (client + server)
- [x] Mixed-source-semantiek correct (per-veld, niet rij-niveau)
- [x] Historische rijen veilig (`unknown`/NULL, geen fabricage)
- [x] RLS herbevestigd groen
- [x] Tests groen (17/17, inclusief sabotagebewijs)
- [x] Geen bestaande consumer gebroken (volledige regressie groen)

**GAP-P1-007: CLOSED.**

## AI-grens (F4-grens, sectie 30, herbevestigd)
`GAP-P1-003` (technische AI-outputvalidatie) blijft terecht F4. Deze sprint bouwt geen outputvalidator. De bestaande, correcte F3-claim blijft: de deterministische keten geeft de AI geen gefabriceerde waarde en instrueert het model de grens te respecteren — prompt-niveau-governance, geen technische afdwinging.

## MS-F3-10 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Every recommendation traceable end-to-end."*
**Resultaat: CLOSED.** GAP-P1-007 technisch (niet slechts documentair) opgelost, live geverifieerd. Decision Evidence-immutability bewezen, niet aangenomen.
