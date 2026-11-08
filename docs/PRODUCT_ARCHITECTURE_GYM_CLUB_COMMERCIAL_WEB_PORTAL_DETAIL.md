# Trainingskompas Target Product Architecture — Gym/Club Commercial & Web Portal

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Parent:** `PRODUCT_ARCHITECTURE_TOGETHER_DETAIL.md` + Profile/Account/Privacy + Commercial/Entitlements architecture.  
**Scope:** eigen Gym/Club-lidmaatschappen en pakketten, web-based management naast mobiele app, één backend/authorizationmodel. Targetfunctionaliteit; geen claim dat runtime al bestaat.

## 1. Product Owner besluiten

Vastgelegd:

1. Een Gym/Club mag binnen Trainingskompas **eigen commerciële abonnementen/lidmaatschappen en pakketten beheren**.
2. Gym/Club krijgt naast de mobiele app een **web-based management portal**.
3. Mobiele app en webportal zijn twee clients van **dezelfde backend**, geen twee losse producten/datamodellen.
4. Gym/Club commercial configuration mag nooit privacy, consent, RLS, Calculation, Decision of Evidence governance overschrijven.
5. Trainingskompas-entitlements en data-authorization blijven strikt gescheiden.

## 2. Platformmodel

```text
TRAININGSKOMPAS PLATFORM

Mobile App ------------------+
                             +--> Shared Backend / API
Gym/Club Web Portal ---------+       |
Coach Web Experience --------+       +--> Organizations / Locations
                                     +--> Members / Roles
                                     +--> Teams / Groups
                                     +--> Planning / Events
                                     +--> Programs / Workouts
                                     +--> Commercial Products
                                     +--> Subscriptions / Entitlements
                                     +--> Payments / Billing State
                                     +--> Privacy / Consent / RLS
                                     +--> Audit / Observability
```

Een wijziging op web wordt via dezelfde canonical objecten zichtbaar in de app en omgekeerd waar de capability dit toestaat.

## 3. Mobiel versus web

### Mobile app — primair voor
- athlete/member dagelijkse ervaring;
- training uitvoeren;
- planning bekijken;
- beschikbaarheid/attendance;
- chat/announcements;
- team/gym context;
- coach onderweg;
- snelle operationele acties;
- notificaties.

### Webportal — primair voor
- organisatiebeheer;
- locatiebeheer;
- bulk ledenbeheer;
- coach/staff beheer;
- team/groep beheer;
- planning op week/maand/schaal;
- programma's/templates bouwen en toewijzen;
- abonnementen/prijzen/commercie;
- rapportage/dashboards;
- equipment/device administration;
- branding;
- rollen/rechten;
- audit/administratie.

Responsive web kan coaches ook op tablet/laptop ondersteunen. De uitgebreidste organisatie/commerciële controls blijven alleen beschikbaar voor bevoegde rollen.

## 4. Gym/Club Commercial Product

Een organisatie kan eigen commerciële producten definiëren, bijvoorbeeld:
- Basic Membership;
- Performance Membership;
- Premium Coaching;
- Team Membership;
- Digital-only Membership;
- Physical-club + Trainingskompas bundle;
- Trainingskompas add-on;
- trial;
- tijdelijk/seizoenspakket;
- programma-/coachingbundel later.

Canonical COMMERCIAL PRODUCT bevat minimaal:
- organization_id;
- product_id;
- display name;
- description;
- status;
- price/currency;
- billing interval/type;
- trial configuration waar toegestaan;
- included Trainingskompas entitlement set;
- optional organization services metadata;
- availability/location/team scope;
- effective/version dates;
- external payment/provider references;
- audit metadata.

## 5. Fysiek lidmaatschap versus digitaal entitlement

Trainingskompas maakt onderscheid tussen:

- **PHYSICAL/ORGANIZATION MEMBERSHIP** — relatie met Gym/Club;
- **COMMERCIAL SUBSCRIPTION** — welk pakket iemand afneemt;
- **TRAININGSKOMPAS ENTITLEMENTS** — welke productcapabilities beschikbaar zijn;
- **AUTHORIZATION/CONSENT** — welke data iemand mag zien/gebruiken.

Voorbeeld:

```text
Gym A Performance €19,95/mnd
  -> Gym membership active
  -> TK Premium Analytics entitlement
  -> Coach Feedback entitlement

MAAR NIET:
  -> automatisch toegang voor Gym A tot HRV/slaap/voeding/Women's Performance
```

## 6. Eigen prijzen en pakketten

Bevoegde Gym/Club-beheerder kan binnen platformregels:
- productnaam bepalen;
- prijs bepalen;
- maand/jaar/eenmalig waar ondersteund;
- trial instellen;
- start/eind availability;
- kortings-/promotieregels later;
- locaties/doelgroepen koppelen;
- toegestane TK-capabilities bundelen;
- eigen servicebeschrijving toevoegen.

Gym mag niet:
- willekeurige systeem-entitlements creëren;
- security/privacy uitschakelen;
- datarechten verkopen die athlete niet heeft toegestaan;
- Calculation/Decision rules wijzigen via abonnement;
- evidenceclaims aanpassen;
- willekeurige executable pricing/business code injecteren.

## 7. Entitlement catalog

Trainingskompas beheert een centrale versioned ENTITLEMENT CATALOG.

Gym-producten kunnen alleen toegestane entitlements selecteren, bijvoorbeeld:
- premium analytics;
- gym programs;
- team capabilities;
- coach feedback;
- advanced planning;
- selected device features;
- organization-specific content.

Entitlement checks zijn server-side. Client-side verborgen knoppen zijn geen securitymodel.

## 8. Subscription lifecycle

Minimaal ondersteunen:
- DRAFT;
- TRIALING;
- ACTIVE;
- PAST_DUE/GRACE waar provider/model dit gebruikt;
- PAUSED indien productmatig toegestaan;
- CANCELED;
- EXPIRED;
- REFUNDED/PARTIAL_REFUND waar relevant.

Lifecycle events zijn idempotent en auditable.

## 9. Payment provider architectuur

Trainingskompas bouwt geen eigen kaart-/bankverwerking.

```text
Gym Commercial Product
-> TK Subscription/Billing Service
-> PSP (bijv. Mollie/Stripe of gekozen provider)
-> signed/verified webhook
-> canonical billing state
-> entitlement materialization
```

Definitieve PSP-keuze is later. Payment provider payload is niet rechtstreeks de authorizationbron; backend valideert en vertaalt naar canonical state.

## 10. Gym-managed versus externally managed memberships

Architectuur ondersteunt later meerdere bronnen:
- subscription verkocht via Trainingskompas;
- bestaand extern Gym/Club-lidmaatschap geïmporteerd/gesynchroniseerd;
- organization-sponsored entitlement;
- handmatig toegekende tijdelijke entitlement door bevoegde rol, met audit/expiry.

Source/provenance blijft bekend.

## 11. Webportal hoofdstructuur

Target information architecture:

GYM/CLUB WEB PORTAL
- Dashboard
- Organisatie
  - Profiel
  - Branding
  - Locaties
- Leden
  - Ledenlijst
  - Uitnodigingen
  - Membership status
  - Teams/groepen
- Coaches & Staff
  - Rollen
  - Toewijzingen
  - Rechten
- Teams & Groepen
- Planning
  - Trainingen
  - Wedstrijden/events
  - Lessen
  - Capaciteit/wachtlijst
  - Attendance
  - Taken/materialen
- Programma's & Trainingen
  - Templates
  - Programma's
  - Publiceren/toewijzen
- Communicatie
  - Announcements
  - Channels
- Commercie
  - Producten/pakketten
  - Prijzen
  - Abonnementen
  - Trials/promoties
  - Betaalstatus
  - Facturen/credit/refund waar provider ondersteunt
- Apparaten & Faciliteiten
- Rapportage
- Privacy & Governance
- Auditlog
- Instellingen

Dit is functionele architectuur, geen definitief schermontwerp.

## 12. Dashboard

Dashboard mag organisatie-KPI's tonen die rechtmatig uit organisatiecontext volgen, bijvoorbeeld:
- actieve memberships;
- trials;
- cancellations;
- payment failures;
- attendance;
- program adoption;
- team/event participation;
- gebruik van organization capabilities.

Geen verborgen aggregatie van sensitive athlete health data zonder expliciete governance/consent/de-identification policy.

## 13. Ledenbeheer

Web is geschikt voor:
- zoeken/filteren;
- uitnodigen;
- bulk acties binnen veilige grenzen;
- membership koppelen;
- team/groep toewijzen;
- status beheren;
- entitlementstatus bekijken;
- relationele coach/teamcontext.

Bulkactie krijgt preview, authorization, audit en waar destructief duidelijke confirmation.

## 14. Planning op web

Zelfde canonical Planning/Event engine als mobile.

Voorbeeld:
- admin plant donderdag 19:00 teamtraining op web;
- canonical planned event wordt opgeslagen;
- betrokken athletes zien dit in app Planning/Vandaag;
- availability/attendance updates uit app zijn zichtbaar op web.

Geen aparte `web_calendar` database.

## 15. Programma's op web

Coach/admin kan op groter scherm:
- workout templates maken;
- programma's bouwen;
- fasen beheren;
- team/groep/athlete assignments maken binnen rechten;
- planning previewen;
- versie/publicatiestatus beheren.

Execution blijft dezelfde centrale Preview -> Execution -> Logging keten in de athlete experience.

## 16. Rollen voor commercial management

Aanbevolen privileged capabilities:
- ORG_OWNER: volledig commercial beheer;
- ORG_ADMIN: commercial beheer indien verleend;
- BILLING_MANAGER: producten/subscriptions/billing zonder automatisch athlete health access;
- BRAND_MANAGER: geen billing tenzij apart verleend;
- LOCATION_MANAGER: alleen scoped producten/leden indien verleend;
- COACH/TRAINER: standaard geen prijs/billing beheer;
- MEMBER: geen beheer.

Billing role is bewust apart van health/training-data role.

## 17. Financial data privacy

Billing/paymentinformatie is apart geclassificeerd.

Coach hoeft geen betaalgegevens te zien. Billing manager hoeft geen HRV/training details te zien. PSP tokens/secrets nooit naar client. Alleen noodzakelijke betaalstatus/transaction references worden opgeslagen volgens gekozen provider/legal policy.

## 18. Facturen en administratie

Target kan later ondersteunen:
- invoice/receipt references;
- payment history;
- VAT/tax metadata waar vereist;
- refunds/credits;
- exports voor administratie;
- provider-hosted invoice/document links waar passend.

Juridische/fiscale eisen worden per markt/provider vóór productie gevalideerd.

## 19. Organization-sponsored access

Gym kan bepaalde TK-entitlements voor leden financieren.

Bij einde sponsorship:
- entitlement verandert volgens policy;
- athlete-owned historische data blijft behouden;
- persoonlijke TK-account blijft bestaan waar productmodel dit toestaat;
- privacy/ownership verandert niet terugwerkend.

## 20. Multiple gyms

Athlete kan meerdere organization memberships/commercial relationships hebben. Entitlements worden deterministisch gecombineerd volgens centrale rules. Geen globale `gym_id`-aanname.

Bij conflicterende organization branding/content blijft persoonlijke Trainingskompas-context leidend buiten expliciet gekozen organization context.

## 21. White-label/light branding

Webportal beheert controlled branding:
- logo;
- display name;
- accent;
- banner;
- locatiecontent;
- contactlinks.

Geen arbitrary CSS/JS. Branding verandert geen authorization, entitlement catalog, Calculation/Decision/Evidence logic.

## 22. Security en tenant isolation

Elke webactie vereist server-side:
- authenticated user;
- active organization context;
- role/capability check;
- tenant ownership/scope;
- object-level authorization;
- audit waar privileged.

Adversarial tests moeten cross-tenant ID swapping, role escalation, self-elevation, hidden-route access en bulk-operation leakage afdekken.

## 23. Auditlog

Audit minimaal voor:
- role changes;
- membership changes;
- product/price changes;
- entitlement grants/revokes;
- refunds/credits;
- branding changes;
- privileged exports;
- organization settings;
- manual overrides.

Audit bevat actor, action, target, organization, timestamp en relevante before/after metadata zonder onnodig sensitive data te dupliceren.

## 24. Notifications

Commercial notifications kunnen omvatten:
- trial ending;
- payment failed;
- subscription activated/canceled;
- membership invite;
- entitlement changed.

Marketingcommunicatie blijft apart van transactionele/accountcommunicatie.

## 25. API/client contract

Mobile en web gebruiken dezelfde canonical services. Business rules worden niet alleen in web-JavaScript of mobile-clientcode geïmplementeerd.

Target:
- shared API contracts;
- shared auth/session model;
- canonical validation;
- server-side business rules;
- versioned endpoints/contracts waar nodig;
- consistent error model;
- observability per client/build.

## 26. Responsive Coach Web

Naast Gym admin kan een human coach/PT via web later een taakgerichte workspace krijgen:
- athlete roster;
- planning;
- programs;
- assignments;
- feedback;
- messages;
- consent-aware insights.

Dit gebruikt dezelfde Coach/PT capability; geen tweede coach-datamodel.

## 27. Web authentication

Web gebruikt dezelfde account identity/multi-role architectuur. Requirements:
- secure sessions;
- CSRF/session protections passend bij stack;
- secure cookie/token handling;
- logout/session revoke;
- future MFA/passkeys voor privileged admins wenselijk;
- privileged actions kunnen step-up authentication krijgen indien later nodig.

## 28. Accessibility/responsiveness

Webportal target:
- desktop-first management efficiency;
- bruikbaar responsive op tablet;
- keyboard navigation;
- screen-reader semantics;
- contrast/focus states;
- tabular/bulk interfaces toegankelijk;
- geen mobile app layout simpelweg uitrekken naar desktop.

## 29. Offline

Gym/Club admin web hoeft niet volledig offline-first te zijn. Geen offline wijziging mag nieuwe permissions, entitlements of billingstatus creëren zonder serverbevestiging.

Mobile athlete execution blijft eigen offline/retryregels houden.

## 30. Data ownership bij vertrek

Bij athlete die Gym verlaat:
- organization membership eindigt;
- organization-only entitlements eindigen volgens policy;
- organization access wordt ingetrokken;
- athlete-owned persoonlijke training/history blijft bij athlete;
- organization-owned templates/content blijven bij organization;
- gedeelde/assigned records volgen expliciete ownership/versioning policy;
- billing/financial records volgen wettelijke retentie.

## 31. Functioneel >=9 closure criteria

Deze capability is pas >=9 wanneer minimaal bewezen is:
- web en mobile gebruiken canonical shared backend;
- organization tenant isolation adversarieel groen is;
- commercial products versioned werken;
- gym kan toegestane pakketten/prijzen beheren;
- physical membership/subscription/entitlement/authorization gescheiden zijn;
- subscription lifecycle en retries idempotent zijn;
- payment webhooks geverifieerd en replay-safe zijn;
- entitlement materialization correct werkt;
- cancel/downgrade/payment failure correct doorwerkt;
- athlete data niet destructief verdwijnt bij downgrade/vertrek;
- billing roles geen impliciete health access hebben;
- coach roles geen impliciete billing access hebben;
- planning web->app en app->web consistent werkt;
- programs/assignments dezelfde canonical modellen gebruiken;
- audit compleet is;
- export/delete/retention governance getest is;
- accessibility/error/empty/loading states getest zijn;
- observability zonder sensitive leakage werkt;
- geen legacy gym-id authorization dependency resteert in targetflow.

## 32. UX governance

Nog geen definitieve webschermen bouwen.

Na functional architecture closure volgt per workspace:
1. taak-/informatiearchitectuur;
2. concreet web mock-up/voorbeeld;
3. Product Owner review;
4. aanpassen;
5. expliciete goedkeuring;
6. pas daarna implementatie.

Dezelfde afspraak geldt voor mobiele schermen.

## 33. Harde architectuurregel

`GYM COMMERCIAL CONTROL != DATA CONTROL`.

Een Gym/Club mag eigen producten, prijzen, memberships en toegestane Trainingskompas-capabilities beheren. Dat geeft de organisatie nooit automatisch recht op de persoonlijke of gevoelige data van haar leden.

En:

`MOBILE + WEB = TWO CLIENTS, ONE PLATFORM`.

Geen duplicatie van organisaties, planning, programma's, subscriptions, entitlements of authorizationmodellen per client.