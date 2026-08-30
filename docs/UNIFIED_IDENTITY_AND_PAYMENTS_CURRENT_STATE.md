# UNIFIED_IDENTITY_AND_PAYMENTS_CURRENT_STATE.md — Trainingskompas

**Baseline main SHA:** `54f6772caf438e126fb37aee5dd9b983d604d9ae` (F12: MS-F12-01/02/03 CLOSED en gemergd; MS-F12-04 in uitvoering op `feature/ms-f12-04-billing-reconciliation`, nog niet gemergd). Datum: 30 augustus 2026.

## ROADMAP PLACEMENT (verplichte governance-check, uitgevoerd vóór enige implementatie)

Repo-breed doorzocht: TRAININGSKOMPAS_MASTER_ROADMAP.md, ROADMAP_INDEX.json, CAPABILITY_REGISTRY.md op google/apple/federated/oauth/storekit/play billing. Resultaat: 0 treffers voor social login (Google/Apple Sign-In), Google Play Billing, of Apple StoreKit als canonieke roadmap-items. De enige "Apple"-vermeldingen betreffen MS-F5-04 Apple HealthKit Architecture -- wearable-/gezondheidsdata-integratie (F5), een volledig ander domein dan authenticatie of betalingen.

Conclusie: deze opdracht beschrijft functionaliteit die niet bestaat als goedgekeurde mastersprint binnen de huidige, vrijgegeven roadmap. F12 is expliciet vrijgegeven voor MS-F12-01 t/m MS-F12-04 (met Mollie als enige, expliciet onderzochte provider voor MS-F12-04). Conform de eigen governance-instructie van deze opdracht wordt dit document daarom een ontwerp- en roadmap-voorstel, geen implementatie.

## CURRENT STATE

### Authentication
- Uitsluitend directe Supabase-authenticatie: grant_type=password (login), /auth/v1/signup (registratie), grant_type=refresh_token. Geen enkele OAuth-identity-provider voor account-login.
- De enige bestaande Google OAuth-flow (wearable-auth-start.js) is voor Google Health API-data-toegang (F5, wearable-sync) -- functioneel en technisch volledig gescheiden van accountidentiteit.
- public.users (gekoppeld aan auth.users.id) is al de bestaande, centrale identiteitssleutel -- exact het gewenste canonical-user-id-patroon, al aanwezig.
- Geen account-linking-mechanisme (geen enkele provider om aan te linken).
- Accountverwijdering (delete-account.js) is volledig, getest (27 assertions), gaat uit van één auth.users.id.

### Payments
- Mollie: architectuur in ontwikkeling binnen MS-F12-04. billing_events-tabel en reconcile_billing_event()-RPC (idempotent, out-of-order-beschermd, service-role-only) zijn gebouwd en live adversarial getest. billing-checkout.js/billing-webhook.js zijn geschreven, nog niet getest/gecommit.
- Geen enkele Google Play Billing- of Apple StoreKit-integratie bestaat.
- users.individual_plan_key/status/expires_at (MS-F12-02) is de bestaande, canonieke entitlement-brontabel.

### Mobile
- PWA + Capacitor-Android-wrapper bestaat. Geen iOS-project/Capacitor-iOS-target gevonden. Geen Google Play Console- of Apple Developer/StoreKit-configuratie in de repo.

## GAPS
1. Geen federated identity (Google/Apple Sign-In).
2. Geen Google Play Billing-serververificatie -- vereist Google Cloud-service-account en Play Console-configuratie, niet beschikbaar in deze sessie.
3. Geen Apple StoreKit/App Store Server API-integratie -- vereist Apple Developer-account en (voor volledige validatie) een fysiek iOS-apparaat.
4. Geen iOS-buildtarget in de repository.
5. Geen canonieke, providerneutrale entitlements-tabel (huidige structuur is enkelvoudig-plan, Mollie-geschikt maar niet multi-source-ontworpen).

## RISKS
- Google/Apple Sign-In vereist zorgvuldige account-linking-logica (voorkomen van dubbele accounts) -- niet lichtvaardig "erbij" te bouwen binnen een reeds lopende sprint.
- Google Play Billing en Apple StoreKit vereisen elk hun eigen, officiële server-side verificatie-architectuur, functioneel volledig verschillend van Mollie -- drie providers tegelijk in een ongeplande sprint vergroot het risico op shadow-fouten (zoals meermaals gevonden in F11/F12).
- Zonder echte Apple/Google-developer-credentials en een fysiek iOS-apparaat kan geen CLOSED-claim voor deze providers ooit iets anders zijn dan software-architectuur.

## TARGET (ontwerp, niet geïmplementeerd)
Conceptueel akkoord met de voorgestelde architectuur (identity providers -> canonical user -> canonical entitlement service <- payment sources), maar de daadwerkelijke bouw hoort thuis in expliciet vrijgegeven, canonieke mastersprints.

## DEPENDENCIES
- Vereist afronding van de huidige MS-F12-04 (Mollie) als het eerste, bewezen providerpatroon voordat een tweede/derde provider wordt toegevoegd.
- Vereist echte Google Cloud- en Apple Developer-accountconfiguratie voor elke VALIDATED-status.
- Vereist een iOS Capacitor-target vóór enige StoreKit-code zinvol geschreven kan worden.

## SECURITY (ontwerpniveau)
De architectuurwet BILLING =/= IDENTITY =/= TENANT MEMBERSHIP =/= PRIVACY CONSENT is volledig consistent met de reeds bestaande, bewezen F12-wet ENTITLEMENTS =/= SECURITY en wordt onderschreven als canoniek principe voor elke toekomstige uitbreiding.

## STORE REQUIREMENTS
Store-regels (Apple/Google externe-betaal-links, EU DMA/Billing Choice) veranderen snel -- reeds actueel onderzocht in docs/F12_TIER_PRICING_DECISION.md (augustus 2026). Een toekomstige StoreKit/Play Billing-sprint moet dit onderzoek herhalen op het moment van uitvoering.
