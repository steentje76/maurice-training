# MS-F3-07_DECISION_RULE_REGISTRY.md — Trainingskompas

**Auditmethode:** volledige lezing van `core/decision.js` (849 regels), repo-brede zoekactie naar alle consumers van `classifyAcwr`/`corroboratedLoadSignal`/`hrvDagFactorPersonal`/`hrvStPersonal`, en een gerichte zoekactie naar AI-prompt-ingebedde numerieke beslislogica.

## Belangrijke bevinding: reeds uitzonderlijk mature Decision-infrastructuur
`core/decision.js` bevat al een onveranderlijk evidence-snapshot-mechanisme (`buildDecisionEvidence`) dat exact de traceerbaarheid biedt die MS-F3-10 zal vereisen: raw→calculated→decision→rule→explanation, deterministisch, nooit met terugwerkende kracht gewijzigd. Elke regel documenteert expliciet zijn eigen "geen fabricage"-principe.

## 9 Decision Rules geregistreerd
Volledige inventaris in `docs/DECISION_RULE_REGISTRY.md`: progressie (RPE-gebaseerd), herstelaanpassing, gereedheid (3 zones), detraining, rusttijd-schaling, set-uitkomst, samengestelde dagreadiness, ACWR-adviestekst, gecorroboreerd belastingssignaal. Elke regel heeft precies één canonieke implementatie — geen duplicaten gevonden.

## Guardrail-heraudit: ACWR en HRV — beide bevestigd intact
Alle vindplaatsen van `classifyAcwr`/`corroboratedLoadSignal`/`hrvDagFactorPersonal`/`hrvStPersonal` in `index.html` afzonderlijk gecontroleerd. Geen enkele consumer schendt de guardrails: ACWR wordt nooit als blessurevoorspeller of medische risicoscore gepresenteerd; HRV diagnosticeert nooit overtraining of dwingt nooit een rustdag af. `readinessDay()`'s eigen commentaar bevestigt expliciet dat een "rest/stop"-zone bewust niet bestaat — "een zone zonder regel zou een verzonnen oordeel zijn."

## AI als tweede Decision Engine: geen violatie gevonden
Repo-brede zoekactie naar prompt-ingebedde numerieke decision-instructies (bv. "verlaag training met X% als Y") leverde geen treffers op. De AI ontvangt uitsluitend reeds-besloten uitkomsten met de expliciete instructie deze niet te wijzigen (MS-F3-06 al bevestigd).

## Magic number audit
Alle Decision-thresholds (RPE-drempels, herstel-drempels, readiness-drempels, rust-schalingsfactoren) correct als product heuristic geclassificeerd — geen enkele ten onrechte als evidence-backed gepresenteerd. Geen onverklaarde critical threshold.

## Nieuw: test met een bijzonder sterk sabotagebewijs
`core/fDecisionRuleRegistry.test.js` (20/20): golden cases voor elke kernregel, determinisme-check, en een kritieke guardrail-test die bevestigt dat `readinessDay()` nooit een niet-gedefinieerde zone kan opleveren. Het sabotagebewijs (een verzonnen `'stop'`-zone geïnjecteerd) toonde een sterker resultaat dan verwacht: de code crasht zelfs bij een poging tot een onbevoegde zone (geen tekst gedefinieerd voor `'stop'` in `READINESS_ZONE_TEKST`), wat een extra, ingebouwde beschermingslaag bevestigt. Volledig teruggedraaid en geverifieerd.

## MS-F3-07 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Rule IDs, versions, inputs, outputs, thresholds, forbidden use."*
**Resultaat: CLOSED.** Alle 9 regels volledig geregistreerd, guardrails heraudit en bevestigd intact, geen AI-decision-violatie, geen duplicatie, geen onverklaarde threshold.
