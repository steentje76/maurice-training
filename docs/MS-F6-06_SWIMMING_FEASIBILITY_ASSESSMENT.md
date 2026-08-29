# MS-F6-06_SWIMMING_FEASIBILITY_ASSESSMENT.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Swimming Feasibility Assessment" -- "Feasibility-onderzoek zwemmen; niet in v1.1's 5 kern-F6-sprints, blijft geldig als losstaand onderzoek." Priority P4, target_maturity TESTED -- een expliciet feasibility-only sprint, geen implementatie-eis.

**Onderzoeksdatum:** 29 augustus 2026, actuele officiële/gezaghebbende bronnen.

## Bestaande generieke cardio-ondersteuning versus echte zwemintelligentie
Bevestigd: CARDIO_TYPES.swimming (index.html) biedt generieke logging -- afstand, tijd, pace (/100m), slagtype, RPE, via dezelfde gedeelde CardioCore-berekeningen als alle andere cardiosporten. Dit bewijst NIET lap-detectie, SWOLF, pool-lengte-registratie, open-water-GPS, of CSS -- generieke sportondersteuning is geen zwemintelligentie.

## Pool versus open water
Apart behandeld:
- Pool: potentieel pool-lengte, laps, afstand, slagtype, SWOLF -- via providers zoals Apple HealthKit (swimmingStrokeCount, locatie-metadata pool/open-water, slagstijl-metadata) of Garmin Connect (gedetailleerde per-lengte-splits).
- Open water: potentieel GPS, afstand, pace, HR -- fundamenteel andere meetuitdaging (GPS werkt niet onder water; bekende afstand-onnauwkeurigheden bij Apple Watch open-water-zwemmen).

Geen aanname van providergelijkwaardigheid gemaakt.

## SWOLF -- classificatie
Bevestigd: SWOLF is een afgeleide, technische efficiëntiemetric (100m-zwemtijd + slagentelling), geen ruwe apparaatmeting en geen universele prestatiescore. Vergelijking vereist gelijke pool-lengte en consistente slagentelmethode.

## CSS (Critical Swim Speed) -- bewaakte grens
De eerdere MS-F6-02-fix ("Herbereken CSS" -> "AI berekent of herberekent CSS zelf nooit") staat nog correct. Geen automatische CSS-implementatie toegevoegd. Geen CSS/SWOLF geregistreerd in de Calculation Registry (correct: niet geimplementeerd).

## Providersemantiek
| Bron | Gemeten | Afgeleid | Pool/open water | Toegang |
|---|---|---|---|---|
| Apple HealthKit | Slagentelling, afstand, HR | SWOLF (extern berekend) | Beide, met locatie-metadata | On-device, geen cloud-API |
| Google Health API (huidige actieve TK-provider) | N.v.t. voor zwemmen | N.v.t. | -- | Huidige sync dekt uitsluitend HRV/RHR/slaap |
| Garmin Connect | Per-lengte-splits, stroke rate, HR | SWOLF | Beide | Momenteel feitelijk ontoegankelijk (MS-F5-05) |
| Polar/COROS/Suunto | Niet specifiek onderzocht (P4-prioriteit) | -- | -- | Algemene toegankelijkheid al bevestigd in MS-F5-05 |

## MS-F6-06 acceptance-gate-toetsing en feasibility-beslissing
Letterlijke acceptance gate: "Feasibility-onderzoek zwemmen; blijft geldig als losstaand onderzoek."

FEASIBILITY DECISION: "PARTIAL -- PROVIDER DEPENDENCIES OPEN"

Onderbouwing: de generieke logging-architectuur is aanwezig en herbruikbaar. HealthKit biedt in theorie de benodigde datatypen, maar is nog niet geimplementeerd (MS-F5-04, ontwerp-only) en de huidige actieve Google Health API-integratie synchroniseert geen zwemdata. Garmin (de sterkste zwemdata-bron) is momenteel feitelijk ontoegankelijk. Geen directe, vandaag bruikbare providerroute naar geavanceerde zwemdata -- de afhankelijkheid ligt bij reeds vastgelegde open items uit F5/eerdere F6-sprints.

Dit is een geldige SPRINT CLOSED-uitkomst: de assessment is compleet, ook al blijft echte zwemintelligentie ongebouwd.

## Tests
core/fSwimmingFeasibility.test.js (nieuw): bevestigt de generieke CardioEngine-zwemondersteuning, de intacte CSS-AI-boundary-tekst, afwezigheid van een fictieve SWOLF/CSS-registratie, en de vereiste feasibility-classificatie in dit rapport.

Resultaat: CLOSED (feasibility-assessment compleet; swimming-feature zelf blijft terecht NOT_IMPLEMENTED, geen bewijs verzonnen).
