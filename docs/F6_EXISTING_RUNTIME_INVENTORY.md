# F6_EXISTING_RUNTIME_INVENTORY.md — Trainingskompas

**Doel:** volledige audit van bestaande endurance/multisport-functionaliteit vóór F6-implementatie.

## Kernbevinding: uitzonderlijk mature, reeds bestaande infrastructuur
Repo-brede zoekactie bevestigt: TK heeft al een generieke, config-driven CardioEngine (index.html, gebaseerd op CardioCore uit core/cardio.js) die ALLE cardiosporten (running, cycling, rowing, swimming, assault bike, stairmaster, crosstrainer) via één gedeelde set functies afhandelt -- geen aparte logica per sport, alleen configuratie via CARDIO_TYPES. Dit voorkomt precies het "tweede execution engine"-risico waar de opdracht voor waarschuwt.

## Capability-inventaris

| Sport | Capability | Calculation | Runtime use | UI | Evidence | Tests | Status |
|---|---|---|---|---|---|---|---|
| Alle cardio | Tijd/afstand/split/vermogen-conversie | CardioCore (F1.12) | Actief, alle CARDIO_TYPES | Ja | Concept2-formule officieel gedocumenteerd | Uitgebreid, bestaand | PRODUCTION |
| Running | Afstand/tijd/pace/HR-logging | CARDIO_TYPES.running | Actief | Ja | N.v.t. | Bestaand | PRODUCTION |
| Running | Critical Speed | Nieuw (MS-F6-01), CardioCore.criticalSpeed() | Niet gewired op trainingsgeschiedenis (zie beperking) | Nee | Monod & Scherrer 1965-model, wetenschappelijk gevestigd | 9/9, sabotagebewijs | IMPLEMENTED (niet INTEGRATED) |
| Running | Pace-trend | Hergebruikt ProgressionCore.trendBy() | Functioneel bewezen herbruikbaar, niet gewired in UI | Nee | N.v.t. | Functioneel bewezen | IMPLEMENTED (niet INTEGRATED) |
| Running | Zones/TID/aerobic decoupling/TRIMP | Geen | N.v.t. | N.v.t. | Bewust NOT_IMPLEMENTED sinds F3 | N.v.t. | NOT_IMPLEMENTED (bewust, ongewijzigd) |
| Cycling | Afstand/tijd/pace/vermogen/HR-logging | CARDIO_TYPES.cycling | Actief | Ja | N.v.t. | Bestaand | PRODUCTION |
| Cycling | Critical Power / FTP | Geen | N.v.t. | N.v.t. | Bewust NOT_IMPLEMENTED sinds F3 | N.v.t. | NOT_IMPLEMENTED (bewust, ongewijzigd) |
| Rowing | Split/afstand/vermogen/stroke rate | CARDIO_TYPES.rowing/bikeerg/skierg, Concept2-infrastructuur | Actief, uitgebreid getest (F5-erfenis) | Ja | Concept2-officieel | 95/95 + 51/51 | PRODUCTION |
| Swimming | Afstand/tijd/pace (afgeleid) | CARDIO_TYPES.swimming, derivePaceSec | Actief | Ja | N.v.t. | Bestaand | PRODUCTION |
| Swimming | SWOLF/CSS | Geen | N.v.t. | N.v.t. | Nog niet onderzocht (MS-F6-06) | N.v.t. | NOT_STARTED |
| HYROX | Gestructureerde sportdefinitie | core/sportDefinition.js | Actief (metadata) | Deels | Competitiemodel-tekst nog niet herverifieerd | N.v.t. | PARTIAL (regels-revalidatie nog te doen, MS-F6-04) |
| Triathlon | Gestructureerde sportdefinitie (disciplines, T1/T2) | core/sportDefinition.js | Actief (metadata) | Deels | N.v.t. | N.v.t. | PARTIAL (geen multisport-parent/child-executiearchitectuur bevestigd, MS-F6-05) |
| Multisport | Station-/segment-timing-helpers | CardioCore.stationDurationS()/segmentTransitionS() | Actief | Ja | N.v.t. | Bestaand | PRODUCTION (fundament voor MS-F6-04/05) |
| Interval-executie | Generiek work/recovery-blockmodel | core/intervalEngine.js (A6) | Actief | Ja | N.v.t. | Bestaand | PRODUCTION -- expliciet GEEN CS/CP/zones (scope-grens van de EXECUTIE-laag) |

## Belangrijke architecturale bevestiging
core/intervalEngine.js's eigen commentaar ("Geen FTP/critical power/critical speed") is een scope-grens van de executielaag, geen wetenschappelijk verbod op CS/CP als zodanig. Dit rechtvaardigt dat Critical Speed correct thuishoort in de Calculation-laag (core/cardio.js), niet in de interval-executie-state-machine -- geen architectuurconflict.

## Kritieke, eerlijke beperking ontdekt tijdens deze audit
Het TK-datamodel heeft geen mechanisme om een gelogde sessie te markeren als een genuine maximale-inspanning-tijdrit versus een rustige duurloop. criticalSpeed() is correct geïmplementeerd en getest, maar kan niet automatisch op trainingsgeschiedenis gewired worden zonder een wetenschappelijk ongeldig model te riskeren. Vastgelegd als een expliciet, niet-blokkerend gap-item -- geen productbeslissing hier zelf genomen.
