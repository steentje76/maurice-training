# F13_MASTER_REPORT.md — Trainingskompas

## BASELINE
Start-SHA (vrijgave F13): `ccb46c542735da8d95593183243c129ce40c3b09` (APP_VER v4.69.23, na F12-afronding).
**Final main SHA: `94228dd5952caf2dbfcb1fb93e470474455e4100`.**
Huidig APP_VER: **v4.69.25**.
Datum: 30-31 augustus 2026.

## ALLE MASTERSPRINTS EN PR-NUMMERS

| Sprint | Naam | Status | PR |
|---|---|---|---|
| MS-F13-01 | Offline Sync Queue & Conflict Strategy | CLOSED | #163 |
| MS-F13-02 | Release/Migration/Rollback Governance | CLOSED | #164 |
| MS-F13-03 | Performance Architecture | CLOSED | #165 |
| MS-F13-04 | Accessibility & Mobile Ergonomics | CLOSED | #166 |
| MS-F13-05 | Privacy & Security Recertification | CLOSED | #167 |
| MS-F13-06 | iOS Feasibility Research | CLOSED | #168 |
| MS-F13-07 | Federated Identity & Account Linking | CLOSED | #169 |
| MS-F13-08 | Multi-Provider Billing & Entitlement Reconciliation | CLOSED | #170 |

Capabilities: `FEDERATED-IDENTITY-001` → **TESTED**, `MULTI-PROVIDER-BILLING-001` → **TESTED** (beide waren PLANNED/NOT STARTED vóór expliciete Product Owner-vrijgave tijdens deze fase).

## RUNTIMEWIJZIGINGEN
- MS-F13-04: touch-targets `.set-more`/`.set-rest` van 36×42px naar 44×44px (WCAG 2.5.5).
- MS-F13-07: "Doorgaan met Google"/"Doorgaan met Apple"-knoppen, raw GoTrue-`/authorize`-redirect, callback-afhandeling, "Inlogmethoden"-sectie in het profielscherm.
- MS-F13-01/02/03/05/06/08: geen enkele `index.html`-wijziging (documentatie/tests/server-only).

## DATABASE-MIGRATIES
Geen nieuwe migraties binnen F13 zelf (MS-F13-08 hergebruikt `migratie_v524.sql` uit MS-F12-04 zonder schemawijziging — expliciet bewezen: `billing_events`/`reconcile_billing_event()` zijn provider-neutraal genoeg om Google Play en Apple App Store te bedienen zonder aanpassing).

## TESTTOTALEN
**182 uitgevoerd, 0 geskipt, 0 gefaald** (was 173 bij aanvang F13, +9 nieuwe testbestanden: `fOfflineSyncDomainClassification`, `fMigrationGovernance`, `fPerformanceBudget`, `fAccessibilityMobileErgonomics`, `fDeleteAccountBillingRetention`, `fIosFeasibilityIntegrity`, `fFederatedIdentity`, `fBillingVerifyGooglePlay`, `fBillingVerifyApple`).

25 relevante security/commercial-suites in deze finale audit afzonderlijk herbevestigd, allemaal groen, 0 regressie.

## SABOTAGEBEWIJS (samenvatting per sprint)
- MS-F13-01: verboden `sbPostQ('billing_events', ...)`-aanroep → gedetecteerd, teruggedraaid.
- MS-F13-02: een echte `DROP TABLE IF EXISTS public.users` in een migratiebestand → gedetecteerd, teruggedraaid.
- MS-F13-03: `await` toegevoegd vóór `refreshHome()` in de startup-flow → gedetecteerd, teruggedraaid.
- MS-F13-04: touch-target teruggezet naar 24×24px → gedetecteerd, teruggedraaid.
- MS-F13-05: `ON DELETE SET NULL` vervangen door `CASCADE` op `billing_events.target_user_id` → gedetecteerd, teruggedraaid.
- MS-F13-06: `@capacitor/ios` toegevoegd zonder werkend buildproces → gedetecteerd, teruggedraaid.
- MS-F13-07: (1) provider_token gebruikt als `user.id` i.p.v. `auth.users.id`; (2) URL-encoding van OAuth-parameters verwijderd → beide gedetecteerd, teruggedraaid.
- MS-F13-08: (1) client-aangeleverd `forcedPlanKey` overschreef het server-bepaalde plan (aanvankelijk NIET gedetecteerd — genuine testzwakte gevonden en gedicht met een nieuwe test, sabotage daarna wél gedetecteerd); (2) Apple-endpoint tijdelijk zonder verificatie laten doorgaan → brak de test hard. Beide teruggedraaid.

## SECURITYRESULTATEN
- **Commercial authority**: 0 client-schrijfroutes naar `individual_plan_key`/`individual_plan_status`/`mollie_customer_id`/`billing_events` gevonden (repo-brede grep, `index.html`). Geen `service_role`-key in clientcode.
- **Shadow logic**: `fShadowCommercialLogicAudit.test.js` 30/30 — geen provider-specifieke businessbeslissing buiten de geautoriseerde adapter/reconciliation-laag.
- **Secret scan**: 0 hardcoded private keys, 0 hardcoded `client_secret`-waarden in de repository.
- **Money-never-widens-data-access**: `fEntitlementCore.test.js` 52/52, uitgebreid met de drie nieuwe billing-adapters (Mollie, Google Play, Apple) — geen enkele verwijzing naar `gym_role`/`gym_id`/`system_role`/`organization_id`/`memberships` in de commerciële/billing-laag.
- **Downgrade/deletion safety**: `fDeleteAccountBillingRetention.test.js` 4/4 — `billing_events` blijft bestaan na accountverwijdering (`ON DELETE SET NULL`, live geverifieerd in MS-F13-05), nooit een `CASCADE`-verwijdering van financiële audit-geschiedenis.

## IDENTITY MATRIX

| Flow | Implemented | Tested | Provider validated | Open |
|---|---|---|---|---|
| Email/password | Ja (bestaand) | Ja | Ja (in productiegebruik) | — |
| Google Sign-In | Ja | Ja (16 assertions) | **Nee** | Dashboard-activering + Google Cloud OAuth-client vereist |
| Apple Sign-In | Ja | Ja (16 assertions, gedeeld met Google) | **Nee** | Apple Developer-account + Services ID + .p8-key vereist |
| Account-linking | Ja (Supabase's ingebouwde, bewezen gedrag hergebruikt) | Ja (architectuur-audit + live bevestiging dat e-mailverificatie actief is) | Ja (Supabase's eigen, gedocumenteerde, in productie bewezen gedrag) | Manual linking (`linkIdentity()`) niet geactiveerd (dashboard-instelling) |
| Account deletion | Ja (bestaand, ongewijzigd) | Ja (27 + 4 assertions) | Ja | — |

## BILLING MATRIX

| Provider | Purchase | Verify | Reconciliation | Restore | Live validated |
|---|---|---|---|---|---|
| Mollie | Ja (checkout-endpoint) | Ja (fetch-to-confirm-webhook) | Ja (`reconcile_billing_event`) | N.v.t. (web, geen "restore"-concept) | **Nee** — SOFTWARE CLOSED, LIVE/SANDBOX PAYMENT VALIDATION OPEN |
| Google Play | Software-architectuur (geen native purchase-initiatie mogelijk) | Ja (`purchases.subscriptionsv2.get`, JWT-signing bewezen met testkeypair) | Ja (dezelfde RPC) | Niet van toepassing (geen native client) | **Nee** — geen native Play Billing-plugin geïnstalleerd |
| Apple StoreKit | Software-contract (geen native purchase-initiatie mogelijk) | **Bewust niet geïmplementeerd** (JWS-verificatie vereist officiële library) | Ja (contract gereed, nooit aangeroepen zonder verificatie) | Niet van toepassing | **Nee** — geen iOS-buildtarget, geen JWS-verificatie |

## PERFORMANCE
`index.html` 4,17 MB (206 ingebedde poster-thumbnails = 1,86 MB, bewust niet geëxtraheerd deze fase — non-blocking gap). Startup-flow bevestigd volledig parallel/non-blocking. Performance-budget-regressietest toegevoegd (6 MB-grens).

## ACCESSIBILITY
Pinch-zoom, modal-focus-restore, Android-terugknop, icon-labels: allemaal bevestigd correct. Eén concrete fix: touch-targets tijdens actieve training vergroot naar 44×44px.

## PRIVACY RECERTIFICATION
230+ security-assertions herbevestigd zonder regressie. Nieuwe, expliciete data-retentiebeslissing: financiële audit-records (`billing_events`) worden nooit verwijderd bij accountverwijdering.

## OPEN PROVIDER-VALIDATIES (non-blocking, expliciet geregistreerd)
1. Mollie: geen live/sandbox-transactie uitgevoerd (geen productie-API-key beschikbaar).
2. Google Sign-In/Apple Sign-In: geen provider geactiveerd in het Supabase-dashboard (vereist Google Cloud- en Apple Developer-accounts).
3. Google Play Billing: geen native Play Billing-plugin/client-integratie (vereist een nieuwe, geteste Android-build — bewust niet kunstmatig toegevoegd).
4. Apple StoreKit: geen iOS-buildtarget (fundamentele platformbeperking van deze Linux-sandbox, geen credential-probleem), geen JWS-certificate-chain-verificatie geïmplementeerd (vereist Apple's officiële library).

Geen van deze vier is een P0/P1-security-/architectuurblokkade — allemaal zijn ze afhankelijk van externe accounts/infrastructuur die niet in deze sessie beschikbaar zijn, conform de instructie om nooit een sterkere status dan het bewijs te claimen.

## OPEN GAPS (geclassificeerd)
- **P0/P1: 0.**
- **P2/non-blocking**: poster-thumbnail-extractie (performance, MS-F13-03); organization billing voor `sportschool_basis` (MS-F12-04, nog steeds buiten scope); credit packs (MS-F12-01, nog steeds buiten scope); manual account-linking-activering (MS-F13-07).
- **P3/toekomstige productbeslissing**: definitieve prijsstelling (`plans.prijs_cent` blijft NULL op alle vier plannen), providerkeuze/-volgorde voor toekomstige native-app-ontwikkeling.

## ROADMAPWIJZIGINGEN
`FEDERATED-IDENTITY-001` en `MULTI-PROVIDER-BILLING-001` verplaatst van fase F12 naar F13, van NOT STARTED naar TESTED. Twee nieuwe, canonieke mastersprints (MS-F13-07, MS-F13-08) toegevoegd aan `ROADMAP_INDEX.json` met het volledige, verplichte validation-schema (een eigen fout hierin tijdens deze fase gevonden en gecorrigeerd).

## EXACTE VOLGENDE FASE
Conform de expliciete instructie: **geen F14 gestart.** F13 is de laatst uitgevoerde fase. Een toekomstige sessie kan, na Product Owner-beoordeling van dit rapport, F14 (Scientific Platform) of F15 (Beyond Benchmark) selecteren, of eerst de hierboven genoemde non-blocking gaps oppakken.

## FINALE STATUS

**F13 SOFTWARE CLOSED — EXTERNAL PROVIDER/DEVICE VALIDATION OPEN**

Alle acht mastersprints zijn volledig, gedocumenteerd, getest, en met sabotagebewijs afgerond en gemergd. Geen enkele P0/P1-blokkade. De resterende openstaande punten zijn uitsluitend afhankelijk van externe providerinfrastructuur (Google Cloud-, Apple Developer-, en Mollie-productieaccounts) en een native iOS/Android-buildomgeving die niet beschikbaar zijn binnen deze sessie — expliciet, eerlijk geregistreerd, nooit overclaimed.

**F13 NOT STARTED voor F14 — bevestigd, conform instructie.**
