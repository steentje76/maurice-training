# B9-H4 Recovery Security & Privacy Matrix

## Live, adversariaal getest deze sessie

| Scenario | Verwacht | Resultaat |
|---|---|---|
| Anon leest `hrv_log` | DENIED | ✅ "permission denied for function coach_has_scope" -- functieniveau-weigering |
| Anon execute op `coach_has_scope()` | DENIED | ✅ `has_function_privilege('anon',...)` = false |
| Account deletion dekt `hrv_log` | JA | ✅ bevestigd, reeds bestaand |

## Coach/Team-privacy (hergebruikt, B9-H2D, niet gewijzigd)

`hrv_log`-RLS gebruikt `coach_has_scope()` -- dit bevestigt dat de
RECOVERY_HEALTH-scope-architectuur uit B9-H2D daadwerkelijk op
`hrv_log` is toegepast (niet alleen conceptueel gedocumenteerd). Een
coach krijgt dus alleen toegang met expliciete, athlete-gecontroleerde
scope-toestemming -- geen automatische toegang via een team- of
organisatie-relatie.

## AI Boundary (repo-brede audit, herbevestigd)

`core/decision.js`: HRV blijft één van zes readiness-signalen, geen
enkelvoudige trigger. Geen shadow-calculation gevonden in de recovery-
laag buiten `calculation.js` (herbevestigd via repo-brede grep tijdens
deze sprint).
