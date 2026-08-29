# GAP_P1_008_CLOSURE_REPORT.md — Trainingskompas

**F3 Closure Hotfix — 29 augustus 2026**

## Reproductie (live, read-only)
Live schema-audit bevestigde opnieuw: geen UNIQUE(user_id,date), geen betreffende index, RLS ongewijzigd correct. 71 rijen totaal, exact dezelfde 4 duplicate-groepen als eerder gevonden (geen nieuwe sinds MS-F3-10).

## Duplicate Inventory & Forensic Analysis
Zie docs/DAILY_HEALTH_FIELD_RECONCILIATION_CONTRACT.md voor de volledige, geanonimiseerde inventaris. Samengevat: 3 groepen exacte duplicaten (race, geen dataverlies), 1 groep complementair (geen conflict -- rhr=null vs. rhr=57, beide [src:fitbit]). Geen enkel geval van groep-D (echt conflicterende non-null waarden) -- geen PRODUCT_DECISION_REQUIRED nodig.

## Field Reconciliation Contract
Vooraf, expliciet vastgelegd vóór enige wijziging. Bevestigd: de UI ondersteunt geen intentioneel wissen -- COALESCE-gebaseerde merge is daarom veilig.

## Migratie (migratie_v500.sql), live uitgevoerd en geverifieerd
1. Archivering (hrv_log_archive_v500, permanent, reversibel): 8 originele rijen gearchiveerd.
2. Reconciliatie: per groep, union-merge per veld, oudste rij behouden als canoniek.
3. Zero-duplicates-verificatie: hard RAISE EXCEPTION als er nog duplicaten zouden zijn. Live bevestigd: 0 resterende duplicate-groepen.
4. UNIQUE(user_id,date)-constraint: toegevoegd, alleen ná bevestigd schone data.
5. Atomaire RPC upsert_daily_health (SECURITY DEFINER, INSERT..ON CONFLICT..DO UPDATE): lost het lost-update-probleem structureel op.

Live functioneel getest (test-user-id, achteraf volledig opgeruimd):
- Eerste write (INSERT-pad): hrv=40/wearable.
- Tweede write, ander veld (UPDATE-pad): rhr=55/manual toegevoegd, hrv=40/wearable behouden -- het exacte kritieke mixed-source-scenario werkt correct.
- Ongeldige source-waarde: geweigerd.
- Directe INSERT die de constraint zou schenden: geweigerd (23505 duplicate key).

## Write-path-ombouw
Beide actieve schrijvers (upsertHrvLog() client, wearable-sync.js server) roepen nu de RPC aan. Het oude, niet-atomaire lees-dan-PATCH/POST-patroon bestaat niet meer.

## Aanvullende, gerelateerde fix
pickLatestMetric() (core/deviceIntegration.js) gebruikte nog de oude, rij-niveau note-tag voor provenance-weergave. Bijgewerkt: kolom heeft nu voorrang, met terugval op de tag voor historische rijen.

## Tests
core/fHrvConcurrencyClosure.test.js (nieuw, 15/15, sabotagebewijs geleverd). core/fWearableSyncHandler.test.js (bijgewerkt, 43/43). Volledige regressie: 104/104 (met Android-buildmap), 0 gefaald. Security-regressie ongewijzigd groen.

## GAP-P1-008 closure-gate -- alle voorwaarden bevestigd
- [x] Root cause bevestigd
- [x] Alle 4 productie-duplicate-groepen geaudit
- [x] Cleanup deterministisch en veilig
- [x] Originele rijen recoverable
- [x] Productieduplicaten gereconcilieerd, live geverifieerd: 0 resterend
- [x] DB-uniciteit live actief
- [x] Handmatig schrijfpad atomair-veilig
- [x] Wearable-schrijfpad atomair-veilig
- [x] Lost-update-scenario functioneel getest en beschermd
- [x] Per-veld provenance beschermd
- [x] RLS groen
- [x] Recovery-pipeline groen
- [x] Tests groen
- [x] Post-merge remote main te verifiëren na PR

**GAP-P1-008: CLOSED** (technisch en live bevestigd; formele post-merge-verificatie volgt na PR-merge).
