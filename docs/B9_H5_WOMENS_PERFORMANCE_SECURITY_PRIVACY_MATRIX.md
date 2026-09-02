# B9-H5 Women's Performance Security & Privacy Matrix

## Live, adversariaal getest deze sessie

| Scenario | Verwacht | Resultaat |
|---|---|---|
| Anon leest `cycle_periods` | DENIED | ✅ "permission denied for function coach_has_scope" |
| RLS-policy gebruikt aparte `WOMENS_PERFORMANCE`-scope (niet gedeeld met Recovery) | correcte isolatie | ✅ bevestigd: `coach_has_scope(auth.uid(), user_id, 'WOMENS_PERFORMANCE')`, apart van de `RECOVERY_HEALTH`-scope uit B9-H4 |
| Athlete-only default (`cycle_periods_eigen_data_alleen`) | `user_id = auth.uid()` | ✅ bevestigd |

## Consent-model (F8, herbevestigd via 9/9 `fWomensPrivacyConsent`)

Niet opnieuw, live gemuteerd tijdens deze sprint (geen wijziging aan
het consent-model zelf). Zelfstandig herdraaid, 0 regressie.

## Causale/medische taal-audit (sectie 32-33, herbevestigd)

0 actieve overtredingen gevonden in `core/cycle.js`/`core/decision.js`/
`core/cycleTraining.js`. De enige treffers zijn commentaarregels die de
verboden patronen zelf expliciet benoemen als waarschuwing voor
toekomstige ontwikkelaars.

## Decision Rules-grens (sectie 30, herbevestigd)

0 cyclusfase-termen in `decision.js` -- bevestigt dat er geen
categorie-gebaseerde trainingsregel bestaat ("menstruatie -> rust").
Cyclus-training-correlatie (`cycleTraining.js`) is expliciet neutraal,
puur feitelijk, met een harde ondergrens tegen false precision.
