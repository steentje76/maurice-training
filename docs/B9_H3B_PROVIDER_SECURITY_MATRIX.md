# B9-H3B Provider Security Matrix

## Live, adversariaal getest deze sessie (transacties zonder commit, 0 restanten)

| Scenario | Verwacht | Resultaat |
|---|---|---|
| Anon leest `activities` | DENIED | ✅ `permission denied for table activities` (geen GRANT, striktste vorm) |
| Authenticated leest andermans `activities` | DENIED | ✅ 0 resultaten |
| S8: authenticated (niet service-role) roept `upsert_provider_activity()` aan met andermans `p_user_id` | DENIED | ✅ `not authorized to write activity data for another user` |
| Service-role roept `upsert_provider_activity()` aan namens de gebruiker (het patroon dat de Netlify-functie gebruikt) | ALLOWED | ✅ correct geschreven |
| S1: idempotentie (3x dezelfde `dedupe_key` via de RPC) | 1 rij | ✅ bevestigd |
| Manual data protection: sync probeert een `user_corrected`-rij te overschrijven | GEEN wijziging | ✅ bevestigd (5000 bleef 5000, niet 9999) |
| Sabotage: manual-protection-WHERE verwijderd | Test moet falen | ✅ gedetecteerd door de testsuite |
| Sabotage: cross-user-check verwijderd | Test moet falen | ✅ gedetecteerd door de testsuite |

## SECURITY DEFINER-audit

`upsert_provider_activity()`: expliciete `SET search_path TO
'public'`, expliciete `auth.role()`/`auth.uid()`-check, expliciete
`revoke ... from anon` naast de `grant ... to authenticated` (live
bevestigd: `anon_mag=false`, `auth_mag=true`).

## Token security (sectie 46/89)

`_wearableAuthLib.js` hergebruikt uitsluitend de bestaande,
versleutelde `wearableTokenVault.js` -- geen plaintext-tokenopslag,
geen nieuwe secret-opslagmechanisme. `GOOGLE_HEALTH_CLIENT_ID`/
`GOOGLE_HEALTH_CLIENT_SECRET` blijven server-side environment-
variabelen, nooit in client-code (repo-brede scan op de gewijzigde
bestanden: 0 secrets gecommit).

## Account deletion (sectie 50)

`activities` staat al in `delete-account.js` (B9-01) -- de nieuwe
provider-ingestion schrijft naar dezelfde, reeds gedekte tabel, dus
geen nieuwe deletion-lijst-entry nodig.

## Failure isolation (sectie 57)

`wearable-sync.js` (HRV/RHR/sleep) is in deze sprint NIET gewijzigd --
een storing in de nieuwe `wearable-sync-activities.js` kan de
bestaande, kritieke sync nooit beïnvloeden (aparte functie, aparte
foutafhandeling, gedeelde maar niet-gemuteerde token-vault).
