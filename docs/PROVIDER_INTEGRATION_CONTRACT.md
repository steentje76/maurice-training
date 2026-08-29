# PROVIDER_INTEGRATION_CONTRACT.md — Trainingskompas (MS-F5-01)

**Doel:** het canonieke, verplichte contract waaraan elke huidige en toekomstige externe databron (wearable/apparaat/platform/weer) moet voldoen, vóórdat verdere providers worden uitgebreid. Fundament voor MS-F5-02 t/m MS-F5-06.

## Canonieke keten (bevestigd, niet aangenomen)
```
DEVICE / WEARABLE / PLATFORM / ENVIRONMENT
  -> CONNECTOR / ADAPTER
  -> RAW DATA + PROVENANCE
  -> NORMALIZATION
  -> DATA QUALITY / CONFIDENCE
  -> CANONICAL DATA MODEL
  -> CALCULATION ENGINE
  -> CONTEXT ENGINE
  -> DECISION ENGINE
  -> AI COACH
  -> ATHLETE
```
Bevestigd aanwezig in de bestaande code-commentaren van core/concept2Live.js ("PM5 -> BLE-transport -> RAW -> normalizeLiveMetric -> CANONICAL -> Calculation -> Decision -> AI. NOOIT RAW -> AI") en core/weather.js ("LOCATION -> PROVIDER-ADAPTER -> RAW -> NORMALIZED -> TRAINING CONTEXT -> CALCULATION -> DECISION -> COACHING. NOOIT WEATHER->UI of RAW->AI->DECISION") -- deze wet was dus al architecturaal vastgelegd vóór deze sprint, nu voor het eerst formeel geconsolideerd.

## CONNECTOR INVENTORY (runtime-getraceerd)

| Provider | Transport | Auth | Data | Direction | Provenance | Dedup | Quality | Active? |
|---|---|---|---|---|---|---|---|---|
| Google Health (Fitbit-opvolger) | Server-side OAuth 2.0 | OAuth, JWT-geverifieerd, one-time state-token | HRV, RHR, slaap | Provider naar TK (pull) | Per-veld (hrv_source/rhr_source/sleep_source, MS-F3-10) | UNIQUE(user_id,provider) + merge-duplicates-upsert (connectie); UNIQUE(user_id,date) + atomaire RPC (dagelijkse data) | Impliciet via provenance | JA, actief |
| Concept2 PM5 | BLE (native transport, NIET in deze repo) | Geen (lokale BLE-pairing) | Elapsed time, afstand, pace, watts, stroke rate | Apparaat naar TK (live stream) | CONFIRMED_OFFICIAL/APK_OBSERVED/BOTH/INFERRED-classificatie per UUID | Niet van toepassing | Bron-classificatie per veld aanwezig | Pure core: JA. Native BLE-transport: NIET in deze repo -- real-device-validatie categorisch onmogelijk in deze omgeving |
| Weather | Server-side request-URL-opbouw + client-side fetch (Open-Meteo) | Geen (geen key vereist voor het niet-commerciële endpoint) | Temperatuur, gevoelstemperatuur, vocht, luchtdruk, wind, neerslag, UV | Provider naar TK (pull, per sessie) | Volledig canoniek object incl. observed_or_forecast en quality per veld, opgeslagen in sessions.weather (jsonb) | Niet van toepassing (per-sessie-attachment) | Per-veld classificatie (valid/invalid/implausible/empty) | JA, actief -- CORRECTIE t.o.v. de oorspronkelijke versie van dit rapport, zie MS-F5-06: eerder ten onrechte als "nog niet geïmplementeerd" vermeld op basis van een gedateerd modulecommentaar, niet op daadwerkelijke code-audit |
| Garmin/Polar/WHOOP/Suunto/COROS | -- | -- | -- | -- | -- | -- | -- | NEE -- geen code gevonden, feasibility is MS-F5-05 |
| Apple HealthKit | -- | -- | -- | -- | -- | -- | -- | NEE -- geen iOS-implementatie, architectuur is MS-F5-04 |

## Identificatie van de actuele architectuur (code getraceerd)
- Server-side connector: wearable-auth-start.js/wearable-auth-callback.js/wearable-disconnect.js/wearable-status.js/wearable-sync.js -- JWT-geverifieerd (behalve de callback zelf, die een eenmalig state-token gebruikt i.p.v. een Authorization-header, aangezien de provider een kale browser-redirect stuurt zonder headers).
- Client-side: geen directe provider-aanroepen vanuit de browser. Geen client-side BLE-aanroep in deze repo.
- Polling vs. webhook: wearable-sync.js is pull-gebaseerd, door de client getriggerd -- geen provider-webhook gevonden.
- DB-sync: volledig via Supabase PostgREST met service-role-sleutel vanuit server-side functions.

## PROVIDER CONTRACT (verplichte velden) -- toetsing tegen Google Health

| Contractonderdeel | Status | Bewijs |
|---|---|---|
| Provider identity | OK | provider='google_health', uniek per connectie |
| Authentication | OK | OAuth 2.0, server-side token-exchange |
| Authorization/consent | OK | Expliciete gebruikersactie vereist, disconnect werkt |
| Raw payload handling | OK | Geparsed, nooit ruw doorgegeven aan Calculation/AI |
| Canonical mapping | OK | hrv/rhr/sleep-canonieke velden |
| Units | OK | Canonieke eenheden (ms/bpm/uren) |
| Timestamps/timezones | OK | amsterdamToday(), geen toISOString()-daggrensbug |
| Provenance | OK | Per-veld *_source-kolommen |
| Measured/derived status | OK | Provider-gerapporteerd, geen TK-berekening |
| Data quality | GEDEELTELIJK -- geen expliciet quality-veld naast provenance |
| Missing fields | OK | null, nooit 0 |
| Deduplication | OK | UNIQUE(user_id,date) + atomaire RPC |
| Idempotency | OK | Herhaalde sync -> één canonieke rij, functioneel bewezen |
| Error handling | OK | Genormaliseerde foutcategorieën |
| Retry | GEDEELTELIJK -- geen expliciete retry-met-backoff |
| Rate limits | OK | RATE_LIMIT-foutcode afgehandeld |
| Revocation | OK | wearable-disconnect.js |
| Deletion/disconnect | OK | Token-verwijdering + best-effort provider-revoke |
| Observability | OK | Nooit tokens/payload-inhoud gelogd |
| Privacy | OK | RLS deny-all op tokentabellen |
| Versioning | OK | Consistente .v1-versieconventie |

## Provider adapter boundary -- bevestigd
Geen providerspecifieke veldnamen lekken door naar de Calculation Engine. hrv/rhr/sleep zijn canoniek; de parser doet de veldnaam-vertaling. Canonieke velden bewust smal gehouden.

## Units -- canonieke eenheden bevestigd
ms (HRV), bpm (RHR), uren (slaap), meters/seconden (Concept2), C/m/s/mm/h/% (weer, canoniek maar nog niet live gevoed).

## Nieuw gevonden gaps
- GAP-F5-001 (P2): geen granulair, per-waarde quality-veld naast provenance voor wearable-gezondheidsdata.
- GAP-F5-002 (P2): geen expliciete, geautomatiseerde retry-met-backoff in wearable-sync.js.

Beide niet-kritiek: geen dataverlies, geen silent-corruption-risico.

## Cross-provider duplication
Nog niet van toepassing -- er is momenteel precies één actieve wearable-provider. Het cross-provider-scenario kan pas ontstaan zodra een tweede provider daadwerkelijk wordt geïntegreerd. Geregistreerd als architectuur-aandachtspunt voor toekomstige sprints, geen huidige actieve gap.

## MS-F5-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Connector interface, canonical model, provenance, duplicate safety."
Resultaat: CLOSED. Alle vier elementen bevestigd aanwezig en getest voor de enige huidige, actieve provider (Google Health).
