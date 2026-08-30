# MS-F10-04_COACH_INTELLIGENCE.md — Trainingskompas

**Canonieke naam/acceptance:** "Coach Intelligence" -- "AI summaries constrained by same evidence/decision architecture." P2, dependencies MS-F10-03 (CLOSED) en MS-F4-01 (TESTED).

## Architectuur
CoachIntelligenceCore is uitsluitend een whitelist-/autorisatielaag, analoog aan het bestaande WomensPerformanceContextCore-patroon (F8.3). Geen nieuwe berekening -- consumeert uitsluitend reeds bestaande, canonieke outputs (AdherenceIntelligenceCore, PlateauDetectionCore, RelationshipCore).

## Scope-isolatie (hergebruikt CoachAccessCore)
TRAINING_CORE geeft adherence/plateau/progression. RECOVERY_HEALTH geeft readiness, apart. WOMENS_PERFORMANCE blijft altijd apart -- nooit afgeleid van de andere twee scopes, ongeacht of ze aan staan.

## AI Coach versus Human Coach
Expliciet vastgelegd: deze module heeft geen enkele relatie met netlify/functions/coach.js (de AI-coach-proxy voor de sporter zelf).

## Audits
Shadow-calculation-audit: 0 bevindingen (geen lokale percentage/score/threshold-berekening). Causale-taal-audit: 0 bevindingen.

## Live/adversarial verificatie
Deze sprint is volledig pure-Core (geen database-wijziging nodig -- de bestaande coach_has_scope()-RLS-laag uit MS-F10-01 is al de daadwerkelijke bron van waarheid voor alle onderliggende datatoegang). De whitelist-logica zelf is getest en sabotagebewezen op JS-niveau.

## Sabotagebewijs
De kritieke Womens Performance-isolatie tijdelijk laten volgen op TRAINING_CORE in plaats van de eigen scope -- beide relevante tests (B3, D1) exact gedetecteerd, teruggedraaid.

## Tests
core/fCoachIntelligenceCore.test.js (12/12), sabotagebewijs geleverd.

## MS-F10-04 acceptance-gate-toetsing
Letterlijke acceptance gate: "AI summaries constrained by same evidence/decision architecture."
Resultaat: CLOSED. De whitelist-contract dwingt af dat elke AI-samenvatting uitsluitend reeds-canonieke, geautoriseerde data ontvangt -- geen nieuwe berekening, geen scope-lek, geen Womens Performance-omzeiling.

## Software-bewijs versus real-world validatie
Dit bewijst dat het contract correct en veilig is. Er is geen UI/AI-promptintegratie gebouwd binnen deze sprint (consistent met MS-F10-01/02/03, backend/Core-architectuur was de scope).
