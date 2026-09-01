# B9-H2D Coach/PT Security & Privacy Matrix

## Live, adversariaal herbevestigd in deze sessie (transacties zonder commit, 0 restanten)

| Scenario | Verwacht | Resultaat |
|---|---|---|
| Coach probeert zelf een pending-relatie naar 'active' te zetten (self-elevation) | DENIED | ✅ RLS-violation |
| C2: coach zonder relatie leest andermans relaties | DENIED | ✅ 0 resultaten |
| Women's Performance-scope, apart, default UIT | Geen automatische toegang | ✅ bevestigd in `core/coachAccess.js` (SCOPES-array + aparte `hasScope`-check) |

## Reeds volledig bewezen in F10 (146 tests, niet opnieuw gemuteerd in deze sessie om geen extra testdata te creëren -- zelf, opnieuw uitgevoerd als regressie: 79/79 groen)

- C1 (anon leest coach relationship): gedekt door RLS, F10-bewezen.
- C3 (former coach leest athlete na revoke): revoke stopt toegang direct, F10-bewezen.
- C4 (coach A wijzigt assignment van coach B): coach-owned isolatie, F10-bewezen.
- C5 (foreign organization_id): niet van toepassing -- `coach_program_assignments.organization_id` wordt nergens gebruikt door de huidige logica (zie existing-state audit).
- C7 (athlete manipuleert relationship-status naar privileged state): self-elevation architecturaal onmogelijk (F10-bewezen).
- C8 (organization admin leest private coach note): N.v.t. -- coach notes bestaan niet (zie functional model, echte gap).

## Ownership-audit (herbevestigd)

Coach-authored template = coach-owned (`coach_user_id = auth.uid()`).
Executable athlete program = athlete-owned (`programs.user_id`,
afgedwongen door de bestaande `trg_set_user_id`-trigger). Geen
verborgen uitzondering.

## AI Shadow-Audit (sectie 66, herbevestigd deze sessie)

0 treffers voor herberekening/automatische load-aanpassing in
`core/coachIntelligence.js`. `CoachIntelligenceCore` blijft een
whitelist-laag, geen calculator (F10-bewezen, niet gewijzigd).

## Privacy Shadow-Audit (sectie 67)

Geen client-side filtering gevonden die gevoelige data "verbergt" maar
de backend nog levert -- alle scope-enforcement gebeurt op RLS-niveau
(database-enforced), niet in de (nog niet-bestaande) UI-laag.

## Nieuwe, in deze sessie gevonden gaten (geen van beide security-
regressies, beide productbeslissingen/toekomstige sprints)

1. Coach notes/feedback ontbreken volledig (functioneel, zie
   functional model).
2. Entitlement-boundary ontbreekt volledig (commercial, zie
   functional model) -- **dit is GEEN acute security-regressie**
   (geen ongeautoriseerde toegang tot andermans data), maar wel een
   ontbrekende productgate (elke gebruiker, ongeacht abonnement, kan
   vandaag coach-functionaliteit gebruiken).
