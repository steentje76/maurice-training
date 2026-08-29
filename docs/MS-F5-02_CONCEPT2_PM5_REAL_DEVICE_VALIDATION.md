# MS-F5-02_CONCEPT2_PM5_REAL_DEVICE_VALIDATION.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Concept2 PM5 Real-device Validation" -- "Production-like PM5 validation matrix closed."

## Kritieke omgevingsbeperking (bevestigd, niet aangenomen)
Deze sandbox-Linux-Node-omgeving heeft GEEN Android-runtime, GEEN Capacitor-buildtoolchain die daadwerkelijk op een apparaat draait, en GEEN fysieke PM5-hardware. Bevestigd via code-lezing: window.TKDeviceTransport (de enige live-koppelingsingang) bestaat uitsluitend in een web/PWA-omgeving als een geïnjecteerde, native adapter -- die adapter zelf leeft in de Capacitor/Android-laag. Real-device-validatie is daarom categorisch onmogelijk in deze omgeving. Dit is geen tekortkoming van dit werk, maar een feitelijke omgevingsgrens.

## Re-audit van eerder "A5"-werk (niet blind vertrouwd)
Het sprintcommentaar "A5-hardening (v4.66.0)" is bevestigd, niet aangenomen, via daadwerkelijke code-lezing:
- Busy-guard tegen dubbel tikken tijdens scannen/verbinden: bevestigd aanwezig.
- Exercise-specifieke unsubscribe-functies vóór een nieuwe connectiepoging: bevestigd aanwezig, met expliciete toelichting waarom dit niet de transportbrede unsubscribeMetrics() mag zijn.

## Belangrijke, positieve architectuurbevinding (nieuw bewezen)
De BLE-verbindingslaag (tkErgConnectDevice()) is volledig, aantoonbaar ontkoppeld van de trainingssessie-levenscyclus (activeInstanceId/sessionLog/de timer). Functioneel bewezen via bron-extractie: de connect/disconnect-handlers verwijzen nergens naar deze sessie-state-variabelen. Een BLE-disconnect kan een actieve training dus NOOIT beëindigen, wissen, resetten, of dupliceren -- niet omdat een aparte guard dit voorkomt, maar omdat de twee lagen geen enkel code-pad delen. Een sterkere garantie dan een losse check.

## Native transport-implementatie bevestigd (nuancering t.o.v. de aanvankelijke aanname)
native/src/nativeConcept2BleTransport.js + native/src/capacitorBleGateway.js bevestigen een echte, werkende binding naar het bestaande @capacitor-community/bluetooth-le-plugin -- geen stub. Correct geconfigureerd (androidNeverForLocation: true, een bekende Android-BLE-valkuil bewust vermeden). De daadwerkelijke Android-implementatie bestaat en is klaar voor een echte build, maar kan in deze sandbox niet op een fysiek apparaat draaien of getest worden.

## Software-laagtests (146 bestaande + 10 nieuwe, alle groen)
- core/fConcept2Live.test.js: 95/95 -- pure state machines, UUID-matrix, metric-normalisatie.
- native/nativeConcept2BleTransport.test.js: 51/51 -- wiring tussen een mock-BLE-gateway en de Concept2-decoder (expliciet gedocumenteerd: geen verzonnen payloads, echte PM5-metrics blijft extern geblokkeerd).
- core/fConcept2MidWorkoutIsolation.test.js (nieuw): 10/10 -- bewijst de sessie/BLE-ontkoppeling functioneel, met sabotagebewijs.

## Supported modes -- bevestigd
RowErg, SkiErg, BikeErg -- alle drie expliciet in de machine-type-mapping en de UUID-matrix. Geen ongesteunde hardware geclaimd.

## Measured vs. derived power
Al correct opgelost in een eerdere sprint: cm.wattsSource==='concept2_derived' wordt expliciet in de UI getoond ("afgeleid") wanneer vermogen berekend is uit de split i.p.v. rechtstreeks gemeten.

## Multiple data sources -- PM5 HR + wearable HR
Geen expliciete, canonieke resolutieregel gevonden voor het scenario waarin zowel PM5 als een los polshorloge tegelijk hartslag leveren. Geregistreerd als gap (GAP-F5-003, P2) -- niet stilzwijgend gemiddeld (bevestigd: geen averaging-code gevonden), maar ook geen expliciete "welke bron wint"-regel.

## Dimensionale maturity (verplicht, geen platte samenvoeging)
| Dimensie | Status |
|---|---|
| Software | CLOSED -- state machines, wiring, sessie/BLE-ontkoppeling, measured/derived-onderscheid: allemaal functioneel getest, sabotagebewijs geleverd. |
| Integration (Capacitor-plugin op een echte/geëmuleerde Android-runtime) | OPEN -- vereist een Android-build-/testomgeving die niet beschikbaar is in deze sandbox. |
| Real Device (fysieke PM5 + fysieke telefoon) | OPEN -- geen hardware beschikbaar. Geen bewijs verzonnen. |

## MS-F5-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Production-like PM5 validation matrix closed."
Resultaat: SOFTWARE CLOSED — REAL DEVICE VALIDATION OPEN (expliciet toegestane, geldige eindstatus). Dit blokkeert de resterende, technisch onafhankelijke F5-mastersprints niet.
