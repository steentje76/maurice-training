# MS-F3-04_ENDURANCE_ERG.md — Trainingskompas

## Reconciliatie 28 september 2026 — actuele source of truth

De oorspronkelijke F3-audit hieronder is historisch correct voor het moment waarop hij is uitgevoerd, maar is door latere F6/B9-sprints gedeeltelijk ingehaald. Deze sectie heeft voor de actuele status voorrang op de historische tekst eronder.

- **CALC-END-001 pace/speed/split:** canoniek en geverifieerd.
- **CALC-END-002 erg-vermogen:** canoniek en geverifieerd.
- **CALC-END-003 measured/derived provenance:** het oorspronkelijke generieke gap-item blijft als provenance-contract relevant; Concept2-runtime onderscheidt inmiddels wel expliciet gemeten versus afgeleid vermogen.
- **CALC-END-004 Critical Speed:** inmiddels `LIVE_CANONICAL`; calculation, eligibility op `activities.is_max_effort`, history-integratie en UI bestaan. Context is aangesloten via `tkEnduranceCoachContext()`; Decision blijft bewust niet aangesloten.
- **CALC-END-004B Critical Power:** inmiddels `LIVE_CANONICAL` met dezelfde architectuurgrens; cycling-eligibility gebruikt expliciet gemarkeerde max-effort-activiteiten met vermogensdata.
- **CALC-END-005 TRIMP / aerobic decoupling / HR-zones:** blijft bewust `NOT_IMPLEMENTED`. Dit is geen vergeten implementatie: TRIMP en zones vereisen een expliciete methode/evidence-keuze; aerobic decoupling kan met de huidige activity/lap-granulariteit niet valide uit continue paired HR/performance-data worden berekend.
- **CALC-END-006 Endurance Target Normalization:** geverifieerde technische normalisatielaag; geen fysiologische berekening en geen Decision Rule.

### Actuele acceptance-gate-toetsing

De letterlijke gate blijft *"Pace/power/zones/CS/CP/decoupling/erg metrics."* Pace/power/CS/CP/erg zijn nu aantoonbaar aanwezig. Zones en decoupling zijn nog niet geïmplementeerd en worden niet gefabriceerd om de roadmap administratief te sluiten. Daarom blijft **MS-F3-04 = TESTED, niet CLOSED**. Het resterende werk is evidence-/datamodel-/productkeuze-afhankelijk en is geen P1-runtimebug.

---

## Historische F3-audit

**Auditmethode:** volledige lezing van `core/cardio.js` (pace/split/power/tijd), `core/intervalEngine.js` (work/recovery-blokprescriptie), en `CARDIO_TYPES` (index.html). Repo-brede zoekactie naar TRIMP/critical-speed/critical-power/decoupling/HR-zones.

## Belangrijke bevinding: bestaande, bewuste scope-grens gevonden en bevestigd
`core/intervalEngine.js` bevat het expliciete architectuurcommentaar *"Geen FTP/critical power/critical speed"*. Dit is dus **geen ontdekte omissie die opgelost moet worden**, maar een reeds bewust vastgelegde beslissing van een eerdere sprint. Repo-brede zoekactie bevestigt: TRIMP (elke variant), Critical Speed/Power, aerobic decoupling en HR-zones bestaan nergens. `hr` wordt voor hardlopen wel als ruwe, gemeten waarde opgeslagen, maar nooit verder verwerkt.

## Wat wél goed en volledig aanwezig is
`core/cardio.js` implementeert pace/split/tijd-conversies (met exacte, wiskundig consistente inverses) en de Concept2-vermogensformule (`watt = 2.80/(split/500)³`), beide met expliciete eenheid-documentatie ("cardio is unit-gevoelig": meters/seconden canoniek, UI-conversie is presentatie) en boundary-veilig gedrag (nooit Infinity/NaN naar de consument). Dit dekt de "pace/power/erg metrics"-helft van de acceptance gate volledig.

## Beslissing: NOT_IMPLEMENTED eerlijk registreren, niet forceren
Voor Critical Speed/Power, TRIMP en HR-zones geldt: elk vereist een eigen, aparte wetenschappelijke onderbouwing en/of een productbeslissing (welke TRIMP-variant, welke HR-zone-methode) die niet zomaar technisch te default'en is zonder fabricage. Consistent met "geen fabricated result bij insufficient trials" (CS/CP vereist een niet-bestaande trial-verzamelinfrastructuur) en "noem niet alleen TRIMP zonder formulevariant" is besloten deze **niet** binnen deze audit-sprint te bouwen, maar expliciet en eerlijk als `NOT_IMPLEMENTED` te registreren — consistent met "PARTIAL is beter dan vals CLOSED" en "geen 150-formules-theater".

## Nieuw gevonden gap: watt-provenance-onderscheid
`CARDIO_TYPES` (RowErg/BikeErg/SkiErg) laat zowel een rechtstreeks device-ingevoerd `watt`-veld toe als een split-gebaseerde afleiding (CALC-END-002), zonder een expliciete vlag die vastlegt welke van de twee een specifieke opgeslagen waarde is. Dit is exact de opdrachtvereiste ("MEASURED POWER versus DERIVED/ESTIMATED POWER... provenance verplicht") die momenteel ontbreekt. Geregistreerd als GAP-P2-013.

## Magic number audit
De Concept2-constante `2.80` is evidence-backed (industriestandaard formule); split-defaults per sport en de transitie-max-duur zijn correct als product heuristic/technical threshold geclassificeerd. Geen onverklaarde critical threshold.

## Duplicate calculation audit
`stationDurationS`/`segmentTransitionS` hadden ooit een duplicaat in `index.html` — al in een eerdere sprint (PR #31) geconsolideerd. Geen actieve duplicatie. `intervalEngine.js` bevestigt expliciet complementair te zijn aan `CardioCore`, geen overlap.

## Nieuw: test
`core/fEnduranceErgRegistry.test.js` (24/24): functionele golden/boundary-tests voor bestaande conversies + structurele registry-tests + expliciete bewaking dat CS/CP/TRIMP/decoupling/HR-zones eerlijk NOT_IMPLEMENTED blijven (geen stille fabricage-drift). Sabotagebewijs geleverd.

## MS-F3-04 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Pace/power/zones/CS/CP/decoupling/erg metrics."*
**Resultaat: sprintstatus TESTED (niet CLOSED/VALIDATED) — inhoudelijk gedeeltelijk, eerlijk vastgelegd, geen vals CLOSED.** Pace/power/erg metrics volledig aanwezig en gevalideerd. Zones/CS/CP/decoupling bestaan niet — dit is een bewuste, gedocumenteerde en beargumenteerde keuze (geen technische lacune die "vergeten" is), maar de acceptance gate noemt deze wel letterlijk. Consistent met "PARTIAL is beter dan vals CLOSED" wordt dit expliciet zo vastgelegd via de status TESTED (niet CLOSED), zonder de niet-bestaande schema-waarde "PARTIAL" te gebruiken (die is uitsluitend gereserveerd voor prozastijl-beschrijvingen, niet voor `ROADMAP_INDEX.json`'s gevalideerde status-veld).
