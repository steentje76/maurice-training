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

---

## Domein: Load & Progression (MS-F3-02)

**Auditmethode:** volledige lezing van `core/trainingLoad.js` en `core/progression.js`, plus een repo-brede zoekactie naar sRPE/rolling-load/stagnatie-signalen. Het `AthleteCore.acuteChronic()`-mechanisme zelf (de daadwerkelijke ACWR-berekening) is **protected core** (index.html) en is in deze sprint bewust NIET aangeraakt of opnieuw geïmplementeerd — alleen de reeds bestaande, losstaande classificatie-/corroboratielaag (`TrainingLoadCore`) en de nieuwe, hieronder toegevoegde sRPE-bouwstenen vallen binnen deze registry.

### CALC-LOAD-001 — ACWR-classificatie (banden)
| Veld | Waarde |
|---|---|
| Domain | Load & Progression |
| Name | Classificatie van een reeds berekende acuut:chronisch-belastingsratio (ACWR) in vier banden |
| Version | `trainingLoad.v1` (`classifyAcwr`) |
| Formula | <0.8→'lager'; <1.3→'vergelijkbaar'; <1.5→'hoger'; anders→'sterk_hoger' |
| Implementation | `core/trainingLoad.js` — `classifyAcwr`, `acwrAdvisoryText` |
| Required inputs | een reeds elders berekende ACWR-waarde (uit `AthleteCore.acuteChronic()`, protected core — deze functie berekent de ratio zelf NIET opnieuw) |
| Output | categorische classificatie + neutrale, beschrijvende NL-tekst |
| Evidence level | **C** — contextafhankelijk, NIET B. De onderliggende bandindeling is ontleend aan breed geciteerde literatuur (zie bronnen), maar ACWR als methode staat sindsdien bloot aan serieuze, gepubliceerde methodologische kritiek (zie Limitations) — dit rechtvaardigt een conservatievere classificatie dan de oorspronkelijke bron alleen zou suggereren. |
| Confidence model | daalt sterk bij een korte trainingsgeschiedenis (chronische component heeft per definitie een meerdere-weken-venster nodig); geen ingebouwde minimum-databewaking in deze classificatiefunctie zelf (die verantwoordelijkheid ligt bij `AthleteCore.acuteChronic()`) |
| Scientific sources | Gabbett, T.J. (2016). "The training-injury prevention paradox: should athletes be training smarter and harder?" *British Journal of Sports Medicine*, 50(5), 273-280. doi:10.1136/bjsports-2015-095788 (geverifieerd via web-onderzoek, exacte bandgrenzen 0.8/1.3/1.5 komen overeen met het vervolgwerk Blanch & Gabbett, 2016, "Has the athlete trained enough to return to play safely?", *BJSM* 50(8), 471-475). |
| Limitations | **belangrijke, expliciet te vermelden methodologische kritiek**: Windt & Gabbett (2018), "Is it all for naught? What does mathematical coupling mean for acute:chronic workload ratios?", *BJSM* 53(16), 988-990, wijst op "mathematical coupling" — de acute component is een deelverzameling van de chronische component, wat de ratio zelf kan vertekenen. ACWR wordt in het bredere vakgebied inmiddels als omstreden beschouwd, niet als onomstreden voorspeller. Deze registry classificeert daarom bewust als **C**, niet B. |
| Applicability | uitsluitend als één van meerdere signalen (zie `corroboratedLoadSignal`), nooit alleenstaand |
| Forbidden interpretations | **hard verboden** (expliciet zo gebouwd, zie code-commentaar): blessurevoorspelling, medische diagnose, automatische trainingsvrijstelling/-verbod, of "1.5 = gevaar" als universele waarheid. Taal is bewust neutraal-beschrijvend. |
| Allowed Decision Rules | mag uitsluitend samen met een tweede, onafhankelijk signaal (zie CALC-LOAD-002) een corroborerend signaal vormen; nooit zelfstandig een Decision Rule voeden |
| AI permissions | AI mag de classificatie en de vaste, neutrale tekst tonen/toelichten; AI mag NOOIT zelf een risico-interpretatie toevoegen die verder gaat dan de neutrale tekst |
| Athlete-visible values | ja, uitsluitend via de vaste, neutrale tekst |
| Test status | `fTrainingLoad.test.js` (45/45, dekt bandgrenzen en null-gedrag) |
| Status | **VALIDATED** (classificatiefunctie zelf getest en wetenschappelijk onderbouwd; onderliggende ACWR-berekening zelf valt buiten deze registry-scope, protected core) |

### CALC-LOAD-002 — Corroborated Load Signal
| Veld | Waarde |
|---|---|
| Domain | Load & Progression |
| Name | Corroboratieregel: ACWR-classificatie + dalende progressietrend, uitsluitend samen |
| Version | `trainingLoad.v1` (`corroboratedLoadSignal`) |
| Formula | `true` alleen als ACWR-classificatie ∈ {'hoger','sterk_hoger'} ÉN aantal dalende-trend-oefeningen ≥2 |
| Implementation | `core/trainingLoad.js` — `corroboratedLoadSignal` |
| Required inputs | CALC-LOAD-001-uitkomst + aantal oefeningen met een dalende trend (CALC-LOAD-004) |
| Evidence level | **E** — dit is een **product heuristic** (bewust conservatief, vals-positief-mijdend ontwerp — code-commentaar verwijst naar interne besluit DEC-035/DEC-036), geen zelfstandige wetenschappelijke claim. Het corrigeert wél een eerder, te zwak signaal (ACWR alleen) door multi-signal-corroboratie te eisen — een verstandig ontwerpprincipe, niet een gevalideerde formule. |
| Limitations | drempel "≥2 dalende oefeningen" is zelf een productkeuze, geen uit onderzoek afgeleide grens |
| Forbidden interpretations | zelfs de corroborerende combinatie mag nooit als blessurevoorspelling of trainingsverbod gepresenteerd worden — retourneert uitsluitend true/false, geen eigen tekst |
| Allowed Decision Rules | mag een neutrale AI-coachcontext-vermelding triggeren, nooit een automatische trainingsaanpassing |
| Status | **TECHNICAL/PRODUCT HEURISTIC** (expliciet niet als wetenschappelijk gevalideerd gelabeld) |

### CALC-LOAD-003 — Session Load (sRPE, Foster-methode) — **NIEUW, gevonden lacune**
| Veld | Waarde |
|---|---|
| Domain | Load & Progression |
| Name | Sessie-belasting via de Foster session-RPE-methode |
| Version | `trainingLoad.v1` (`sessionLoadSRPE`) |
| Formula | `round((durationSec/60) * rpe)` |
| Implementation | `core/trainingLoad.js` — `sessionLoadSRPE` (nieuw toegevoegd deze sprint) |
| Required inputs | `durationSec` (sessieduur, `sessions.duration_s` — live in Supabase geverifieerd aanwezig), `rpe` (sessie-RPE, Borg CR10, 0-10) |
| Output | arbitraire eenheden (AU) |
| Evidence level | **B** — de Foster-sRPE-methode zelf is een breed toegepaste, gevalideerde interne-belastingsmaat in de sport-/trainingswetenschap |
| Confidence model | volledig afhankelijk van de betrouwbaarheid van de gerapporteerde sessie-RPE (subjectief, per definitie) |
| Scientific sources | Foster C, Florhaug JA, Franklin J, Gottschall L, Hrovatin LA, Parker S, Doleshal P, Dodge C. "A new approach to monitoring exercise training." *Journal of Strength & Conditioning Research*. 2001;15(1):109-115. |
| Limitations | AU is een RELATIEVE, geen absolute fysiologische maat — vergelijkbaar binnen dezelfde sporter over tijd, niet tussen sporters onderling zonder verdere normalisatie; sessie-RPE dekt niet dezelfde informatie als externe (bv. GPS-)belasting |
| Applicability | elke sessie met bekende duur + sessie-RPE |
| Forbidden interpretations | nooit presenteren als fysiologisch gemeten belasting; geen absolute vergelijking tussen sporters |
| Allowed Decision Rules | mag als bouwsteen dienen voor een toekomstige rolling-load-/ACWR-achtige analyse (via CALC-LOAD-005) |
| AI permissions | AI mag de waarde toelichten, niet zelf herberekenen |
| Athlete-visible values | nog niet in de UI geïntegreerd (bouwsteen, geen UI-wijziging in deze sprint — zie Open Gaps) |
| Test status | `core/fLoadProgressionRegistry.test.js` (nieuw) |
| Status | **IMPLEMENTED/TESTED** (nieuw, minimale toevoeging — nog niet UI-geïntegreerd of live gevalideerd) |

### CALC-LOAD-004 — Progression Trend (`trendBy`)
| Veld | Waarde |
|---|---|
| Domain | Load & Progression |
| Name | Gemiddelde verandering per stap over ≥N vergelijkbare eerdere prestaties |
| Version | `progression_trend.v1` |
| Formula | `(laatste−eerste)/(n−1)`, met expliciete richting (`dir: 'min'\|'max'`); onder `minN` (default 3) → `status:'insufficient'` |
| Implementation | `core/progression.js` — `trendBy` |
| Evidence level | **E** — zuiver wiskundig signaal (gemiddelde verandering), geen zelfstandige wetenschappelijke claim nodig; de WAARDE van trendanalyse voor prestatiemonitoring is wel breed geaccepteerde sportwetenschappelijke praktijk |
| Limitations | gevoelig voor uitschieters bij kleine `n`; geeft nooit een oorzaak, alleen een richting |
| Forbidden interpretations | **cruciaal**: deze functie bepaalt zelf NOOIT "deload nodig" of "stagnatie vereist ingrijpen" — dat blijft exclusief Decision Engine-logica (MS-F3-07). `trendBy`/`isNewBest` zijn pure signalen. |
| Allowed Decision Rules | mag input zijn voor een toekomstige, expliciete Decision Rule over stagnatie |
| Status | **VERIFIED** (bestaand, `fVoortgang.test.js`/gerelateerde tests dekken dit al) |

### CALC-LOAD-005 — Rolling Load Sum — **NIEUW, minimale bouwsteen**
| Veld | Waarde |
|---|---|
| Domain | Load & Progression |
| Name | Som van sRPE-waarden binnen een aangeleverd venster |
| Version | `trainingLoad.v1` (`rollingLoadSum`) |
| Formula | `Σ srpeValues` (ongeldige/niet-numerieke waarden genegeerd) |
| Implementation | `core/trainingLoad.js` — `rollingLoadSum` (nieuw toegevoegd deze sprint) |
| Evidence level | **E** — zuivere optelling, geen zelfstandige claim |
| Limitations | levert alleen de bouwsteen; een daadwerkelijke acute:chronisch-ratio op sRPE-basis is NIET gebouwd in deze sprint (dat zou een nieuwe, aparte ratio naast de bestaande, protected-core volume-ACWR zijn — bewust niet toegevoegd zonder aangetoonde productnoodzaak, zie Open Gaps) |
| Forbidden interpretations | een som van sRPE-waarden is nooit zelfstandig een blessurerisico- of vermoeidheidsclaim; alleen een bouwsteen voor een toekomstige, expliciet ontworpen trendanalyse |
| Status | **IMPLEMENTED/TESTED** |

## Magic Number Audit (Load & Progression-domein)

| Waarde | Locatie | Classificatie |
|---|---|---|
| ACWR-bandgrenzen 0.8/1.3/1.5 | `trainingLoad.js` | **Evidence-backed** (Gabbett 2016/Blanch & Gabbett 2016), met expliciet vermelde methodologische kritiek — zie CALC-LOAD-001 |
| Corroboratiedrempel "≥2 dalende oefeningen" | `trainingLoad.js` | **Product heuristic** — bewust conservatief ontwerp (DEC-035/036), geen wetenschappelijke bron |
| `trendBy`-default `minN=3` | `progression.js` | **Technical threshold** — minimum voor een zinvolle trendrichting, geen specifieke studiebron |
| Foster sRPE-formule (duur×RPE) | `trainingLoad.js` (nieuw) | **Evidence-backed** (Foster et al. 2001) |

Geen onverklaarde critical threshold gevonden in dit domein.

## Duplicate Calculation Audit (Load & Progression-domein)
Geen duplicaat gevonden: `AthleteCore.acuteChronic()` (protected core, de daadwerkelijke ACWR-berekening) is de enige plek die deze ratio berekent; `TrainingLoadCore` classificeert uitsluitend een reeds berekende waarde. `trendBy`/`isNewBest` in `progression.js` zijn eveneens single-source — geen concurrerende implementatie elders in de codebase gevonden.

## Open Gap (P2, genoteerd, niet binnen deze sprint gebouwd)
De nieuwe sRPE-bouwstenen (CALC-LOAD-003/005) zijn nog niet in de UI of AI-coachcontext geïntegreerd, en er bestaat nog geen sRPE-gebaseerde rolling-load-trend (los van de bestaande, volume-gebaseerde ACWR). Dit zou een aparte, product-beslissing-vereisende toevoeging zijn (een tweede "belasting"-signaal naast de bestaande ACWR kan verwarrend zijn zonder doordachte UX) — bewust niet binnen deze audit-sprint gebouwd zonder die afweging. Geregistreerd in `docs/GAP_ANALYSIS_V2.md` als GAP-P2-009.

---

## Domein: Recovery (MS-F3-03)

**Auditmethode:** volledige lezing van de HRV-baseline-keten (`hrvBaseline`, `hrvRollingRecent`, `hrvStPersonal`, `hrvDagFactorPersonal`, `lnRmssd`), de dagfactor-compositie (`dagfactor`, `CalcCore.calculateDayFactor`), de Recovery Score (`CalcCore.recoveryScore`), en `rhrBaselineDelta`. Live geverifieerd tegen het `hrv_log`-schema in Supabase.

### CALC-REC-001 — HRV-baseline (Ln-RMSSD, rollend gemiddelde + SWC)
| Veld | Waarde |
|---|---|
| Domain | Recovery |
| Name | Persoonlijke HRV-baseline met "smallest worthwhile change" (SWC) |
| Version | intern ongenummerd (index.html-functiegroep `hrvBaseline`/`hrvRollingRecent`/`hrvStPersonal`/`lnRmssd`) |
| Formula | `lnRmssd(v) = ln(v)` (v>0); baseline = gemiddelde + SD van `lnRmssd`-waarden over een venster; SWC = 0,5×SD; classificatie 'g'/'o'/'r'/'ref' op basis van het rollend 7-daags gemiddelde t.o.v. baseline±SWC |
| Implementation | `index.html` — `lnRmssd`, `hrvBaseline`, `hrvRollingRecent`, `hrvStPersonal` |
| Required inputs | reeks `{date, hrv}`-metingen (uit `hrv_log`) |
| Minimum data | `HRV_BASELINE_MIN_DAYS=14` dagen ÉN `HRV_BASELINE_MIN_N=4` metingen — anders `fase:'referentie'`, geen persoonlijke claim mogelijk (correct "unknown", geen fabricage) |
| Evidence level | **B** — de Ln-RMSSD-transformatie + rollend-gemiddelde + SWC-aanpak is een gevestigde, veelgeciteerde methodologie in de HRV-guided-training-literatuur |
| Confidence model | expliciet gefaseerd: `'referentie'` (onvoldoende data, factor altijd neutraal 1.00) → `'voorlopig'` (≥14 dagen) → `'volledig'` (≥`HRV_BASELINE_FULL_DAYS=28` dagen) |
| Scientific sources | Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. "Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring." *Sports Medicine*. 2013;43(9):773-781. (opnieuw geverifieerd via web-onderzoek: Ln-RMSSD als "meest betrouwbare en praktisch toepasbare maat voor dagelijkse monitoring", 7-daags rollend gemiddelde, SWC=0,5×SD — exact de in de code geïmplementeerde aanpak). |
| Limitations | HRV kent aanzienlijke dag-tot-dag-variabiliteit door meetcondities (houding, tijdstip, cafeïne — niet gestandaardiseerd in deze app); bij zeer hoge individuele HRV kan een "parasympathetic saturation"-fenomeen de lineaire aanname verstoren (Plews et al., 2013) — niet gecorrigeerd in deze implementatie, wel een bekende beperking |
| Applicability | uitsluitend sporters met voldoende, regelmatige HRV-metingen; geen enkele claim tijdens de referentiefase |
| Forbidden interpretations | **hard vereist** (opdracht-guardrail): HRV alleen mag nooit overtraining diagnosticeren, een medische toestand vaststellen, een verplichte rustdag afdwingen, of blessure voorspellen. Code-implementatie bevestigt dit: `hrvDagFactorPersonal` levert uitsluitend een dagfactor-COMPONENT (0.85-1.05), nooit een zelfstandig advies. |
| Allowed Decision Rules | mag uitsluitend als één component in de bredere dagfactor-/Recovery-Score-compositie meewegen (CALC-REC-002/003), nooit zelfstandig een trainingsbeslissing bepalen |
| AI permissions | AI mag de classificatie en context uitleggen; AI mag NOOIT zelf een HRV-gebaseerde medische of trainingsclaim toevoegen |
| Test status | geen dedicated unit-test-bestand gevonden voor deze specifieke functiegroep binnen `core/`; functies leven in `index.html` (niet in de pure-core-extractie). Genoteerd als vervolgpunt (zie Open Gaps). |
| Status | **PARTIAL** (wetenschappelijk goed onderbouwd en functioneel correct gebouwd; ontbrekende dedicated unit-test voor deze specifieke functiegroep) |

### CALC-REC-002 — Dagfactor (HRV × slaap × cyclus, samengesteld)
| Veld | Waarde |
|---|---|
| Domain | Recovery |
| Name | Samengestelde dagfactor uit HRV-, slaap- en cycluscomponent |
| Version | `dayfactor.v1` |
| Formula | `clamp(hrvFactor × slaapDagFactor(uren) × cyclusDagFactor(fase), 0.85, 1.05)`, afgerond op 2 decimalen |
| Implementation | `core/calculation.js` — `calculateDayFactor`; `index.html` — `dagfactor` (orchestratie) |
| Required inputs | `hrvFactor` (CALC-REC-001-uitkomst, of 1.00 neutraal), `sleepHours`, `cyclePhase` (optioneel, alleen relevant bij vrouwelijke sporters) |
| Evidence level | **C** — contextafhankelijk. Elke individuele component (HRV, slaap) heeft een eigen evidence-basis, maar de SPECIFIEKE combinatie via vermenigvuldiging + clamp(0.85, 1.05) is een **productontwerp**, geen uit één studie afgeleide formule. |
| Limitations | vermenigvuldiging van drie factoren impliceert onafhankelijkheid tussen HRV/slaap/cyclus, wat fysiologisch niet exact klopt (bv. slechte slaap beïnvloedt vaak ook HRV) — een bekende, geaccepteerde vereenvoudiging, geen gevalideerd multiplicatief model |
| Forbidden interpretations | de dagfactor is "puur informatief" (code-commentaar) en past nooit automatisch een ingevuld gewicht aan zonder expliciete gebruikersactie |
| Allowed Decision Rules | voedt `readinessPercent`/`recoveryScore` (CALC-REC-003) en de bestaande `computeProgAdjustment` (Decision-laag, buiten deze registry-scope) |
| Test status | `calculation.test.js` (dekt `calculateDayFactor`) |
| Status | **VERIFIED** (bestaand, correct getest) |

### CALC-REC-003 — Recovery Score (0-100, gewogen samengesteld)
| Veld | Waarde |
|---|---|
| Domain | Recovery |
| Name | Eén zichtbare 0-100 herstelscore uit beschikbare signalen |
| Version | `recovery_score.v1` |
| Formula | gewogen gemiddelde van beschikbare componenten: dagfactor (via `readinessPercent`) 0,45 · gemiddeld spierherstel-% 0,30 · RHR-delta 0,15 · subjectief gevoel 0,10 — **gewichten worden herverdeeld over uitsluitend de daadwerkelijk aanwezige componenten** (geen fabricage bij ontbrekende data) |
| Implementation | `core/calculation.js` — `recoveryScore`, `readinessPercent`, `recoveryBand` |
| Evidence level | **D** — de individuele componenten (dagfactor, spierherstel) hebben elk hun eigen, hierboven vermelde evidence, maar de SPECIFIEKE gewichtsverdeling (45/30/15/10%) is een **product heuristic** zonder eigen wetenschappelijke bron — code-commentaar bevestigt dit expliciet ("sprint-default"). Dit is bewust conservatief geclassificeerd: een samengestelde score die zich presenteert als één getal verdient een lager evidence-niveau dan zijn best-onderbouwde component. |
| Confidence model | **expliciet en reproduceerbaar**: `confidence: comps.length>=3 ? 'hoog' : comps.length===2 ? 'gemiddeld' : 'laag'`; 0 componenten → `score:null, confidence:'geen'` (nooit een score fabriceren zonder data) |
| Limitations | de gewichtsverdeling is niet gevalideerd tegen een externe uitkomstmaat (bv. prestatie of blessurecijfers); band-grenzen (≥80 hoog, ≥60 gemiddeld) zijn eveneens een productkeuze |
| Forbidden interpretations | de score is nooit een medische of fysiologische meting; een "laag"-band betekent niet automatisch een blessurerisico of noodzaak tot rust |
| Allowed Decision Rules | mag getoond worden als coachcontext; mag NOOIT automatisch trainingsinhoud wijzigen zonder de aparte, expliciete `computeProgAdjustment`-Decision-laag |
| AI permissions | AI mag de score en de aanwezige componenten toelichten; AI mag NOOIT de score zelf herberekenen of de ontbrekende componenten invullen |
| Test status | `calculation.test.js` |
| Status | **VERIFIED** (functioneel correct en transparant; evidence-classificatie bewust conservatief D, zie boven — geen evidence-inflatie) |

### CALC-REC-004 — RHR-baseline-delta
| Veld | Waarde |
|---|---|
| Domain | Recovery |
| Name | Rusthartslag t.o.v. het eigen historisch gemiddelde |
| Version | intern ongenummerd (`rhrBaselineDelta`) |
| Formula | `vandaag − gemiddelde(eerdere metingen)`, afgerond op 1 decimaal; `<2` metingen → `null` |
| Implementation | `index.html` — `rhrBaselineDelta` |
| Evidence level | **C** — een verhoogde RHR t.o.v. de eigen baseline is een breed erkend, niet-specifiek herstelsignaal (kan wijzen op vermoeidheid, ziekte, stress, of niets) |
| Limitations | geen enkele oorzaak wordt onderscheiden; minimum van 2 metingen is zeer laag voor een betrouwbare baseline (in tegenstelling tot HRV's striktere `MIN_N=4`/`MIN_DAYS=14`) |
| Forbidden interpretations | **expliciet in code bevestigd**: "geen enkelvoudige verhoogde RHR automatisch als 'slecht herstel' presenteren zonder context" — de delta wordt uitsluitend als component in CALC-REC-003 gebruikt, nooit los getoond als diagnose |
| Status | **PARTIAL** (functioneel correct; het lage minimum van 2 metingen is een reëel, niet volledig opgelost aandachtspunt — zie Open Gaps) |

## Sleep — brononderscheid (gevonden gap)
Live geverifieerd tegen het `hrv_log`-schema in Supabase: de tabel bevat **geen provenance-kolom**. `sleep`/`hrv`/`rhr` kunnen zowel uit een handmatige check-in als uit wearable-sync afkomstig zijn, zonder dat dit onderscheid ergens wordt vastgelegd. Dit is een reële afwijking van de opdrachtvereiste ("maak brononderscheid... provider-score niet herlabelen als eigen TK-calculation"). **Niet binnen deze sprint gecorrigeerd** — een DB-migratie (nieuwe `source`-kolom) plus aanpassing van alle schrijfpaden (`saveHRV`, wearable-sync-functies) is een grotere, zorgvuldiger te plannen ingreep dan verantwoord binnen een audit-sprint. Geregistreerd als GAP-P1-007 (zie hieronder — P1 omdat dit de betrouwbaarheid van de hele Recovery-keten raakt, niet slechts cosmetisch is).

## Magic Number Audit (Recovery-domein)

| Waarde | Locatie | Classificatie |
|---|---|---|
| `HRV_BASELINE_MIN_DAYS=14`, `HRV_BASELINE_FULL_DAYS=28`, `HRV_BASELINE_MIN_N=4` | index.html | **Evidence-backed** (consistent met Plews et al.'s aanbeveling van minimaal 3-5 metingen/week) |
| `HRV_SWC_MULTIPLIER=0.5` | index.html | **Evidence-backed** (Plews et al., letterlijk "0.5 SD as the smallest worthwhile change") |
| `HRV_SEVERE_DROP_PCT=0.15` | index.html | **Product heuristic** — code citeert zelf "athletedata.health" (een coaching-webbron, geen peer-reviewed studie) — terecht NIET als evidence-backed geclassificeerd, ondanks de nabijheid van de wél sterk onderbouwde SWC-drempel in dezelfde functie |
| Recovery Score-gewichten (45/30/15/10%) | calculation.js | **Product heuristic** (code-commentaar: "sprint-default") |
| Recovery-band-grenzen (≥80/≥60) | calculation.js | **Product heuristic** |
| RHR-delta-scoreformule (`100−delta×6`, plafond bij +17bpm) | calculation.js | **Technical/product heuristic** — geen specifieke brontoewijzing |

Geen onverklaarde critical threshold gevonden — inclusief het belangrijke onderscheid tussen de wél sterk onderbouwde SWC-drempel en de ernaast liggende, zwakker onderbouwde "ernstige daling"-drempel binnen dezelfde functiegroep (sectie 51/52 van de opdracht: claim-specifieke, niet functie-brede evidence).

## Duplicate Calculation Audit (Recovery-domein)
`readinessPercent` had volgens code-commentaar ooit een duplicaat (`v43GereedheidScore` in index.html) — dit is al in een eerdere sprint (Sprint 14, per het commentaar) geconsolideerd tot één canonieke implementatie in `calculation.js`, met `v43GereedheidScore` nu als dunne wrapper. Geen actieve duplicatie meer aangetroffen.

## Open Gaps (Recovery-domein)
- **GAP-P1-007** (nieuw, deze sprint): `hrv_log` heeft geen provenance-kolom — handmatige en wearable-afkomstige metingen zijn niet te onderscheiden. P1 omdat dit de betrouwbaarheid van de gehele Recovery-keten raakt.
- **GAP-P2-011** (nieuw, deze sprint): geen dedicated `core/`-unit-test voor de HRV-baseline-functiegroep (leeft nog in `index.html`, niet in de pure-core-extractie zoals `calculation.js`).
- **GAP-P2-012** (nieuw, deze sprint): `rhrBaselineDelta`'s minimum van 2 metingen is laag vergeleken met HRV's striktere gates — mogelijk een inconsistentie in hoe streng elk Recovery-signaal zijn eigen datakwaliteit bewaakt.
