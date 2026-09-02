# B9-H6 Connected Equipment Security & Privacy Matrix

## Live, adversariaal getest deze sessie

| Scenario | Verwacht | Resultaat |
|---|---|---|
| Anon leest `sessions` | DENIED | ✅ "permission denied for function coach_has_scope" |
| Authenticated leest andermans `sessions` | DENIED | ✅ 0 resultaten |

## Reeds bewezen, herbevestigd via bestaande testsuites (0 regressie)

Concept2-connectiebeveiliging, mid-workout-isolatie (reconnect/
disconnect-veiligheid tegen state-corruptie): `fConcept2Live` (95/95),
`fConcept2MidWorkoutIsolation` (10/10).

## Device ownership != health data ownership (sectie 29)

Geen organization/gym-brede toegang tot device-sessiedata gevonden --
dezelfde `coach_has_scope()`-architectuur als HRV/Recovery/Women's
Performance wordt hergebruikt, geen nieuw, apart privacy-model nodig.

## Device control (sectie 33)

Bevestigd: 0 device-control-functionaliteit (resistance/target power/
erg mode) aanwezig -- uitsluitend read/capture. Correct, conform de
uitdrukkelijke instructie om dit niet toe te voegen binnen deze sprint.
