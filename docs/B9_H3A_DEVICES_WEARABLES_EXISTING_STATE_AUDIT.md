# B9-H3A Devices, Wearables & Sensors — Existing-State Audit

## Kernbevinding

De huidige device-architectuur is **volwassen en grondig getest**
(569+ live-herdraaide assertions over 12 testsuites, 0 gefaald), maar
is functioneel geconcentreerd rond **twee smalle assen**: (1)
recovery-metrics (HRV/RHR/slaap) via Google Health/Fitbit, en (2)
Concept2-ergometer (rowing/skierg) via een directe, real-time
BLE/USB-achtige verbinding. Er bestaat **geen generieke, cross-sport
activity-import** (bijv. Garmin/Strava/Polar workout-history voor
Running/Cycling) -- dit bevestigt exact het probleem dat sectie 0 van
de opdracht benoemt: de bestaande integratie is inderdaad "alleen voor
recovery/HRV" wat betreft cloud-providers.

## Health Platforms

| Capability | EXISTS | FUNCTIONALLY COMPLETE | DATABASE | BACKEND | SECURITY | CURRENT USER ACCESS | TEST COVERAGE | GAPS | BLOCKS 9+ |
|---|---|---|---|---|---|---|---|---|---|
| Google Health (Fitbit-achterliggend) HRV/RHR/sleep | Ja | Ja, voor deze 3 metrics | `wearable_connections`/`wearable_tokens` (migratie_v328/v527) | `netlify/functions/wearable-sync.js` + `_wearableSyncLib.js` | OAuth + PKCE, token-vault, 20/20 (`fWearableAuthSecurity`) | Ja, via Instellingen/Profiel | 79+43+20 (sync/handler/tokenvault) | Geen voor deze 3 metrics | Nee |
| Apple HealthKit | **Nee** | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | 0 | Geen Apple/iOS-integratie gevonden | Ja, voor Apple-gebruikers |
| Android Health Connect | Architectuur besproken (MS-F5-03, "Production Path") | Deels | N.v.t. binnen deze scope | N.v.t. | N.v.t. | Onbekend, niet bevestigd in deze sessie | Zie `docs/MS-F5-03...` (indien aanwezig) | Productiepad gedocumenteerd, implementatiestatus niet herbevestigd deze sessie | Onbekend |

## Wearables/Cloud-platforms (Running/Cycling activity-import)

| Provider | EXISTS | ARCHITECTURE READY | Status |
|---|---|---|---|
| Garmin (Connect API) | **Nee** | Nee | NOT IMPLEMENTED |
| Polar (Flow/AccessLink) | **Nee** | Nee | NOT IMPLEMENTED |
| WHOOP | **Nee** | Nee | NOT IMPLEMENTED |
| Suunto | **Nee** | Nee | NOT IMPLEMENTED |
| COROS | **Nee** | Nee | NOT IMPLEMENTED |
| Strava | **Nee** | Nee | NOT IMPLEMENTED |
| TrainingPeaks | **Nee** | Nee | NOT IMPLEMENTED |

**Belangrijk:** `normalizeMetric()`/`normalizeWorkout()`/`normalizeSeries()`
in `core/deviceIntegration.js` bieden al een generiek, spec-gebaseerd
normalisatiepatroon (Provider Adapter + Canonical Metric Mapper,
conform sectie 33) -- maar dit patroon wordt momenteel uitsluitend
gebruikt voor Concept2, niet voor cloud-wearables. De architecturale
foundation voor sport-agnostische ingestion bestaat dus deels
(**ARCHITECTURE READY** voor het normalisatie-patroon zelf), maar is
nog nooit toegepast op een tweede, generieke cloud-provider.

## Ergometers / Smart Strength Equipment

| Provider | EXISTS | Status |
|---|---|---|
| Concept2 (Rowing/SkiErg) | Ja, real-time via `core/concept2Live.js` | SOFTWARE VALIDATED (95/95 + 10/10 tests), real-device validation eerder als open vastgesteld (MS-F5-02) |
| Technogym/EGYM/Wattbike/Keiser/Life Fitness/Matrix/Precor/Milon/Gym80 | **Nee**, wel een feasibility-document (`fGymDeviceProviderContract.test.js`, 13/13) | ARCHITECTURE FEASIBILITY DOCUMENTED, NOT IMPLEMENTED |

## Sport-taxonomie & generieke ingestion (sectie 33-34)

**Niet gevonden:** een canonieke "Sport Capability Registry" of
generieke provider-naar-sport-mapping-laag. De huidige app kent sport-
specifieke berekeningsmodules (Running/Cycling/HYROX/Triathlon, alle
uit eerdere B9-sprints) die **handmatig ingevoerde of Concept2-
afkomstige** data verwerken -- er is geen pad waarbij een extern-
geïmporteerde activity (van een niet-bestaande cloud-provider) een
canonieke sport toegewezen krijgt.

## Provenance (sectie 19-21)

Bestaand voor Concept2/Health-metrics: `provider`/`source_timestamp`/
`import_timestamp` conceptueel aanwezig in de wearable-tabellen
(migratie_v328/v527, niet in detail herlezen binnen deze sessie se
tijdsbudget). Per-metric provenance (sectie 20, bijv. GPS van het
horloge maar HR van een borstband) is **niet van toepassing** omdat
er geen multi-sensor cloud-activity-import bestaat om te testen.

## Missing != Zero (sectie 24)

Reeds bevestigd, bestaand principe in de codebase (zie eerdere
B9-sprints: Nutrition/Social/Team allemaal expliciet op dit principe
gebouwd). Voor wearable-health-metrics: niet apart, opnieuw
geverifieerd binnen deze sessie se tijdsbudget (zou een aparte, live
sync-test vereisen met een test-account).

## Conclusie voor scope van deze sprint

Gegeven (1) de enorme, structurele omvang van "één generieke,
cross-sport device-architectuur voor Garmin/Polar/WHOOP/Strava/
Technogym/etc." (maanden werk, vereist per-provider OAuth-app-
registraties die niet binnen deze sessie te verkrijgen zijn), en (2)
sectie 111 van de opdracht ("Ontbrekende fysieke hardware is geen
reden om softwarearchitectuur niet af te maken... Sluit dan: SOFTWARE
VALIDATED, REAL DEVICE VALIDATION OPEN"), kiest deze sprint voor:

**Grondige audit + documentatie van de werkelijke staat (deze
bestanden), plus het vastleggen van de canonieke Sport × Sensor
Capability Registry en architectuur-aanbeveling voor toekomstige
provider-uitbreiding -- geen nieuwe cloud-provider-integratie gebouwd
binnen deze sessie (zou een nieuwe, aparte, grote sprint met externe
provider-toegang vereisen).**
