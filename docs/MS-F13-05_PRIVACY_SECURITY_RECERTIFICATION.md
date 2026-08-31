# MS-F13-05_PRIVACY_SECURITY_RECERTIFICATION.md — Trainingskompas

**Baseline main SHA:** `4dbb7b6633fb072696f10dac7656c82b52fcce53`. Datum: 30 augustus 2026.

## Repo-brede recertificatie
14 relevante suites, 230 assertions, allemaal groen, geen regressie: fOrganizationRls (10), fCoachProgramRls (13), fGymTeamSecurity (17), fWearableAuthSecurity (20), fCoachProxySecurity (12), fDeleteAccountSecurity (27), fEntitlementRls (18), fUsersCommercialAuthority (16), fCoachEnforcement (24), fBillingReconciliationRls (11), fShadowCommercialLogicAudit (30), fCommercialUxDarkPatternsAudit (17), fOfflineSyncDomainClassification (8), fMigrationGovernance (7).

## Identity
Geen social login bestaat nog (FEDERATED-IDENTITY-001 blijft NOT STARTED, geen implementatie in deze sprint). Geen nieuwe identity-code om te auditen.

## Billing
Forged purchase/webhook/replay/out-of-order reeds bewezen in MS-F12-04, herbevestigd groen. Client-side entitlement/price manipulation reeds bewezen onmogelijk.

## Multi-tenant
fOrganizationRls, fCoachProgramRls, fGymTeamSecurity: alle groen, geen regressie sinds F11.

## Sensitive health
Geen wijziging sinds de laatste recertificatie; fWearableAuthSecurity blijft groen.

## Deletion -- nieuwe bevinding en verificatie (kern van deze sprint)
delete-account.js verwijst nergens expliciet naar billing_events/individual_plan_key/mollie -- bij nadere analyse correct, niet gemist: billing_events.target_user_id is ontworpen met ON DELETE SET NULL (migratie_v524.sql, MS-F12-04). Live geverifieerd (transactie zonder commit): het verwijderen van een auth.users-rij laat het billing_events-record volledig intact, met target_user_id automatisch op NULL -- de financiële audit-geschiedenis blijft bewaard, zonder koppeling naar de verwijderde persoon.

Expliciete data-retentiebeslissing voor financiële records (nieuw vastgelegd): billing_events-rijen worden nooit verwijderd bij accountverwijdering -- een bewuste, financiële audit-trail die onafhankelijk van de gebruikersidentiteit blijft bestaan. Juridisch/technisch onderscheiden van "extern abonnement opzeggen" (via de bestaande Mollie-cancel-flow).

users.mollie_customer_id staat op de users-rij zelf, die delete-account.js al expliciet verwijdert vóór de auth.users-verwijdering -- correct opgeruimd, geen aanvullende actie nodig.

## Nieuwe regressietest
core/fDeleteAccountBillingRetention.test.js: bewaakt zowel het bestaan van de ON DELETE SET NULL-constraint als de regel dat delete-account.js nooit rechtstreeks in billing_events schrijft/verwijdert.

## Conclusie
Geen P0/P1-bevindingen. Eén positieve, expliciete bevestiging van reeds correct ontworpen gedrag, nu voor het eerst getest en gedocumenteerd als bewuste beslissing.
