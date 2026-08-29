# MS-F6-01_RUNNING_INTELLIGENCE.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Running Intelligence" -- "Execution + pace/zones/CS/trends." P1, dependency MS-F3-04 (voldaan, TESTED).

## Baseline audit
Zie docs/F6_EXISTING_RUNTIME_INVENTORY.md. Kernbevinding: Execution (CardioEngine/CARDIO_TYPES.running) bestond al, PRODUCTION. Zones/TID/decoupling/TRIMP blijven bewust NOT_IMPLEMENTED sinds F3. CS en trends waren de twee genuine open onderdelen van de acceptance gate.

## Nieuw gebouwd: Critical Speed (CardioCore.criticalSpeed())
Tweeparametermodel (Monod & Scherrer 1965, toegepast op hardlopen): afstand = CS*tijd + D'. Lineaire regressie op expliciet aangeleverde {distance_m, duration_s}-paren. Vereist minimaal 2 performances met aantoonbaar verschillende duren; R² en een confidence-classificatie (hoog/middel/laag) worden meegeleverd, nooit gefabriceerd bij onvoldoende data.

Kritieke, eerlijke beperking (ontdekt tijdens deze sprint): het TK-datamodel heeft geen mechanisme om een gelogde sessie te markeren als een genuine maximale-inspanning-tijdrit versus een rustige duurloop. De functie neemt daarom NOOIT automatisch trainingsgeschiedenis als input -- alleen expliciet gecureerde tijdritprestaties. Automatische wiring op willekeurige sessiedata zou een wetenschappelijk ongeldig model opleveren. Vastgelegd als GAP-P2-021, geen productbeslissing hier zelf genomen.

## Pace-trend: hergebruik, geen duplicatie
ProgressionCore.trendBy() (uit F4) is generiek genoeg om direct te hergebruiken voor pace-trends -- functioneel bewezen. CardioCore bevat geen eigen trendfunctie -- geen tweede, gedupliceerd trendalgoritme voor endurance.

## Zones/TID/aerobic decoupling/TRIMP -- heroverwogen, bewust nog steeds NOT_IMPLEMENTED
Deze sprint beoordeelde expliciet of F6-scope + evidence + data een implementatie nu rechtvaardigen. Conclusie: nee, om dezelfde reden als in F3 -- geen concrete, productgedreven noodzaak binnen de acceptance gate. Geen formule toegevoegd uitsluitend omdat deze populair is.

## Tests
core/fRunningIntelligence.test.js (nieuw, 9/9): golden cases voor criticalSpeed() en de trendBy()-hergebruik-bevestiging. Sabotagebewijs geleverd (de minimum-2-performances-eis tijdelijk verlaagd, gedetecteerd, teruggedraaid, 0 diff).

## MS-F6-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Execution + pace/zones/CS/trends."
Resultaat: CLOSED. Execution bevestigd bestaand (PRODUCTION). CS nieuw gebouwd, getest, met een eerlijk vastgelegde wiring-beperking. Trends hergebruiken bestaande infrastructuur. Zones blijven bewust NOT_IMPLEMENTED, evidence-based, consistent met F3.
