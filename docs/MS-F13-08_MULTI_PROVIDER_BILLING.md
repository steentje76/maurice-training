# MS-F13-08_MULTI_PROVIDER_BILLING.md — Trainingskompas

**Baseline main SHA:** `7ee214da1aad333e23d02bae98d8087fdf700701`. Datum: 30 augustus 2026. Onderzoeksdatum voor externe bronnen: 30 augustus 2026.

## Existing-state audit

package.json bevat uitsluitend @capacitor/android + @capacitor/core + @capacitor-community/bluetooth-le -- geen enkele Google Play Billing-plugin (bijv. een in-app-purchases-plugin) geïnstalleerd. Er is een Android-wrapper, maar geen native koppeling met Google Play Billing. Geen iOS-buildtarget (bevestigd in MS-F13-06).

Bestaande, provider-onafhankelijke fundamenten uit MS-F12-04 (Mollie): billing_events-tabel (provider is een vrije tekstwaarde, geen enum), reconcile_billing_event()-RPC (atomair, idempotent via unique(provider, idempotency_key), out-of-order-beschermd, service-role-only, bevat geen Mollie-specifieke logica). Deze laag is expliciet ontworpen om door een tweede/derde provider herbruikt te worden zonder schemawijziging -- bevestigd in deze sprint door Google Play en Apple StoreKit dezelfde RPC te laten aanroepen.

## Fundamentele, technische bevinding: beide nieuwe providers vereisen een native app-component die hier niet bestaat

Google Play Billing: een purchaseToken kan alleen door een echte, native Android-app met de Google Play Billing Library gegenereerd worden. Er is geen Play Billing-plugin geïnstalleerd, en het toevoegen daarvan plus een nieuwe, gecompileerde Android-build zou een aanzienlijke, nieuwe scope zijn die niet binnen deze sprint verantwoord uitgevoerd kan worden zonder een echt te testen resultaat (zou een kunstmatige, ongeteste structuur zijn).

Apple StoreKit: bevestigd in MS-F13-06 -- vereist een echte, gecompileerde, in de App Store gepubliceerde iOS-app, die hier niet bestaat en niet gebouwd kan worden (geen macOS/Xcode in deze sandbox).

Conclusie, conform de opdracht ("bouw de software-architectuur correct en classificeer provider-validatie later apart"): de SERVER-SIDE verificatie-architectuur voor beide providers wordt volledig gebouwd en met gemockte purchase-tokens/transacties getest (net als bij Mollie in MS-F12-04), maar een live, end-to-end-aankoop kan in deze sessie niet plaatsvinden voor geen van beide providers.

## Actueel onderzoek: Google Play Developer API (officiële bron, 30 augustus 2026)

purchases.subscriptions.get is deprecated; purchases.subscriptionsv2.get is de actuele, correcte endpoint: GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptionsv2/tokens/{token}, Authorization: Bearer <access_token> (OAuth2, androidpublisher-scope, via een Google Cloud service-account -- niet beschikbaar in deze sessie). subscriptionState moet SUBSCRIPTION_STATE_ACTIVE zijn. purchaseToken is globaal uniek -- veilig als primary key voor idempotentie, consistent met het bestaande billing_events.idempotency_key-patroon. ExternalAccountIdentifiers (obfuscatedAccountId, ingesteld door de client bij aankoop) is het mechanisme om een aankoop aan de juiste Trainingskompas-gebruiker te koppelen -- conceptueel identiek aan Mollie's metadata.user_id.

Belangrijke, tijdgevoelige bevinding: vanaf 31 augustus 2026 (morgen, ten opzichte van de datum van dit onderzoek) moeten alle nieuwe apps en updates Billing Library versie 8 of hoger gebruiken (met een verlenging mogelijk tot 1 november 2026) -- relevant voor een toekomstige, daadwerkelijke native implementatie, geen blocker voor deze server-side-only sprint.

## Actueel onderzoek: App Store Server API (officiële bron, 30 augustus 2026)

GET https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}, Authorization: Bearer <JWT> (zelf gegenereerd met de eigen private key uit App Store Connect, geen OAuth2-token van Apple). De response bevat signedTransactionInfo als JWS (JSON Web Signature) -- moet gedecodeerd EN de handtekening geverifieerd worden; Apple raadt de officiële app-store-server-library aan, handmatig base64-decoderen zonder handtekeningverificatie is expliciet afgeraden (onveilig). appAccountToken is het mechanisme om een transactie aan de juiste klant te koppelen (client-ingestelde UUID bij aankoop). originalTransactionId blijft consistent over renewals -- functioneert als het subscription-ID.

## Provider-neutrale architectuur (gebouwd in deze sprint)

Eén centrale statusmapping-conventie, consistent met MOLLIE_STATUS_TO_CANONICAL uit billing-webhook.js: elke provider-adapter vertaalt zijn eigen statusterminologie naar dezelfde, canonieke interne states (pending/active/failed/cancelled/expired) voordat reconcile_billing_event() wordt aangeroepen. Geen enkele provider-specifieke status komt ooit voorbij de adapter-laag de businesscode in.

netlify/functions/billing-verify-google-play.js (nieuw): server-side verificatie-endpoint. Authenticated (JWT van de gebruiker), ontvangt een purchaseToken + productId van de client, roept (bij een geconfigureerde service-account-sleutel) purchases.subscriptionsv2.get aan, mapt de canonieke state, roept reconcile_billing_event() aan met provider='google_play'. Zonder een geconfigureerde GOOGLE_SERVICE_ACCOUNT_KEY faalt dit endpoint expliciet en veilig (503, PROVIDER_NOT_CONFIGURED) -- nooit een nep-verificatie.

netlify/functions/billing-verify-apple.js (nieuw): server-side verificatie-endpoint, analoog. Authenticated, ontvangt een transactionId, roept (bij geconfigureerde Apple-credentials) de App Store Server API aan, verifieert de JWS-handtekening (of faalt expliciet als dat niet mogelijk is zonder de officiële library), mapt de canonieke state, roept reconcile_billing_event() aan met provider='apple_app_store'.

## Wat NIET gebouwd wordt

- Geen Google Play Billing Library-clientintegratie (geen native plugin, geen purchaseToken kan hier ooit echt gegenereerd worden).
- Geen StoreKit-clientintegratie (geen iOS-buildtarget).
- Geen daadwerkelijke JWS-handtekeningverificatie-implementatie voor Apple (vereist de officiële, complexe app-store-server-library met certificate-chain-validatie -- buiten de veilige, verantwoorde scope van een handmatige implementatie in deze sessie; het endpoint documenteert en faalt hier expliciet op in plaats van een onveilige, ongeverifieerde decode te doen).
- Geen live, end-to-end-verificatie met een echte purchaseToken/transactionId.

## Status

MS-F13-08: SOFTWARE ARCHITECTURE IMPLEMENTED/TESTED (mocked) — GOOGLE PLAY / APPLE STOREKIT NATIVE CLIENT INTEGRATION EN LIVE PROVIDER VALIDATION OPEN. De provider-onafhankelijke reconciliation-laag (reconcile_billing_event) is bewezen herbruikbaar voor een derde provider zonder schemawijziging. Beide nieuwe verificatie-endpoints zijn server-side correct gebouwd, met gemockte providerresponses getest, en falen veilig/expliciet zonder een geconfigureerde providersleutel -- nooit een nep-verificatie of stilzwijgende aanname.
