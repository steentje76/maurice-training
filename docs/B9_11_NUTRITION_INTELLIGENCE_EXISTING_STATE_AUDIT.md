# B9-11 Nutrition Intelligence — Existing-State Audit

## Matrix

| Capability | Existing? | Evidence? | Safe? | Engine owner | B9-11 action |
|---|---|---|---|---|---|
| Logged daily totals | Ja (`NutritionFoundationCore.dailyLoggedTotals()`, B9-09) | N.v.t. (technische aggregatie) | Ja | Calculation Engine | **HERGEBRUIKEN**, geen duplicaat |
| Pre-training context | Nee | Deels (koolhydraatbeschikbaarheid rond inspanning, algemeen erkend) | Ja, mits kwalitatief | Nieuw: Context/Decision | **BOUWEN** (aanwezigheid-detectie, geen dosering) |
| During-training hydration context | Nee | Ja (hydratatie tijdens langdurige inspanning, algemeen erkend) | Ja, mits kwalitatief | Nieuw: Context/Decision | **BOUWEN** (aanwezigheid-detectie, geen ml-advies) |
| Post-training recovery context | Nee | Deels (eiwit/koolhydraten rond herstel, algemeen erkend) | Ja, mits kwalitatief | Nieuw: Context/Decision | **BOUWEN** (aanwezigheid-detectie, geen g/kg-advies) |
| Training-linked summary | Nee | N.v.t. | Ja | Nieuw: Context Engine | **BOUWEN** (welke trainingen hebben gekoppelde entries) |
| Completeness/confidence | Ja (per-veld data_quality, B9-09) | N.v.t. | Ja | Calculation Engine | **HERGEBRUIKEN** |
| General qualitative guidance | Nee | Ja, mits algemeen en niet-individueel | Ja, mits geen dosering | Nieuw: Decision Engine (vaste, versioneerbare copy) | **BOUWEN**, zeer beperkt |
| AI explanation | Nee | N.v.t. | Onzeker (grote veiligheidsrisico's, geen bewezen toegevoegde waarde) | N.v.t. | **DEFER** -- expliciete, conservatieve keuze conform sectie 33/35/36, net als B9-08 |
| Personalized macro targets | Nee | Onvoldoende voor individuele precisie | Nee (buiten scope) | N.v.t. | **NOT DESIRABLE** (expliciet verboden, sectie 9) |
| Calorie targets | Nee | Onvoldoende voor individuele precisie | Nee (buiten scope) | N.v.t. | **NOT DESIRABLE** (expliciet verboden, sectie 8) |
| Weight-loss guidance | Nee | N.v.t. | Nee (medisch/dieet-terrein) | N.v.t. | **NOT DESIRABLE** (expliciet verboden, sectie 26) |

## Bevindingen

`docs/DECISION_RULE_REGISTRY.md` en `core/fDecisionRuleRegistry.test.js`
bevestigen een bestaand, canoniek registratiecontract voor Decision
Rules (ID/version/inputs/conditions/output/evidence/confidence/
limitations) -- dit wordt hergebruikt, geen nieuw format bedacht.
`NutritionFoundationCore` (B9-09) blijft de enige bron voor
totalen/data-quality; B9-11 voegt uitsluitend een dunne, deterministische
Context/Decision-laag toe die de bestaande `timing_context`
(user-entered, B9-09/B9-10) gebruikt om aanwezigheid van voedings-
/hydratatie-registratie rond een training vast te stellen -- nooit
een dosering of tekort te claimen.

**AI-integratie: bewust NIET gebouwd** (conform sectie 33: "AI mag pas
Nutrition bespreken als de engine een expliciet toegestaan output-
object levert" en het B9-08-precedent "eerst bewijzen dat AI
toegevoegde waarde heeft"). De pure, deterministische Context/Decision-
laag zelf is al direct bruikbaar in de UI zonder AI-tussenstap, en een
nieuwe AI-integratie zou een aanzienlijk, apart te verantwoorden
veiligheidsrisico (prompt-injectie, adversariale verzoeken) toevoegen
zonder aangetoonde, aanvullende productwaarde binnen deze sprint.
