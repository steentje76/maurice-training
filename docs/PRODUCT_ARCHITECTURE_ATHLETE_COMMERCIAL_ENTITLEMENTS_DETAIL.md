# Trainingskompas Target Product Architecture — Athlete Commercial & Entitlements

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor athlete abonnementen, trials, billing lifecycle, entitlements, sponsored access, downgrade/restore en commerciële grenzen. Geen definitieve prijzen/paywall-UX en geen claim dat alle targetfunctionaliteit al bestaat.

## 1. Productdoel

Trainingskompas moet athlete-abonnementen kunnen aanbieden zonder commerciële status te vermengen met identiteit, privacy, authorization, datakwaliteit of trainingswaarheid.

Harde regel:

`IDENTITY != AUTHORIZATION != CONSENT != SUBSCRIPTION != ENTITLEMENT`.

## 2. Conceptuele tiers

Target productfamilie kan bevatten:
- Free Athlete;
- Premium Athlete;
- Coach Pro;
- Gym/Club;
- Research/Enterprise.

Dit document gaat primair over athlete access. Definitieve prijs, featureverdeling en betaalprovider blijven afzonderlijke productbesluiten.

## 3. Subscription versus entitlement

`SUBSCRIPTION` beschrijft commerciële relatie/status.

`ENTITLEMENT` beschrijft welke productcapability beschikbaar is.

Voorbeeld:
- athlete heeft Premium subscription;
- Premium verleent entitlements A/B/C;
- athlete verliest Premium na afloop;
- entitlement service bepaalt nieuwe capabilityset.

Runtime code vraagt niet overal los `isPremium`; capabilities vragen centraal entitlementstatus op.

## 4. Canonical commercial objects

Minimaal conceptueel:
- PRODUCT;
- PRICE/OFFER;
- SUBSCRIPTION;
- BILLING ACCOUNT/CUSTOMER REFERENCE;
- PAYMENT PROVIDER REFERENCE;
- ENTITLEMENT;
- ENTITLEMENT GRANT;
- TRIAL;
- PROMOTION/COUPON later;
- SPONSORED ACCESS;
- BILLING EVENT/AUDIT.

Geen betaalkaartgegevens in Trainingskompas-database wanneer PSP/store die hoort te beheren.

## 5. Subscription lifecycle

Minimale states:
- NONE;
- TRIALING;
- ACTIVE;
- PAST_DUE;
- GRACE;
- CANCELED_AT_PERIOD_END;
- CANCELED;
- EXPIRED;
- REFUNDED waar relevant;
- SUSPENDED alleen met expliciete productpolicy.

State semantics zijn provider-onafhankelijk en worden gemapt vanuit PSP/app-store events.

## 6. Source of truth

Client-side knop of lokale storage is nooit betalingswaarheid.

Flow:

```text
Store / PSP
   ↓ signed/verified event or server verification
Commercial Service
   ↓
Canonical Subscription State
   ↓
Entitlement Resolver
   ↓
Capability access
```

## 7. Provider abstraction

Architectuur ondersteunt later bijvoorbeeld app stores en/of PSP zonder businesslogica overal te dupliceren.

Provider adapter normaliseert:
- purchase;
- renewal;
- cancellation;
- refund;
- billing failure;
- restore;
- trial;
- receipt/subscription verification.

Definitieve providerkeuze is niet onderdeel van dit document.

## 8. Server-side entitlement resolution

Entitlements worden server-side bepaald uit geldige grants.

Mogelijke grant sources:
- direct athlete subscription;
- trial;
- organization/gym sponsored access;
- coach-related bundle later;
- promotion;
- internal support grant met audit;
- research/enterprise arrangement.

Client mag entitlement cachen voor UX/offline, maar niet zelf verhogen.

## 9. Multiple grant sources

Athlete kan tegelijk meerdere grants hebben.

Voorbeeld:
- eigen Premium loopt tot 1 november;
- gym biedt Premium capabilities zolang membership/subscription actief is.

Resolver combineert grants volgens expliciete policy. Einde van één grant verwijdert capability alleen als geen andere geldige grant overblijft.

## 10. Sponsored access door Gym/Club

Gym/Club kan volgens eerder targetmodel commerciële producten aanbieden die TK-entitlements bevatten.

Harde regel:

`SPONSORED ACCESS != DATA ACCESS`.

Als gym Premium voor athlete betaalt, krijgt gym daardoor geen recovery-, nutrition-, Women's Performance- of trainingsdetailrechten.

Datarechten blijven RLS/authorization/consent.

## 11. Leaving a gym

Bij beëindiging organization membership/commercial sponsorship:
- sponsored grant eindigt volgens policy;
- athlete account blijft bestaan;
- athlete-owned history blijft behouden;
- eventueel eigen direct subscription blijft actief;
- privacyrelaties worden volgens organization/consent policy beëindigd;
- geen athlete data verwijderen alleen omdat entitlement vervalt.

## 12. Trial

Trial is expliciete subscription/grant state.

Vereisten:
- start/end timestamp;
- eligibility policy;
- capabilities;
- provider/source;
- conversion behavior;
- cancellation behavior;
- disclosure vóór start;
- no silent duplicate trial abuse.

Trial mag niet worden gebruikt om gevoelige consent af te dwingen.

## 13. Upgrade

Upgrade:
- provider bevestigt commerciële wijziging;
- canonical subscription wordt bijgewerkt;
- entitlement grant wordt geactiveerd;
- client refresh;
- nieuwe capability beschikbaar.

Geen lokale `premium=true` vóór servervalidatie als definitieve toegang.

## 14. Downgrade

Downgrade mag brondata/historie niet vernietigen.

Bij capabilityverlies:
- data blijft canonical bewaard volgens retention;
- premium analytics kunnen read access verliezen volgens productpolicy;
- gebruiker kan eigen brondata/history blijven beheren volgens privacy/export/delete rechten;
- premium-created program/workout history blijft begrijpelijk;
- toekomstige premium automation kan stoppen zonder verleden te herschrijven.

## 15. Cancellation

Onderscheid:
- cancel now waar provider/policy toestaat;
- cancel at period end;
- revoke/refund provider event.

UI moet einddatum/toegang helder tonen. `Canceled` betekent niet altijd `access immediately gone`.

## 16. Billing failure

Bij failed renewal:
- state PAST_DUE;
- optionele GRACE volgens policy;
- duidelijke niet-beschuldigende melding;
- veilige retry/update payment route;
- entitlement verandert pas volgens expliciete lifecycle policy.

Geen trainingsdata blokkeren als drukmiddel.

## 17. Grace period

Grace is commercieel, niet medisch/trainingstechnisch.

Tijdens grace kan entitlement tijdelijk actief blijven. Einddatum en bron zijn server-side.

## 18. Restore purchases

Restore moet:
- provider account/purchase verifiëren;
- canonical subscription reconstrueren;
- entitlements opnieuw resolven;
- idempotent zijn;
- geen dubbele subscription creëren.

## 19. Cross-device

Subscription hoort bij canonical TK account waar providerregels dit toestaan, niet uitsluitend bij één telefoon.

Login op tweede device -> server entitlement refresh.

## 20. Account mismatch

Purchase op store-account en login op verkeerd TK-account vereist expliciete conflictflow. Geen entitlement willekeurig aan tweede account koppelen.

Ownership/reassignment policy moet provider/legal-safe zijn.

## 21. Offline

Client mag laatst bekende entitlement tijdelijk cachen voor continuïteit volgens expiry policy.

Offline mag nooit:
- Free -> Premium elevaten;
- verlopen server state onbeperkt actief houden;
- organization sponsorship verzinnen.

Voor offline training moet verlies van netwerk niet onnodig een reeds beschikbare workout blokkeren.

## 22. Entitlement Registry

Introduceer centrale versioned `ENTITLEMENT REGISTRY`.

Per entitlement:
- entitlement_id;
- naam;
- capability(s);
- tier mapping;
- source types;
- dependency;
- offline behavior;
- downgrade behavior;
- data preservation behavior;
- server/client enforcement;
- product owner status.

Geen verspreide premium checks als source of truth.

## 23. Capability gating

Gate op functionele capability, niet alleen scherm.

Voorbeeld:
- premium insight berekening/API;
- premium program generation;
- advanced comparison;
- coach capability.

Alleen knop verbergen is onvoldoende; server-side operation moet dezelfde entitlement afdwingen waar relevant.

## 24. Entitlement versus Calculation

Calculation truth verandert niet door tier.

Als een metric alleen Premium zichtbaar is, mag Free niet een andere formule krijgen die commercieel gunstiger lijkt.

`PAYMENT DOES NOT CHANGE SCIENCE`.

## 25. Entitlement versus Decision

Safety-critical Decision Rules mogen niet zo worden ontworpen dat Free-gebruikers misleidende of onveilige training krijgen om Premium aantrekkelijker te maken.

Commerciële tier kan advanced coaching/analysis bieden, maar basisveiligheid blijft productbreed.

## 26. Entitlement versus privacy

Premium geeft geen bredere datarechten.

Coach Pro geeft coach alleen tooling; athlete consent/relationship bepaalt welke athlete data zichtbaar is.

Gym/Club abonnement geeft organization alleen productcapabilities; RLS/roles/consent bepalen data access.

## 27. Entitlement versus AI

AI payload wordt bepaald door:
1. capability entitlement;
2. authorization/consent;
3. minimum necessary data;
4. Context/Decision contract.

Premium AI mag niet automatisch alle gevoelige profieldata ontvangen.

## 28. Free Athlete baseline

Definitieve featurematrix volgt later, maar architectureel moet Free een echte bruikbare athlete experience blijven.

Harde baselineprincipes:
- account/profiel;
- privacy/export/delete;
- basis training execution/logging;
- bruikbaar zonder wearable;
- toegang tot eigen brondata/history volgens productpolicy;
- safety/privacy niet achter paywall.

Exacte advanced features per tier is PO-besluit.

## 29. Premium Athlete doel

Premium moet waarde toevoegen via capabilities, niet door basisapp kunstmatig kapot te maken.

Mogelijke value domains later te verdelen:
- advanced programs/adaptation;
- advanced Insight;
- richer AI Coach;
- extended integrations;
- advanced comparisons;
- specialized sport intelligence;
- premium content.

Geen definitieve toewijzing in dit document.

## 30. Low-price strategy

Productarchitectuur ondersteunt de strategische wens om athlete-prijs laag te houden door meerdere revenue/grant bronnen mogelijk te maken:
- direct athlete;
- Coach Pro;
- Gym/Club;
- organization-sponsored athlete access;
- Research/Enterprise waar passend.

Dit is architectuurondersteuning, geen financieel businessplan of vastgestelde prijs.

## 31. Athlete subscription versus Gym subscription

Een athlete kan:
- geen gym hebben en zelf Premium betalen;
- gym member zijn en zelf Premium betalen;
- Premium via gym krijgen;
- meerdere gyms hebben;
- gym verlaten zonder account kwijt te raken.

Dus geen `users.gym_id -> premium` shortcut.

## 32. Coach Pro

Coach Pro entitlement geeft coach-productfunctionaliteit, bijvoorbeeld roster/program/assignment tooling waar gebouwd.

Het creëert nooit automatisch coach-athlete relationship of athlete consent.

## 33. Organization billing roles

ORG billing/admin staat los van health data roles.

Billing manager mag facturen/subscriptions beheren zonder automatisch athlete performance/recovery te zien.

## 34. Paywall governance

Paywall wordt later UX ontworpen, maar functioneel gelden regels:
- reden van gate duidelijk;
- huidige tier/status;
- capability die unlockt;
- prijs/renewal/cancel voorwaarden conform provider/legal;
- restore route;
- geen dark patterns;
- geen misleidende countdown;
- geen sensitive health fear upsell.

## 35. Contextual upsell

Contextual upsell mag bestaan waar natuurlijk relevant, maar is commercieel gelabeld.

Voorbeeld: advanced comparison openen -> uitleg Premium capability.

Niet: AI Coach zegt `je herstel is slecht, koop Premium`.

## 36. Notification policy

Billing notifications zijn eigen categorie:
- trial ending;
- renewal waar vereist;
- payment failed;
- grace ending;
- cancellation confirmation;
- entitlement change.

Commercial marketing opt-out mag security/transactional billing notices niet onterecht blokkeren waar die noodzakelijk zijn.

## 37. Today/Home priority

Commercial cards/notices mogen nooit safety/time-bound training/critical account actions verdringen. Today Orchestrator behandelt commercial als lagere prioriteit behalve noodzakelijke account/billingactie die capability direct raakt.

## 38. Program/content access na downgrade

Als athlete Premium-programma heeft uitgevoerd:
- historische completed sessions blijven intact;
- program version provenance blijft;
- huidige/future premium program behavior volgt entitlement policy;
- geen geschiedenis verwijderen.

Als een actieve premium program capability vervalt, UI moet duidelijk aangeven wat stopt en welke data behouden blijft.

## 39. Export/delete

Privacy export bevat relevante subscription/account metadata voor zover vereist/geschikt, maar geen geheime PSP tokens.

Account deletion:
- beëindigt/revokes app-side grants volgens policy;
- provider cancellation/refund volgt providerregels en expliciete flow;
- voorkomt orphan entitlement;
- bewaart alleen wettelijk noodzakelijke financiële records waar vereist, gescheiden van athlete trainingdata.

## 40. Refund/chargeback

Provider event kan subscription/entitlement aanpassen volgens policy. Geen athlete traininghistory verwijderen wegens refund/chargeback.

Fraud/abuse handling is aparte operational governance.

## 41. Web/mobile consistency

Als athlete subscription op web én mobile beheerd kan worden, gebruiken beide dezelfde canonical commercial state en entitlement resolver. Geen aparte web-premium database.

Provider purchase routes kunnen platform-specifiek verschillen.

## 42. Pricing/versioning

Product/price offers zijn versioned.

Bewaar:
- product/price identifier;
- currency;
- billing interval;
- provider;
- offer version;
- effective dates.

Oude subscriber terms niet stil herschrijven omdat nieuwe prijs wordt gepubliceerd.

## 43. Currency/tax/localization

Commercial architecture ondersteunt provider-/market-specific currency/tax display. Definitieve fiscal/legal implementatie volgt provider/market requirements.

Geen hardcoded eurobedrag als global truth.

## 44. Promotions

Promotions/coupons later:
- explicit eligibility;
- start/end;
- redemption state;
- provider/source;
- entitlement effect;
- abuse controls.

Promotion is geen aparte privacyrole.

## 45. Support grants

Support/admin kan alleen via privileged audited action tijdelijke entitlement grant geven waar productpolicy dit toestaat.

Vereisten:
- actor;
- reason;
- duration;
- scope;
- audit;
- no hidden permanent super-premium flag.

## 46. Testing/sandbox

Billing integrations hebben sandbox/test states gescheiden van production. Test entitlement mag nooit production account per ongeluk blijvend elevaten.

## 47. Observability

Monitor zonder sensitive trainingdata:
- provider webhook success/failure;
- subscription state transitions;
- entitlement resolution errors;
- restore failures;
- duplicate events;
- grace expirations;
- account/provider mismatch.

Geen card/payment secrets in logs.

## 48. Idempotency

Provider webhooks/events kunnen herhaald aankomen. Processing is idempotent op provider event identity/reference.

Duplicate renewal event -> geen dubbele grant.

## 49. Ordering/out-of-order events

Commercial service moet late/out-of-order provider events kunnen herkennen via provider timestamps/version/state reconciliation. Een oude `active` event mag nieuwere cancellation niet stil terugdraaien.

## 50. Security

Vereisten:
- server-side receipt/subscription verification;
- signed webhook validation;
- secrets server-side;
- least privilege provider credentials;
- replay/idempotency protection;
- authorization op billing endpoints;
- no client privilege elevation;
- audited admin overrides.

## 51. Functional >=9 closure criteria

Athlete Commercial & Entitlements is pas >=9 wanneer minimaal bewezen is:
- subscription en entitlement strikt gescheiden zijn;
- central Entitlement Registry bestaat;
- provider events server-side verified zijn;
- lifecycle trial/active/past_due/grace/cancel/expire/restore correct werkt;
- multiple grant sources correct resolven;
- gym-sponsored access geen data access geeft;
- leaving gym athlete history/account behoudt;
- upgrade/downgrade/cancel idempotent zijn;
- downgrade geen source/history data vernietigt;
- restore cross-device correct werkt;
- offline cache geen privilege elevation geeft;
- server-side capability gates bestaan;
- entitlement geen Calculation/Decision truth verandert;
- AI payload authorization apart controleert;
- privacy/export/delete blijven werken zonder Premium;
- billing notifications correct gecategoriseerd zijn;
- paywall geen safety/health dark patterns gebruikt;
- provider retries/out-of-order events getest zijn;
- support overrides audited zijn;
- secrets/receipts veilig verwerkt worden;
- observability geen sensitive/payment secrets lekt;
- adversarial entitlement tests groen zijn.

## 52. UX governance

Later pas ontwerpen:
- plan comparison;
- subscription detail;
- trial start;
- paywall;
- checkout handoff;
- payment failed/grace;
- cancellation;
- restore;
- sponsored-by-gym state.

Voor ieder scherm/flow eerst concreet voorbeeld -> Product Owner review -> aanpassen -> akkoord -> bouwen.

## 53. Open Product Owner decisions

Nog bewust open:
- definitieve Free/Premium featurematrix;
- athlete maand-/jaarprijs;
- trialduur;
- app-store versus web/PSP purchase strategy;
- grace duration;
- exacte sponsored-access bundles;
- promotions/referrals;
- regional pricing;
- family/minor plans;
- entitlement van toekomstige motion-sensor coaching;
- welke premium capabilities offline mogen blijven tijdens korte unverifiability.

## 54. Harde architectuurregels

`PAYMENT DOES NOT CHANGE SCIENCE.`

`ENTITLEMENT DOES NOT GRANT DATA ACCESS.`

`DOWNGRADE DOES NOT DELETE ATHLETE HISTORY.`

`ONE COMMERCIAL STATE, MULTIPLE CLIENTS/PROVIDERS.`

`FREE MUST REMAIN A REAL TRAINING PRODUCT, NOT A BROKEN DEMO.`