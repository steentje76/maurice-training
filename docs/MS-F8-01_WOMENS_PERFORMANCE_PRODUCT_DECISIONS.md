# MS-F8-01_WOMENS_PERFORMANCE_PRODUCT_DECISIONS.md — Trainingskompas

**Canonieke naam/acceptance:** "Women's Performance Product Decisions" -- "Five decisions closed before implementation." P1, geen dependencies.

## Beslissing 1: Cycle
DECISION: Cyclus-context blijft ondersteund, uitsluitend als optionele trainingscontext (reeds bestaand, correct geimplementeerd).
USER VALUE: een atleet kan zelf periode-start/einddatums en symptomen loggen om haar eigen trainingspatroon in relatie tot haar cyclus te zien.
DATA REQUIRED: periode-start/einddatum (reeds bestaand: cycle_periods), symptoomseverity (reeds bestaand: cycle_symptom_logs).
SENSITIVITY: hoog.
EVIDENCE: Niveau C/D -- huidig onderzoek (2023-2026) toont geen consistent, methodologisch sterk bewijs voor cycle-fase-effecten op prestatie.
ALLOWED USE: athlete-gerapporteerde context tonen, eigen longitudinale patronen laten zien.
FORBIDDEN USE: fertility-voorspelling, ovulatie-met-zekerheid-claims, universele cycle-phase-based trainingsvoorschriften.
CALCULATION IMPACT: geen nieuwe calculation nodig -- CycleCore (cycle.v1) bestaat al en is correct.
CONTEXT IMPACT: vormt de basis van het nieuwe women_performance_context-object.
DECISION IMPACT: geen nieuwe Decision Rule -- onvoldoende evidence voor een harde regel.
AI PERMISSION: context uitleggen zodra gekoppeld -- nooit hormonen/fase zelf berekenen of causaal verklaren.
PRIVACY REQUIREMENT: private by default.
IMPLEMENT / ARCHITECTURE ONLY / DEFER: IMPLEMENT (reeds grotendeels gedaan).

## Beslissing 2: Symptoms
DECISION: athlete-gerapporteerde symptomen blijven ondersteund als context, nooit als diagnose.
USER VALUE: de atleet kan haar ervaren klachten koppelen aan haar trainingsgeschiedenis.
DATA REQUIRED: symptoomseverity per dag (reeds bestaand).
SENSITIVITY: hoog.
EVIDENCE: athlete-reported data heeft eigen kwaliteitskarakteristieken, geen objectieve meting.
ALLOWED USE: "Je rapporteert vandaag meer klachten".
FORBIDDEN USE: "Je hormonen veroorzaken vermoeidheid" of enige causale/diagnostische claim.
CALCULATION IMPACT: geen.
CONTEXT IMPACT: onderdeel van women_performance_context.symptom_context.
DECISION IMPACT: geen automatische trainingsaanpassing uitsluitend op basis van een gerapporteerd symptoom.
AI PERMISSION: erkennen dat de atleet dit heeft gerapporteerd, geen medische interpretatie.
PRIVACY REQUIREMENT: private by default.
IMPLEMENT / ARCHITECTURE ONLY / DEFER: IMPLEMENT (reeds bestaand).

## Beslissing 3: Contraception
DECISION: NIET geimplementeerd in F8. Uitsluitend architectuur-bewustzijn: natuurlijke-cyclus-fysiologie mag nooit ongewijzigd worden toegepast op contraceptiegebruik.
USER VALUE: geen -- geen productbehoefte vastgesteld binnen de huidige scope.
SENSITIVITY: zeer hoog.
EVIDENCE: hormonale anticonceptie verandert de natuurlijke cyclusfysiologie fundamenteel -- een aparte evidence-basis, niet binnen deze sprint onderzocht.
FORBIDDEN USE: geen aanname dat natuurlijke-cyclus-context van toepassing is op anticonceptiegebruikers.
AI PERMISSION: geen contraceptie-advies of -claims.
IMPLEMENT / ARCHITECTURE ONLY / DEFER: DEFER -- geen productbehoefte vastgesteld, hogere evidence-lat dan binnen deze sprint onderzocht.

## Beslissing 4: Pregnancy / Postpartum
DECISION: NIET geimplementeerd in F8. Geen automatische medische klaring, geen trimester-gebaseerde belastingsregels, geen postpartum-hersteltijdlijn-berekening.
USER VALUE: potentieel, vereist een aparte, toekomstige sprint met hogere veiligheidslat.
SENSITIVITY: zeer hoog, directe medische/veiligheidsimplicaties.
EVIDENCE: ACOG (2025) bevestigt dat zwangerschapstraining "individualized" moet zijn met specialistische consultatie -- een app kan die individuele medische beoordeling niet vervangen.
FORBIDDEN USE: automatische veiligheidsklaring, trimester-percentage-belastingsreducties, postpartum-hersteltijd-uit-weken-berekening.
AI PERMISSION: geen zwangerschaps-/postpartum-gerelateerde uitspraken.
IMPLEMENT / ARCHITECTURE ONLY / DEFER: DEFER -- hoogste veiligheidslat, vereist aparte, toekomstige sprint.

## Beslissing 5: Perimenopause / Menopause / Pelvic Floor
DECISION: NIET geimplementeerd in F8. Geen leeftijd-naar-menopauze-aanname, geen bekkenbodem-diagnostische classificatie.
USER VALUE: potentieel toekomstig, niet binnen deze sprint geevalueerd.
SENSITIVITY: hoog.
EVIDENCE: niet onderzocht binnen deze sprint -- vereist een aparte evidence-review.
FORBIDDEN USE: leeftijd-gebaseerde menopauze-aanname, bekkenbodem-diagnostische classificatie.
AI PERMISSION: geen menopauze-/bekkenbodem-gerelateerde uitspraken.
IMPLEMENT / ARCHITECTURE ONLY / DEFER: DEFER -- onvoldoende sprint-tijd voor een verantwoorde evidence-review.

## MS-F8-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Five decisions closed before implementation."
Resultaat: CLOSED. Alle vijf beslissingen expliciet vastgelegd. Cycle en Symptoms zijn IMPLEMENT (reeds correct bestaand, bevestigd via audit). Contraception, Pregnancy/Postpartum, en Perimenopause/Menopause/Pelvic Floor zijn bewust DEFER -- conservatieve, reversibele defaults, conform de instructie dat de Product Owner niet beschikbaar is. Geen onomkeerbare beslissing genomen.
