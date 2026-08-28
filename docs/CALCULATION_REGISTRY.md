# CALCULATION_REGISTRY.md — Trainingskompas

**Doel:** canonieke, machine- en mensleesbare registry van elke betekenisvolle berekening in Trainingskompas, per Master Roadmap 2.0 v1.1 §7. Vult de bestaande, puur-technische `docs/CAPABILITY_REGISTRY.md` aan met de wetenschappelijke/evidence-laag die daar bewust buiten valt.
**Bronnen:** `core/calculation.js` (canonieke, pure implementatie — geverifieerd via `calculation.test.js`, 79/79), de historische `claude_F1_0_CalculationRegistry.md` (point-in-time architectuuraudit, hier herverifieerd tegen de actuele code), en gerichte wetenschappelijke verificatie (zie bronnen per item).
**Regel:** geen calculation krijgt een evidence-niveau hoger dan het bewijs rechtvaardigt. C/D/E is beter dan een onterechte A/B (Master Roadmap §15/43).

## Domein: Strength (MS-F3-01)

### CALC-STR-001 — Estimated 1RM (Epley)
| Veld | Waarde |
|---|---|
| Domain | Strength |
| Name | Geschat 1-repetitie-maximum (e1RM), Epley-formule |
| Version | `e1rm.v1` |
| Formula | `reps===1 ? kg : Math.round(kg * (1 + reps/30))` |
| Implementation | `core/calculation.js` — `calculate1RM`/`oneRMRaw` |
| Required inputs | `kg` (gewicht), `reps` (herhalingen, geheel getal ≥1) |
| Input units | kg, reps (dimensieloos) |
| Output | geschat 1RM |
| Output unit | kg |
| Supported sports | krachttraining (barbell/dumbbell/machine — compound en isolatie) |
| Minimum data | 1 geldige set (gewicht + reps) |
| Data quality dependency | geen — puur wiskundig op de ingevoerde set |
| Evidence level | **B** — goede praktische/empirische basis, geen zelfstandige nieuwe validatiestudie nodig (decennialang gebruikte, breed toegepaste vergelijking) |
| Confidence model | daalt naarmate `reps` toeneemt — Epley-achtige formules zijn het minst nauwkeurig bij hoge herhalingsaantallen (>10-12), waar vermoeidheids-/techniekfactoren de lineaire aanname verstoren |
| Scientific sources | Epley, B. (1985). *Poundage Chart*. Boyd Epley Workout. Widely replicated comparative-validity literature toont voor lage-tot-middelhoge repranges (1-10) een typische foutmarge van circa 5-10% t.o.v. een daadwerkelijke 1RM-test; nauwkeurigheid neemt af buiten dat bereik. |
| Limitations | schatting, geen vervanging voor een daadwerkelijke 1RM-test; minder betrouwbaar bij >10-12 reps; oefening-technisch-afhankelijk (compound vs. isolatie, stabiliteitseisen) |
| Applicability | krachttraining met een externe belasting en telbare herhalingen; niet van toepassing op isometrische of tijd-gebaseerde oefeningen |
| Forbidden interpretations | nooit presenteren als een gemeten, geverifieerd 1RM; nooit gebruiken als medische/gezondheidsclaim; geen "exacte" waarde suggereren richting de sporter (UI toont het al als schatting) |
| Allowed Decision Rules | mag als basis dienen voor %1RM-gebaseerde prescriptie (CALC-STR-002) en trend-analyse; mag NOOIT zelfstandig een trainingsverbod of medische conclusie triggeren |
| AI permissions | AI mag de uitkomst uitleggen/contextualiseren; AI mag deze waarde NOOIT zelf herberekenen of een alternatieve schatting verzinnen |
| Athlete-visible values | ja, expliciet gelabeld als schatting in de UI |
| Test status | `calculation.test.js` (golden cases, incl. Epley 100kg/1rep→100, 100kg/8reps>100kg/3reps-consistentiecheck — zie F1.1/F1.2A golden-locks) |
| Status | **VERIFIED** |

### CALC-STR-002 — Working Weight voor Reps@RPE (Brzycki-inverse)
| Veld | Waarde |
|---|---|
| Domain | Strength |
| Name | Voorgesteld werkgewicht voor een gegeven reps-doel bij een gegeven RPE |
| Version | `working_weight.v1` |
| Formula | RIR = max(0, 10−RPE); repsToFailure = min(20, reps+RIR); `w = oneRM*(37−repsToFailure)/36`, afgerond via `roundKg` |
| Implementation | `core/calculation.js` — `calculateWorkingWeight` |
| Required inputs | `oneRM` (CALC-STR-001 of gemeten), `reps` (doel-herhalingen) |
| Optional inputs | `rpe` (default 8 indien ontbrekend) |
| Input units | kg, reps, RPE (schaal 0-10) |
| Output | voorgesteld werkgewicht |
| Output unit | kg (afgerond op 0,5 kg via `roundKg`) |
| Supported sports | krachttraining |
| Minimum data | geldig `oneRM` + `reps` |
| Data quality dependency | erft de betrouwbaarheid van de gebruikte `oneRM` (CALC-STR-001 of eerder gemeten waarde) |
| Evidence level | **B** — de RPE/RIR-methodiek zelf heeft een sterke en groeiende empirische basis; de exacte Brzycki-achtige omrekenformule is een technische afleiding (zie ook CALC-STR-001-beperkingen) |
| Confidence model | matig-tot-hoog bij reps 1-10 en een betrouwbare `oneRM`; lager buiten dat bereik of bij een verouderde/geschatte `oneRM` |
| Scientific sources | RPE/RIR-gebaseerde belastingsturing wordt breed ondersteund in de recente krachttrainingsliteratuur; het **ACSM 2026 Position Stand** (Currier, D'Souza, Fiatarone Singh, et al., "Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews", *Medicine & Science in Sports & Exercise*, april 2026 — 137 systematic reviews, 30.000+ deelnemers) rapporteert expliciet dat een breed bereik van belastingen (circa 30-100% van 1RM) vergelijkbare krachtresultaten oplevert **mits de set voldoende dicht bij falen wordt uitgevoerd** — dit ondersteunt direct de RPE/RIR-gestuurde benadering boven een star %1RM-voorschrift. |
| Limitations | RPE is een subjectief, contextafhankelijk signaal (opdracht sectie 21 — RPE 8 betekent niet universeel exact RIR 2 voor iedere sporter/oefening); de formule zelf is een technische afleiding, geen apart gevalideerde vergelijking |
| Applicability | krachttraining met een bekend of geschat 1RM |
| Forbidden interpretations | RPE/RIR nooit presenteren als een objectief, fysiologisch gemeten getal; de output nooit als enige/laatste woord over veiligheid presenteren |
| Allowed Decision Rules | mag gebruikt worden in prescriptie-/progressie-adviezen; mag NOOIT zelfstandig een medische claim onderbouwen |
| AI permissions | AI mag uitleggen waarom een gewicht wordt voorgesteld; AI mag dit NOOIT zelf herberekenen |
| Athlete-visible values | ja |
| Test status | `calculation.test.js` (Brzycki-golden-lock: 150kg/5reps/RPE8→125kg) |
| Status | **VERIFIED** |

### CALC-STR-003 — Volume (Tonnage)
| Veld | Waarde |
|---|---|
| Domain | Strength |
| Name | Trainingsvolume (tonnage) per set |
| Version | `volume.v1` |
| Formula | `sets * reps * weight` (RAW product, geen afronding in de core) |
| Implementation | `core/calculation.js` — `calculateVolume` |
| Required inputs | `sets`, `reps`, `weight` |
| Input units | aantal, aantal, kg |
| Output | tonnage |
| Output unit | kg (UI converteert optioneel naar ton — presentatielaag, geen aparte formule) |
| Supported sports | krachttraining |
| Minimum data | alle 3 velden aanwezig en numeriek |
| Evidence level | **A** voor het concept "volume is een belangrijke hypertrofie-driver" — het **ACSM 2026 Position Stand** rapporteert expliciet een minimale drempel van circa 10 sets per spiergroep per week met een dosis-responsrelatie daarboven; **E** voor de specifieke rekenformule zelf (een zuiver wiskundig product, geen eigen wetenschappelijke claim nodig) |
| Confidence model | volledig afhankelijk van datakwaliteit van de 3 inputs; geen eigen onzekerheid in de berekening zelf |
| Scientific sources | Currier et al. (2026), zie CALC-STR-002 |
| Limitations | tonnage alleen zegt niets over intensiteit/RPE/spiergroep-specificiteit; twee sporters met gelijke tonnage kunnen zeer verschillende trainingsbelasting ervaren |
| Applicability | krachttraining met telbare sets/reps/gewicht |
| Forbidden interpretations | tonnage nooit als enige maatstaf voor trainingskwaliteit presenteren; geen directe 1-op-1-claim "meer tonnage = betere sporter" zonder context |
| Allowed Decision Rules | mag input zijn voor Load & Progression-analyse (MS-F3-02) |
| AI permissions | AI mag tonnage-trends uitleggen; mag niet zelf herberekenen |
| Athlete-visible values | ja |
| Test status | `calculation.test.js` |
| Status | **VERIFIED** |

### CALC-STR-004 — Warmup-schema
| Veld | Waarde |
|---|---|
| Domain | Strength |
| Name | Opwarmset-schema op basis van werkgewicht |
| Version | `warmup.v1` |
| Formula | drempel-gebaseerde %/reps-tabel (bv. ≥120kg: 40%×8, 55%×5, 70%×3, 80%×2, 90%×1), afgerond via `roundKg` of `roundToIncrement` |
| Implementation | `core/calculation.js` — `calculateWarmup` |
| Required inputs | `workKg` |
| Optional inputs | `increment` (equipment-aware afronding) |
| Output | lijst van {kg, reps}-opwarmsets |
| Evidence level | **E** — technisch/praktische coachingsheuristiek, geen zelfstandige wetenschappelijke claim. Progressieve opwarmsets vóór een werkset zijn breed geaccepteerde praktijk, maar dit specifieke percentageschema is niet zelf onderwerp van een gevalideerde studie. |
| Confidence model | n.v.t. — deterministische heuristiek, geen datakwaliteitsafhankelijkheid |
| Scientific sources | geen specifieke bron voor dit exacte schema; algemene opwarm-aanbevelingen zijn wijdverbreide praktijk |
| Limitations | één-op-alle-sporters-schema; houdt geen rekening met individuele opwarmbehoefte, blessuregeschiedenis of oefeningsspecifieke opwarmeisen |
| Forbidden interpretations | nooit presenteren als wetenschappelijk gevalideerd protocol; blijft een praktische standaardsuggestie |
| AI permissions | AI mag het schema toelichten, niet zelf aanpassen zonder Decision Rule |
| Status | **TECHNICAL ONLY** (geen evidence-inflatie — expliciet niet als A/B geclassificeerd) |

### CALC-STR-005 — RPE-gebaseerde Spierherstelfactor
| Veld | Waarde |
|---|---|
| Domain | Strength / Recovery (grensgeval, hier onder Strength omdat de invoer een krachtset-RPE is) |
| Name | Effectieve hersteluren op basis van RPE-multiplier |
| Version | `recovery.v1` |
| Formula | `rpeMultiplier(rpe)`: RPE≥9→1.3, RPE≥8→1.0, anders→0.85; `calculateMuscleRecoveryPct = min(100, round(hoursSince/(baseHours*multiplier)*100))` |
| Implementation | `core/calculation.js` — `rpeMultiplier`, `calculateMuscleRecoveryPct` |
| Required inputs | `hoursSince`, `baseHours` (spiergroep-specifieke basis-hersteltijd), `rpe` |
| Evidence level | **C** — contextafhankelijk. RPE als proxy voor herstelbelasting is een redelijke, veelgebruikte heuristiek, maar geen direct gevalideerde fysiologische herstelmeting (in tegenstelling tot bijvoorbeeld HRV — zie Recovery-domein, MS-F3-03). |
| Confidence model | afhankelijk van de betrouwbaarheid van de gerapporteerde RPE zelf (subjectief) |
| Limitations | RPE≥9→1.3-factor is een productheuristiek, geen uit een specifieke studie afgeleide coëfficiënt — geclassificeerd als **product heuristic**, niet evidence-backed rule (opdracht sectie 39) |
| Forbidden interpretations | nooit presenteren als een gemeten fysiologische herstelstatus; nooit gebruiken om een medische uitspraak over overtraining te doen |
| AI permissions | AI mag de uitkomst uitleggen als één signaal, niet als volledige waarheid |
| Status | **PARTIAL** (formule technisch correct en getest, RPE-multiplier-coëfficiënten zijn ongeverifieerde product-heuristiek — expliciet gelabeld, geen evidence-inflatie) |

## Magic Number Audit (Strength-domein, sectie 38 van de opdracht)

| Waarde | Locatie | Classificatie |
|---|---|---|
| RPE≥9→1.3, RPE≥8→1.0, anders→0.85 (`rpeMultiplier`) | `calculation.js` | **Product heuristic** — niet evidence-backed, wel functioneel getest en consistent toegepast |
| Warmup-percentages (40/55/70/80/90%) | `calculation.js` | **Product heuristic** — brede coachingspraktijk, geen specifieke brontoewijzing |
| `roundKg`-halfafronding (Math.round(v*2)/2) | `calculation.js` | **Technical threshold** — praktische gewichtsplaat-granulariteit, geen wetenschappelijke claim |
| `oneRM*1.2`-plausibiliteitsgrens in `validateProposedWeight` | `calculation.js` | **Technical threshold** — AI-guardrail tegen onrealistische suggesties, geen wetenschappelijke claim |

Geen "unexplained critical threshold" gevonden in het Strength-domein — elke magic number is hierboven expliciet geclassificeerd.

## Duplicate Calculation Audit (Strength-domein)
Herbevestigd tegen de historische `claude_F1_0_CalculationRegistry.md` (F1.0-audit): de destijds gevonden duplicaten (7× `calculate1RM`, 6× `calculateVolume`, 5× `applyPercentage`) zijn sindsdien geconsolideerd naar de canonieke `core/calculation.js`-implementaties. `resolveWorkingWeight` (destijds P0 wegens een gerapporteerd "[[APPLY]]-lek") is bij herlezing van de actuele code (regel 10749) een schone, pure compositiefunctie zonder DOM/globale state-lek — dit P0-punt is niet meer reproduceerbaar en wordt hierbij gesloten. `computeGoalProgress` delegeert inmiddels expliciet naar `CalcCore.calculateGoalProgress` (comment: "F1.6/DataAccess: canonical core") — het destijds gevonden P1-punt is eveneens gesloten.
