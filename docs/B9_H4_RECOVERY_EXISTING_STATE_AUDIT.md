# B9-H4 Recovery & Health Context — Forensische Existing-State Audit

## Kernbevinding

Recovery/Health Context is **buitengewoon volwassen** -- een eerdere
mastersprint-serie (F7/F8) bouwde en testte dit grondig. Zelf, opnieuw
gedraaid vóór enige wijziging: 210+ assertions over 8 testsuites
(fHrvArchiveLockdown 5/5, fHrvConcurrencyClosure 15/15, fHrvUpsertMerge
alle groen, fRecoveryAdaptation 10/10, fRecoveryRegistry 48/48,
fRecoveryScore 24/24, fSleepUnit 60/60, fUniversalRecovery 48/48), 0
gefaald. De logica zit gecentraliseerd in `core/calculation.js` (juist
architectuurpatroon: één Calculation Engine, geen aparte Recovery-
engine) en `core/decision.js` (Decision Rules).

## Capability Matrix

| CAPABILITY | STATUS | EVIDENCE |
|---|---|---|
| HRV opslag (raw/manual/wearable) | IMPLEMENTED | `hrv_log`-tabel, `hrv_source`-kolom onderscheidt manual/wearable |
| HRV baseline/trend | IMPLEMENTED | `fUniversalRecovery`/`fRecoveryScore`, 72 assertions |
| HRV concurrency/upsert-merge (check-in vs sync race) | IMPLEMENTED, HARDENED | `fHrvConcurrencyClosure` (15/15) + `fHrvUpsertMerge`: check-in kan gesynchroniseerde wearable-data expliciet niet overschaduwen -- reeds een eerder gerepareerde race condition |
| HRV archief-bescherming | IMPLEMENTED | `fHrvArchiveLockdown` (5/5) |
| RHR | IMPLEMENTED | `hrv_log.rhr`, `rhr_source`, zelfde ingestion-pad als HRV |
| Sleep (duur/eenheid) | IMPLEMENTED | `fSleepUnit` (60/60) -- expliciete eenheidstests |
| Subjective recovery/wellness | IMPLEMENTED (via `note`/`edema`-velden + bestaande check-in-flow) | `hrv_log.note`/`edema` |
| Training load context | IMPLEMENTED, elders (canonieke training-history, niet gedupliceerd) | Geen aparte recovery-load-kopie gevonden |
| Recovery/readiness output | IMPLEMENTED | `decision.js` `READINESS_SIGNALEN` (multi-signaal, geen enkelvoudige trigger) |
| Decision Rules-grens (HRV niet zelfstandig) | **BEVESTIGD CORRECT** | 0 treffers voor een harde, enkelvoudige HRV-drempel-regel die een rustdag afdwingt; HRV is één van zes signalen (`hrv/rhr/slaap/spierherstel/gevoel/trainingsbelasting`) |
| Account deletion | te herbevestigen (zie sectie hieronder) | |
| RLS | te herbevestigen (zie sectie hieronder) | |

## Nieuwe, echte, wetenschappelijk onderbouwde bevinding: HRV-metric-type niet vastgelegd

**Zelf onderzocht, niet uit bestaande documentatie overgenomen.**
Google Health se `dailyHeartRateVariability.averageHeartRateVariability
Milliseconds`-veld kan, afhankelijk van het onderliggende, synchroniserende
apparaat, **ofwel RMSSD ofwel SDNN** representeren (officieel bevestigd
door Google se eigen API-documentatie: "as measured by RMSSD... or by
SDNN"). Extern, onafhankelijk onderzoek (Terra, HRV-device-vergelijking)
bevestigt dat dit een praktisch, meetbaar verschil is: Apple-devices
rapporteren doorgaans SDNN (gemiddeld ~54.5ms in hun dataset), terwijl
Garmin/Fitbit/Oura RMSSD rapporteren (gemiddeld ~38-50ms) -- de twee
metrics zijn NIET direct vergelijkbaar.

De bestaande `parseHrvPoint()` (`netlify/functions/_wearableSyncLib.js`)
leest uitsluitend de waarde en documenteert in een commentaar de
aanname "RMSSD in ms" -- zonder dit te verifiëren tegen de
`dataSource`-metadata van de Google Health-respons. `hrv_log.hrv_source`
legt uitsluitend "wearable" vs handmatig vast, niet het onderliggende
apparaat/metric-type.

**Praktische impact vandaag:** laag -- Trainingskompas heeft een klein
aantal gebruikers die vermoedelijk elk consistent één apparaat
gebruiken, dus een baseline blijft intern consistent zolang een
gebruiker niet van apparaattype wisselt (bijv. van Fitbit naar Apple
Watch). **Potentiële, toekomstige impact:** bij apparaatwissel zou een
baseline een schijnbare, grote sprong tonen die geen fysiologische
verandering weerspiegelt, maar puur een meetmethode-verschil is.

**Waarom niet zelfstandig gerepareerd binnen deze sprint:** een
robuuste fix vereist live verificatie van de daadwerkelijke Google
Health-`dataSource`-veldstructuur (welke apparaat-identificatie wordt
precies teruggegeven), wat een echte API-respons vereist -- niet
beschikbaar binnen deze sessie (B9-H3C bevestigde 0 credentials/real-
API-toegang). Een speculatieve parsing-uitbreiding zonder die
verificatie zou het risico lopen een niet-bestaand veld te lezen.
**Vastgelegd als een concrete, kleine, toekomstige verbetering** (zie
Decision Log), met een conservatieve, wel-veilige maatregel die deze
sprint WEL doorvoert: expliciete documentatie van de aanname in de
Recovery Metric Contracts (sectie 6-vereiste hieronder) zodat een
toekomstige apparaatwissel-analyse weet waar te zoeken.
