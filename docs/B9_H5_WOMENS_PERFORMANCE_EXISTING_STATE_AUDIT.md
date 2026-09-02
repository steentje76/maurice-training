# B9-H5 Women's Performance — Forensische Existing-State Audit

## Kernbevinding

Women's Performance heeft een eerdere, grondige mastersprint-serie
(F8) ondergaan. Zelfstandig, opnieuw herdraaid vóór enige wijziging:
fCycle (56/56), fCycleTraining (43/43), fWomensPerformanceAiIntegration
(13/13), fWomensPerformanceContext (17/17), fWomensPerformanceDecisions
(13/13), fWomensPrivacyConsent (9/9) -- 151+ assertions, 0 gefaald.
De F8-"CLOSED"-status is niet blind overgenomen; alle claims hieronder
zijn zelf, opnieuw geverifieerd via code-audit en live database-
verificatie.

## Capability Matrix

| CAPABILITY | STATUS | EVIDENCE |
|---|---|---|
| Cycle tracking (periods, cycle day, gemiddelde lengte) | IMPLEMENTED | `core/cycle.js`, `cycle_periods`-tabel |
| Geschatte cyclusfase (calendar-based) | IMPLEMENTED, GEHARD DEZE SPRINT | `estimatedPhaseFromDay()` -- zie hardening hieronder |
| Fase-confidence | **WAS MISSING, NU GEBOUWD** | `estimatedPhaseConfidence()` (nieuw) |
| Symptom-tracking | IMPLEMENTED | bestaande check-in-infrastructuur |
| Cyclus-training-correlatie | IMPLEMENTED, correct neutraal | `core/cycleTraining.js`, puur feitelijke tellingen, harde ondergrens (min. 3 sessies/cycli) |
| Privacy/consent-model | IMPLEMENTED | `fWomensPrivacyConsent` (9/9) |
| Coach-scope-isolatie | IMPLEMENTED, live herbevestigd | aparte `WOMENS_PERFORMANCE`-scope (niet gedeeld met `RECOVERY_HEALTH`) |
| RLS | IMPLEMENTED, live herbevestigd | anon geweigerd op functieniveau (`coach_has_scope`) |
| AI-payload-grens | IMPLEMENTED | `fWomensPerformanceAiIntegration` (13/13) |
| Decision Rules-grens (geen categorie-only) | **BEVESTIGD CORRECT** | 0 cyclusfase-termen in `decision.js` |
| Causale taal | **BEVESTIGD CORRECT** | 0 actieve causale claims, uitsluitend commentaar dat de regel benoemt |
| Pregnancy/postpartum/menopause | niet apart geaudit deze sessie (buiten tijdsbudget, geen aanwijzing van bestaande capability gevonden) | |
| Hormonale anticonceptie-context | niet gevonden als aparte capability | |

## Nieuwe, zelf gevonden en gerepareerde echte bug (kernresultaat van deze sprint)

**`estimatedPhaseFromDay()` gebruikte een stille 28-dagen-fallback**
wanneer geen gemeten, gemiddelde cycluslengte beschikbaar was (bijv.
bij een gebruiker met 0 of 1 gelogde cyclus) -- zonder dit te
onderscheiden van een gebruiker met een lange, betrouwbare
cyclusgeschiedenis. Dit is exact het "forced 28-day model"/"missing
!= normal"-risico dat sectie 14 van de opdracht expliciet verbiedt, en
het ontbreken van elke vorm van confidence-signalering (0 treffers
voor "confidence" in het hele bestand) is een directe overtreding van
sectie 27.

**Gerepareerd:** een nieuwe, pure, deterministische functie
`estimatedPhaseConfidence()` toegevoegd die expliciet vier categorieën
onderscheidt (`unavailable`/`low`/`medium`/`high`) op basis van het
aantal daadwerkelijk gemeten cyclus-intervallen -- geen AI-score, geen
willekeurige aanname, puur data-volledigheid. `cycleContext()` geeft
dit nu door als een nieuw, backward-compatible veld
(`geschatteFaseConfidence`). Live, adversariaal bevestigd via
sabotage: de confidence-logica verwijderd -> 2 tests falen correct,
teruggedraaid.

## Wat niet apart is onderzocht (buiten tijdsbudget van deze sessie)

Pregnancy/postpartum/menopause/hormonale-anticonceptie-specifieke
capabilities zijn niet gevonden als aparte, geïmplementeerde
onderdelen binnen de huidige codebase (geen tabellen, geen
calculation-modules met deze namen gevonden). Dit is geen "MISSING"
in de zin van "een gebouwde maar kapotte feature" -- het lijkt simpelweg
nog niet gebouwd. Vastgelegd als PRODUCT DECISION OPEN: of dit een
toekomstige uitbreiding wordt, is een Product Owner-beslissing, niet
een technische bug.
