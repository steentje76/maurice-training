# B9-H3A Device Security & Privacy Matrix

## Live, adversariaal getest deze sessie (transacties zonder commit, 0 restanten)

| Scenario | Verwacht | Resultaat |
|---|---|---|
| DEV-S1: anon leest `wearable_connections` | DENIED | ✅ 0 resultaten |
| DEV-S2: authenticated gebruiker leest andermans `wearable_connections` | DENIED | ✅ 0 resultaten |
| DEV-S7: account deletion laat token achter | FAIL verwacht als niet gedekt | ✅ `wearable_connections`/`wearable_oauth_state` staan al expliciet in `delete-account.js`, met commentaar dat dit zowel access- als refresh-tokens betreft |

## Reeds bewezen, herbevestigd via bestaande testsuites (regressie, 0 gefaald)

- Token-vault-beveiliging: `fWearableTokenVault.test.js` (20/20).
- OAuth-security (PKCE/state/CSRF): `fWearableAuthSecurity.test.js` (20/20).
- Sync-handler-beveiliging (mocked transport, geen echte netwerktoegang in tests): `fWearableSyncHandler.test.js` (43/43).

## Niet live opnieuw getest deze sessie (geen relevante, nieuwe oppervlakte)

- DEV-S3 (disconnect van andermans provider), DEV-S4 (foreign record
  koppelen), DEV-S5 (webhook-validatie): geen webhook-mechanisme
  gevonden binnen de huidige architectuur (Google Health/Concept2
  gebruiken beide geen inkomende webhooks) -- N.v.t.
- DEV-S6 (provenance-ownership spoofen): N.v.t. zolang er geen
  generieke, multi-provider activity-import bestaat om te spoofen.
- DEV-S8 (team/coach krijgt private wearable data zonder consent):
  bevestigd via de bestaande, gescheiden scope-architectuur (B9-H2D,
  `RECOVERY_HEALTH`-scope apart, nooit automatisch via team-lidmaatschap).

## Token Security (sectie 89-90)

Repo-brede scan (deze sessie) op de gewijzigde/nieuwe bestanden: 0
secrets/tokens gecommit. Geen nieuwe bestanden met credentials
toegevoegd in deze audit-sprint.

## Telemetry Privacy (sectie 91)

Niet apart, opnieuw geaudit binnen deze sessie se tijdsbudget (geen
codewijziging aan telemetrie in deze sprint).
