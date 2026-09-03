# SUBSCRIPTION_ENTITLEMENT_CURRENT_STATE_AUDIT.md

**Forensische, read-only audit.** Corrigeert twee eerdere, onvolledige claims uit deze zelfde sessiereeks:
1. B9-H2D: "entitlement-gating ontbreekt volledig (0 checks in RLS)" — **ONVOLLEDIG/ONJUIST**: gezocht werd alleen in de Coach/PT-RLS en Coach-Core-modules, niet repo-breed.
2. Night preparation: "het schema bestaat al, alleen zonder scherm" — **ONVOLLEDIG**: er bestaat veel meer dan alleen schema.

## A. Welke tabellen bestaan werkelijk?
7 tabellen (live geverifieerd): `plans` (5 kolommen), `features` (4), `plan_features` (2), `plan_feature_quota`, `billing_events` (14, event-sourced met idempotency_key), `credit_packs` (6), `usage_log` (5). Subscription-state per gebruiker staat NIET in een aparte tabel maar als kolommen op `users`: `individual_plan_key`, `individual_plan_status`, `individual_plan_expires_at`.

**Geen** `subscriptions`/`user_subscriptions`/`entitlements`/`trials`/`prices`-tabel.

## B. Kolommen en relaties
`plans(key, type, naam, prijs_cent, actief)` → `plan_features(plan_key, feature_key)` → `features(key, naam, categorie, metered)`. `billing_events` legt provider/provider_object_id/event_type/target_user_id/target_organization_id/plan_key/old+new_canonical_state/idempotency_key vast.

## C. RLS
Catalogus (`plans`/`features`/`plan_features`/`plan_feature_quota`/`credit_packs`): SELECT_ALL (correct voor een prijscatalogus). `usage_log`: SELECT_OWN. `billing_events`: geen authenticated-policy (service-role-only, correct voor een billing-audittabel). Geen INSERT/UPDATE voor authenticated op de catalogus (correct).

## D. Runtime-code
`netlify/functions/coach.js` leest `users.individual_plan_*` + `plan_features` + `plan_feature_quota` en gebruikt `resolveEntitlements()` voor AI Coach-quota (`ai_coach` is een metered feature). Plus 4 Netlify-billingfuncties: `billing-checkout.js`, `billing-verify-apple.js`, `billing-verify-google-play.js`, `billing-webhook.js`.

## E. Tests
**12 testsuites, 221 assertions, alle groen** (zelf herdraaid): fEntitlementCore (52), fEntitlementRls (18), fBillingCheckout (13), fBillingWebhook (14), fBillingVerifyApple (6), fBillingVerifyGooglePlay (13), fBillingReconciliationRls (11), fCommercialUxCore (27), fCommercialUxDarkPatternsAudit (17), fDeleteAccountBillingRetention (4), fShadowCommercialLogicAudit (30), fUsersCommercialAuthority (16).

## F. Canonical Entitlement Resolver?
**JA.** `core/entitlementCore.js` → `resolveEntitlements(actor, catalog)`, `hasCapability()`, `getQuota()`. Grants stapelen (union) met bronprioriteit organization(3) > coach_grant(2) > subscription(1) — **exact conform de target-architectuur** (ATHLETE_COMMERCIAL sectie 8-9, "Multiple grant sources").

## G. Alleen schema of functionele logica?
**Functionele logica bestaat**: resolver, quota-berekening, checkout-flow, Apple/Google Play-receipt-verificatie, webhook-verwerking met idempotency, dark-pattern-audit, shadow-commercial-logic-audit.

## H. Billing/provider verification?
**JA, softwarematig**: Apple- en Google Play-verificatiefuncties met tests. Live provider-validatie: **onbekend/niet aantoonbaar** (0 rijen in `billing_events` — nooit een echte transactie verwerkt).

## I. Prices?
**Alleen structuur.** Alle 4 plans (`gratis`, `atleet_basis`, `atleet_pro`, `sportschool_basis`) hebben `prijs_cent = null`. Geen enkele prijs vastgesteld.

## J. Gebruikersinterface?
**NEE.** 0 treffers voor paywall/upgrade/abonnement-scherm in `index.html`.

## K. Maturity per dimensie
| Dimensie | Status |
|---|---|
| Catalogus-schema | IMPLEMENTED |
| Entitlement Resolver | TESTED (52 tests), INTEGRATED (coach.js) |
| Billing-functies (checkout/verify/webhook) | TESTED (46 tests), niet INTEGRATED in UI |
| Live transacties | NOT STARTED (0 billing_events) |
| Prijzen | NOT STARTED (alle null) |
| UI | NOT STARTED |
| Coach/PT-specifieke entitlement-gating in RLS | NOT STARTED (de B9-H2D-observatie blijft op dít specifieke punt correct) |

**Conclusie:** `SCHEMA EXISTS != COMMERCIAL SYSTEM COMPLETE` blijft geldig — maar de werkelijkheid ligt veel dichter bij "compleet" dan eerder gerapporteerd: **een grondig geteste, geïntegreerde entitlement-foundation zonder prijzen, zonder UI en zonder een enkele echte transactie.** Wat overblijft is primair PRODUCT OWNER DECISION (prijzen/tiers) + UX DECISION (scherm), niet software-foundation.
