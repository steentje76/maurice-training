# Trainingskompas Target Product Architecture — Pain, Injury & Medical Safety Boundary

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele grens tussen training support en medische/diagnostische functionaliteit. Geen diagnose-, behandel- of medische clearanceproduct.

## 1. Doel
Trainingskompas mag relevante beperkingen en pijncontext meenemen om training veiliger en passender te maken, zonder zichzelf als medisch hulpmiddel, arts of fysiotherapeut voor te doen.

Harde regel:
`TRAINING CONTEXT != DIAGNOSIS`.

## 2. Wat wel kan
Athlete kan vrijwillig context vastleggen zoals:
- huidige beperking;
- pijn/ongemak tijdens beweging;
- tijdelijk vermeden oefeningen;
- medische professionele beperking/instructie zoals door user zelf ingevoerd;
- return-to-training status waar expliciet gebruikt;
- vrije notitie.

Deze data is user-reported tenzij extern professioneel/verified source expliciet bestaat.

## 3. Wat niet automatisch kan
TK mag niet zelfstandig:
- diagnose stellen;
- blessuretype bepalen uit symptomen;
- medische behandeling voorschrijven;
- medicatieadvies geven;
- imaging/lab interpreteren;
- return-to-play clearance geven;
- causaliteit claimen;
- acute medische urgentie wegwuiven.

## 4. Pain input
Pain score/description is subjectief. Het kan context/signaal zijn, geen objectieve tissue-damage maat.

## 5. Red flags
Als product later acute red-flag screening ondersteunt, moet dit uitsluitend via expliciet medisch/safety-governed protocol, onderhouden door bevoegde inhoudsdeskundigen, met conservatieve escalation. Geen vrije AI triage.

## 6. Escalation language
Bij signalen buiten productscope: adviseer passende professionele/acute hulp zonder diagnose. Regionale emergency guidance moet locale-safe zijn indien ooit ingebouwd.

## 7. Exercise restrictions
Athlete/coach kan expliciete restriction vastleggen, bijvoorbeeld exercise/equipment/movement tijdelijk vermijden. Restriction heeft source, reason optional, start/end/review date en scope.

## 8. Substitution
Restriction kan substitution filtering beïnvloeden. AI mag alleen toegestane alternatieven uitleggen; Decision/content rules bepalen compatibility. Geen claim `deze oefening geneest je knie`.

## 9. Coach role
Human coach/PT kan alleen binnen eigen professionele scope en athlete authorization handelen. Coach Pro entitlement is geen medische bevoegdheid.

## 10. Professional role future
Fysiotherapeut/arts/dietitian als aparte toekomstige role vereist eigen verification, permissions, liability en medical governance; niet automatisch gelijkstellen aan coach.

## 11. Recovery/readiness
Readiness/HRV/sleep/load mogen niet als medische diagnose of overtrainingdiagnose worden gepresenteerd. HRV alleen bepaalt geen rustdag.

## 12. Women's Performance
Menstruatie/cyclus/life-stage context blijft training context. Geen diagnose van hormonale aandoeningen, zwangerschap of menopauzale problemen door AI.

## 13. Pregnancy/postpartum
Deze domeinen blijven afzonderlijke productbeslissing en vereisen expliciete safety/evidence governance vóór trainingsaanpassingen. Geen impliciete uitbreiding vanuit cycle context.

## 14. Nutrition
TK geeft geen medische dieetbehandeling, allergiediagnose, deficiency diagnosis of eating-disorder treatment. Supplement/drug interactions alleen binnen expliciete evidence/safety scope.

## 15. Symptom logging
Als later symptomen worden gelogd: purpose limitation, sensitive privacy class, explicit sharing controls en geen silent AI profile inference.

## 16. Data class
Pain/injury/medical limitation context is sensitive. Niet automatisch zichtbaar voor team/gym/group/social. Coach alleen via granular consent/scope.

## 17. AI payload
AI krijgt alleen minimum necessary structured context. Raw free-text medische details niet breed naar AI sturen als canonical restriction voldoende is.

## 18. AI permissions
AI mag:
- user-entered restriction samenvatten;
- uitleggen waarom bepaalde training door registered rule is aangepast;
- verduidelijken dat systeem geen diagnose stelt;
- user helpen informatie structureren.

AI mag niet:
- diagnose raden;
- severity classificeren buiten governed protocol;
- behandeling voorschrijven;
- recovery time voorspellen zonder approved model;
- medical clearance geven.

## 19. Decision Engine
Training adaptations door pain/restriction vereisen expliciete versioned rules en confidence/applicability. `pain > X -> rest Y days` is geen default universele regel.

## 20. Evidence
Safety/medical-adjacent claims hebben evidence level, population, limitations en review. Popular fitness advice is onvoldoende als medisch feit.

## 21. User control
Athlete kan sensitive context bekijken, corrigeren, delen/intrekken en verwijderen volgens policy. Missing context betekent UNKNOWN, niet `geen blessure`.

## 22. Consent revocation
Coach/research sharing intrekken stopt nieuwe toegang en toekomstige AI/context payloads. Cached/materialized views invalidated waar relevant.

## 23. Emergency limitation
TK is geen noodhulpdienst en mag niet suggereren dat monitoring emergency detection garandeert.

## 24. Liability language
Geen absolute claims zoals `veilig`, `voorkomt blessures`, `detecteert overtraining` of `medisch verantwoord` zonder daadwerkelijk passende status/evidence.

## 25. Injury prediction
Geen harde injury-risk prediction uit ACWR, HRV, asymmetry of wearable metrics. Dergelijke metrics kunnen context zijn met beperkingen; niet causale voorspeller.

## 26. Motion sensors
Toekomstige movement quality/motion sensor kan techniek-/movement features signaleren, maar `movement deviation != injury diagnosis`. Claims vereisen validation per sensor/movement/context.

## 27. Return to training
Return-to-training flow kan user/professional restrictions, gradual training rules en observed tolerance structureren. Geen medical clearanceclaim tenzij toekomstige regulated/professional architecture dat ondersteunt.

## 28. Pain during workout
Execution kan user laten aangeven dat exercise pijn/ongemak veroorzaakt en stoppen/substitute. Safety-first action mag beschikbaar zijn zonder scoreberekening.

## 29. Historical semantics
Een oude restriction blijft historisch als context maar wordt niet automatisch als actief behandeld zonder state/end/review semantics.

## 30. Research
Sensitive pain/medical data alleen in research met study-specific scope/consent/legal governance.

## 31. Notifications
Geen gevoelige medische/pijntekst op lockscreen standaard. Geen angstgedreven nudges.

## 32. Functional >=9
Vereist duidelijke non-medical scope, sensitive classification, explicit restrictions, safe substitution linkage, granular coach consent, no AI diagnosis, registered Decision rules, no ACWR/HRV injury prediction, pregnancy/postpartum separate governance, motion-sensor claim limits, user correction/deletion, revocation propagation, safe during-workout stop path en adversarial prompt/safety tests.

## 33. UX governance
Pain/restriction input, warning/escalation, coach sharing en return-to-training flows pas visueel ontwerpen na inhoudelijke safety review en PO-approval.

## 34. Harde regels
`PAIN IS A SIGNAL, NOT A DIAGNOSIS.`
`TRAININGSKOMPAS SUPPORTS TRAINING DECISIONS; IT DOES NOT PRACTICE MEDICINE.`
`AI NEVER PROVIDES MEDICAL CLEARANCE.`
`SENSITIVE LIMITATION DATA IS PRIVATE BY DEFAULT.`
`NO INJURY-PREDICTION CLAIM FROM A SINGLE FITNESS METRIC.`