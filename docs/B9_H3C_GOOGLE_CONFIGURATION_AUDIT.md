# B9-H3C Google Configuration Audit

## ACTUAL GOOGLE PRODUCT/API

**ACTUAL GOOGLE PRODUCT/API:** Google Health API v4 (`health.googleapis.com/v4`).
**NIET** Google Fit (fitness.googleapis.com, gedeprecieerd) of Android
Health Connect (lokale, on-device Android-API zonder cloud-endpoint).
Repo-brede code-audit bevestigt: 0 treffers voor `fitness.googleapis.com`
of Health Connect-SDK-referenties -- uitsluitend `health.googleapis.com`
in zowel `wearable-sync.js` als het nieuwe `wearable-sync-activities.js`.
Geen terminologie-verwarring gevonden in de bestaande documentatie die
correctie behoeft.

**AUTH METHOD:** OAuth2 + PKCE (`wearable-auth-start.js`/`wearable-
auth-callback.js`), Authorization Code-flow, `access_type=offline` +
`prompt=consent` voor een refresh_token.
**DATA API:** `GET /v4/users/me/dataTypes/{id}/dataPoints` (HRV/RHR/
sleep bestaand; `exercise` nieuw sinds B9-H3B).
**RECOVERY DATA SOURCE:** Google Health `daily-heart-rate-variability`/
`daily-resting-heart-rate`/`sleep`-datatypes.
**ACTIVITY DATA SOURCE:** Google Health `exercise`-datatype (nieuw,
B9-H3B).
**ANDROID COMPONENT:** geen apart Android-component -- de OAuth-flow
loopt volledig via de webbrowser/WebView, niet via een native Health
Connect-SDK-integratie.
**CLOUD COMPONENT:** Netlify Functions (`wearable-sync.js`, `wearable-
sync-activities.js`, `wearable-auth-*.js`).

## OAuth-configuratiestatus (niet vaststelbaar zonder Google Cloud Console-toegang)

De volgende vragen uit sectie 8 van de opdracht **kunnen niet worden
vastgesteld binnen deze sessie** -- geen toegang tot de Google Cloud
Console, geen Netlify-CLI, geen environment-variabelen zichtbaar
(bevestigd: `env | grep -iE "google"` geeft 0 resultaten in deze
sandbox):

- OAuth client configured? **NIET VASTSTELBAAR** (client-ID/secret
  worden gelezen uit `process.env.GOOGLE_HEALTH_CLIENT_ID`/
  `GOOGLE_HEALTH_CLIENT_SECRET`, productie-waarden niet zichtbaar hier).
- Required APIs enabled? **NIET VASTSTELBAAR.**
- App verification/consent screen status (Testing vs Published)?
  **NIET VASTSTELBAAR, MAAR KRITIEK RELEVANT** (zie hieronder).
- Test users configured? **NIET VASTSTELBAAR.**
- New activity scope recognized (toegevoegd aan het consent-scherm)?
  **NIET VASTSTELBAAR.**

## Kritieke, officieel geverifieerde bevinding (developers.google.com/health/setup, geraadpleegd tijdens deze sprint)

**"By default, newly created OAuth clients are in an unverified state
with a cap of 100 users for both testing and production purposes. To
enable authorization during this period, you must manually add each
user's email address to the Test users list."**

**"In Testing mode, Google refresh tokens expire after 7 days. Publish
the OAuth app before using it in production."**

Dit heeft twee directe implicaties voor Trainingskompas, die niet
kunnen worden bevestigd/ontkend zonder Console-toegang:

1. Als het project nog in **Testing**-modus staat: elke nieuwe
   gebruiker (inclusief de Product Owner zelf bij een eerste koppeling)
   moet **expliciet als test-user worden toegevoegd** in de Console
   vóórdat autorisatie mogelijk is.
2. Als het project in Testing-modus staat: **refresh tokens verlopen
   na 7 dagen** -- als bestaande, al gekoppelde gebruikers zonder
   klacht al langer dan 7 dagen HRV/RHR/sleep blijven synchroniseren,
   is dit sterk bewijs dat het project al gepubliceerd/geverifieerd is
   (Testing-mode zou anders al lang zichtbare, terugkerende
   token_expired-fouten hebben veroorzaakt). Dit kon niet worden
   geverifieerd binnen deze sessie (geen toegang tot productielogs of
   een lopend, langdurig gebruikersaccount om dit te bevestigen).

Zie `docs/B9_H3C_PRODUCT_OWNER_EXTERNAL_ACTION.md` voor de exacte,
benodigde actie.
