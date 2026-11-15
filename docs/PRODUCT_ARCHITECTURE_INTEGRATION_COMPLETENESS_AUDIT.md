# Trainingskompas Target Product Architecture — Integration & Completeness Audit

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Purpose:** integrale controle van de reeds ontworpen targetproductarchitectuur op overlap, ontbrekende verbindingen, doublures, capability ownership en resterende functionele productblokken. Dit is geen runtime-audit en geen claim dat de beschreven targetfunctionaliteit al gebouwd is.

## 1. Scope van deze audit

De audit legt de volgende targetdocumenten naast elkaar:
- target product architecture;
- Insight;
- Coach;
- Samen/Social/Team/Gym;
- Activity-bound groups;
- Devices & Connections;
- Contextual device connection;
- Nutrition;
- Nutrition library/supplements;
- Nutrition data/evidence governance;
- Community product database;
- Profile/Account/Privacy;
- Gym/Club Commercial & Web Portal.

Doel is eerst de **functionele productarchitectuur compleet** te maken. Final UX, buttons, visual hierarchy en look & feel komen pas daarna en worden scherm voor scherm door de Product Owner goedgekeurd.

## 2. Hoofdconclusie

De kernarchitectuur is inmiddels breed genoeg om een volwassen multisportplatform te dragen, maar is nog **niet productarchitectuur-compleet**.

Sterk afgedekt:
- training execution;
- planning/programs;
- multisport/sport capability model;
- route/GPS/outdoor data;
- history/comparison;
- Insight;
- AI Coach + Human Coach/PT;
- Social/Groups/Challenges;
- Team;
- Gym/Club organization context;
- devices/wearables;
- contextual device connection;
- nutrition + supplements + product data;
- profile/account/privacy;
- gym commercial subscriptions;
- mobile + web organization model.

Nog onvoldoende als afzonderlijk productcontract uitgewerkt:
1. Today/Home orchestration;
2. onboarding/intake/activation;
3. exercise/content/program library governance;
4. competitions/events lifecycle beyond simple calendar item;
5. search/discovery across product domains;
6. central notification/reminder policy;
7. athlete-level commercial/subscription architecture;
8. support/internal administration/operations;
9. scientific/research product architecture;
10. platform-wide accessibility/localization/timezone contract;
11. public API/data portability/integration governance;
12. safety/escalation boundaries for pain/injury/medical-context inputs.

Deze zijn functionele architectuurgaten, geen argument om nu schermen te bouwen.

## 3. Canonical top-level ownership

Target user-facing destinations blijven conceptueel:

```text
VANDAAG
TRAINEN
INZICHT
COACH
SAMEN
PROFILE / SETTINGS
```

Niet iedere capability is een top-level bestemming.

Voorbeelden:
- Devices = managed under Profile/Settings, contextueel in workouts, zichtbaar in Insight/History;
- Nutrition = logging/context + Insight, niet per se hoofdtab;
- Gym/Club = organization context onder Samen en web management;
- History = performance record layer onder Trainen/Inzicht-context, geen los productuniversum;
- Privacy = cross-cutting authorization capability, managed under Profile/Settings;
- Commercial = entitlement/billing service, niet automatisch een hoofdtab.

## 4. Overlap: Lichaam versus Voortgang

Besluit blijft correct: huidige concepten `Lichaam` en `Voortgang` overlappen te veel.

Target ownership:
- raw/user-entered body/recovery data = canonical data layer;
- meaningful interpretation = INZICHT;
- recommendation/action = COACH;
- training impact = TRAINEN/VANDAAG;

Dus geen parallelle analyse op meerdere plekken met verschillende definities.

## 5. Overlap: AI Coach versus Human Coach

Geen aparte datasilo's.

AI Coach:
- interpreteert approved Calculation/Context/Decision outputs;
- communiceert uncertainty/evidence;
- voert geen zelfstandige berekeningen/rules uit.

Human Coach/PT:
- werkt via relationship + scopes;
- gebruikt dezelfde planning/program/history/insight objects;
- kan feedback/assignments geven binnen rechten.

UI moet later afzender/bron altijd duidelijk maken, maar dat is UXfase.

## 6. Overlap: Groups, Teams, Activity Cohorts

Canonical scheiding:

**GROUP** = relatief lichte sociale community.

**TEAM** = duurzame operationele sportstructuur met coach, planning, attendance, wedstrijden, taken.

**ACTIVITY COHORT / PARTICIPATION** = tijdelijke groep rond één planned event/workout occurrence.

Geen automatische permanente Group per training. Een event kan een contextthread en participant list hebben zonder nieuwe social group te creëren.

## 7. Overlap: Gym/Club membership versus Team membership

Organization/Gym/Club is de tenant/organisatiecontext.

Team is een sport-/operationele structuur binnen of buiten organization context.

Een team kan binnen een gym/club bestaan, maar teamlidmaatschap en organization membership blijven afzonderlijke relaties met eigen scopes.

Geen globale `gym_id` targetaanname.

## 8. Overlap: Gym abonnement versus Trainingskompas abonnement

Canonical onderscheid:
- organization membership;
- gym commercial subscription;
- Trainingskompas athlete subscription;
- product entitlements;
- authorization/consent.

Deze mogen niet samenvallen in één boolean/status.

## 9. Overlap: Nutrition data versus supplement evidence

Hard gescheiden:

PRODUCT/LABEL DATA = wat zit in product volgens bron/label.

CONSUMPTION LOG = wat athlete zegt te hebben gebruikt.

SUPPLEMENT EVIDENCE = wat evidence per ingredient + goal + context ondersteunt.

AI/OCR/product community mag evidence status nooit verhogen.

## 10. Overlap: Device source versus measured value

Device/platform is provenance/source, niet automatisch waarheid.

Canonical metric behoudt:
- source/device/platform;
- timestamp;
- unit;
- quality;
- confidence;
- correction state;
- dedupe lineage.

Contextual workout connection is execution UX/capability bovenop hetzelfde Device Registry/connector model.

## 11. Overlap: History versus Insight versus Coach

Hard conceptueel onderscheid:

**HISTORY** — wat gebeurde er?

**INSIGHT** — wat betekent de ontwikkeling/patronen op basis van geregistreerde analyses?

**COACH** — wat kan de athlete ermee doen binnen toegestane Decision rules?

Dit voorkomt drie concurrerende interpretatielagen.

## 12. Missing block A — Vandaag / Home Orchestration

`Vandaag` is architectonisch belangrijk genoeg voor een eigen functioneel contract.

Het moet geen willekeurige dashboardverzameling worden.

Target responsibilities:
- planned sessions vandaag;
- next event/training;
- readiness/recovery summary;
- belangrijke planningwijzigingen;
- actionable device/sync issue;
- athlete-selected quick actions;
- rule-driven warnings/signals;
- relevant coach feedback/message;
- context zoals outdoor weather wanneer relevant;
- nutrition/fueling reminder waar expliciet gepland;
- team/event availability/task wanneer urgent;
- account/security notices wanneer noodzakelijk.

Nog uitwerken:
- priority model;
- card/source ownership;
- conflicts;
- suppress/repeat rules;
- personalizable versus non-hideable items;
- offline/stale handling;
- no-duplicate-notifications rule.

**Priority: P0 architecture before UX.**

## 13. Missing block B — Onboarding / Intake / Activation

Er bestaat huidige onboarding, maar targetcontract moet alle nieuwe capabilities samenbrengen.

Onboarding moet minimaal bepalen:
- account identity;
- primary sports;
- goals/events;
- level/context;
- units/timezone;
- optional device/platform connection;
- optional privacy/social discoverability choices;
- notification permission flow;
- optional nutrition context;
- optional Women's Performance context;
- organization/team invitation acceptance;
- coach relation acceptance;
- no-wearable path.

Principes:
- progressive disclosure;
- sensitive data optional;
- geen forced wearable;
- geen forced social;
- geen AI-generated unsupported profile facts;
- resume/retry;
- invitation-based onboarding preserves intended organization/team context.

**Priority: P0 architecture before UX.**

## 14. Missing block C — Exercise, Workout & Program Content Library Governance

Training execution/programs zijn uitgewerkt, maar content governance nog onvoldoende.

Nodig:
- canonical exercise identity;
- aliases/synonyms;
- sport/equipment applicability;
- movement pattern/muscle metadata;
- instructions/media provenance;
- contraindication/safety wording governance;
- user-created exercises;
- coach/gym-created content;
- official Trainingskompas content;
- versions/deprecations;
- duplicate merge policy;
- language/localization;
- source/license for media/content;
- search/filter taxonomy;
- program template source/version/publication.

Doel: voorkomen dat dezelfde oefening in vijf modules vijf onafhankelijke records krijgt.

**Priority: P0/P1 architecture before UX.**

## 15. Missing block D — Competition & Event Lifecycle

Calendar event bestaat, maar een wedstrijd/event kan functioneel meer zijn dan datum/tijd.

Target lifecycle kan omvatten:
- planned event;
- registration metadata;
- goal/target;
- start location/course where relevant;
- taper/program link;
- travel/logistics optional;
- equipment checklist;
- nutrition/fueling plan;
- team roster/availability;
- result import/manual result;
- official versus self-recorded result provenance;
- personal best/qualification context;
- post-event analysis;
- recurring season/team competition structure.

Niet iedere sport gebruikt alle velden.

**Priority: P1.**

## 16. Missing block E — Search & Discovery

Met veel content wordt zoekarchitectuur een functionaliteit, niet alleen UX.

Search domains:
- exercises;
- workouts;
- programs;
- activities/history;
- routes;
- people;
- groups;
- teams;
- gyms/clubs;
- challenges;
- food/products/supplements;
- help/documentation.

Vereisten:
- authorization-aware;
- locale-aware;
- aliases/synonyms;
- source/confidence aware where needed;
- no private-directory leakage;
- deterministic filters;
- recent/favorites where domain permits.

Geen verplicht universeel zoekscherm; wel één search contract/taxonomystrategie.

**Priority: P1.**

## 17. Missing block F — Notification & Reminder Policy

Notifications komen al in meerdere docs terug, maar zonder centraal contract ontstaat duplicate/contradictory behavior.

Canonical notification engine moet owners/categories/priorities kennen.

Categories:
- training/planning;
- coach;
- team/group;
- social;
- recovery/context;
- device/sync;
- nutrition/fueling;
- billing;
- account/security;
- research/consent later.

Vereisten:
- in-app + push + optional email where justified;
- user preferences;
- quiet hours/frequency limits;
- dedupe;
- escalation only via rules;
- sensitive preview redaction;
- timezone safe;
- stale reminder cancellation after reschedule;
- no shaming language.

**Priority: P0/P1 because cross-cutting.**

## 18. Missing block G — Athlete Commercial & Subscription

Gym commercial architecture is nu sterk, maar individuele athlete commerce moet apart worden gecanonicaliseerd.

Nodig:
- Free Athlete;
- Premium Athlete;
- trials;
- app-store/web purchase source;
- restore;
- upgrade/downgrade/cancel;
- grace/payment failure;
- entitlement combination with gym-sponsored access;
- data retention after downgrade;
- pricing/paywall experiments only with governance;
- receipt/provider verification;
- tax/store constraints.

Coach Pro en Gym/Club blijven aparte commercial products met hetzelfde central entitlement service.

**Priority: P1 before public monetization.**

## 19. Missing block H — Internal Operations / Support / Admin

Een volwassen product heeft interne operational tooling nodig zonder verborgen superuser bypass.

Target capabilities:
- support cases;
- user-reported sync/device errors;
- safe diagnostic bundle;
- crash/telemetry review;
- feature/config rollout;
- account assistance within explicit privileges;
- abuse/moderation tooling;
- organization support;
- billing support references;
- data correction workflows where allowed;
- audit of privileged actions.

Support mag niet standaard alle sensitive athlete data lezen.

**Priority: P1 production readiness.**

## 20. Missing block I — Scientific / Research Product Layer

Roadmap bevat Scientific als eigen productlaag; targetarchitectuur moet dit nog expliciet uitwerken.

Targetvragen:
- research consent lifecycle;
- cohort eligibility;
- de-identification/pseudonymization;
- dataset definition/version;
- calculation/evidence version provenance;
- export format;
- re-consent when purpose changes;
- withdrawal handling;
- researcher/partner roles;
- no direct production athlete access by default;
- aggregate versus individual outputs;
- ethics/legal governance;
- publication/reproducibility metadata.

**Priority: P1/P2 afhankelijk release scope, maar architecture before research use.**

## 21. Missing block J — Accessibility, Localization & Time

Dit is cross-cutting functional architecture.

Minimaal:
- Dutch/English extensible localization keys;
- units metric/imperial where relevant;
- timezone-aware planning/event/history;
- daylight-saving transitions;
- locale-specific dates/numbers;
- screen-reader semantics later in UX;
- keyboard web portal;
- text scaling;
- contrast/focus;
- motion preferences where relevant.

Sport calculations blijven canonical units internally; UI-conversion mag formulebetekenis niet veranderen.

**Priority: P1 before UX implementation freeze.**

## 22. Missing block K — Integration/API & Data Portability Governance

Naast predefined connectors is een platformcontract nodig voor toekomstige integraties.

Nodig:
- inbound connector contract;
- outbound export/API contract;
- OAuth/scopes;
- webhooks where relevant;
- rate limits;
- idempotency;
- provenance;
- partner isolation;
- schema/versioning;
- revocation;
- deletion propagation where required;
- no external partner as Calculation/Decision source of truth unless explicitly registered.

Dit voorkomt per leverancier bespoke architecture.

**Priority: P1/P2.**

## 23. Missing block L — Pain/Injury/Medical Boundary

Trainingskompas mag recovery/context ondersteunen, maar moet exact begrenzen wat gebeurt bij pain/injury/medical signals.

Nodig:
- user can report pain/injury limitation if product chooses;
- distinction subjective limitation versus diagnosis;
- emergency/red-flag scope if any;
- allowed Decision rules;
- when advice becomes `seek qualified professional` rather than training optimization;
- no diagnosis;
- no rehabilitation protocol generation unless separately validated product;
- coach visibility only through explicit consent;
- pregnancy/postpartum/menopause expansion remains separate governed decision.

**Priority: P0 safety architecture before adding injury intelligence.**

## 24. Cross-cutting source-of-truth map

```text
RAW SOURCES
  manual / wearable / device / platform / external product source
        |
NORMALIZATION + PROVENANCE + DATA QUALITY
        |
CANONICAL DOMAIN MODELS
  training / activity / recovery / nutrition / social / org / commercial
        |
CALCULATION ENGINE
        |
CONTEXT ENGINE
        |
DECISION/RULES ENGINE
        |
EVIDENCE + CONFIDENCE
        |
AI COACH / HUMAN COACH / INSIGHT / TODAY
        |
ATHLETE / TEAM / GYM EXPERIENCE
```

Geen targetdocument mag hiervan een parallelle reken-/beslisroute introduceren.

## 25. Cross-domain event bus / derived updates

Met veel domeinen is expliciete event propagation nodig.

Voorbeelden:
- training rescheduled -> calendar + reminders + team context + fueling reminder update;
- device disconnected -> settings status + contextual workout fallback;
- consent revoked -> coach access + AI payload + cached views invalidated;
- subscription changed -> entitlement state only, not privacy;
- product recipe version changed -> future product resolution, not silent historical log rewrite;
- workout completed -> history + calculations + insight candidates + program state.

Architectuur moet event-driven updates idempotent maken en circular updates voorkomen.

## 26. Data ownership matrix requirement

Voor implementatie moet ieder canonical object één eigenaarstype hebben:
- athlete-owned;
- organization-owned;
- coach-created but athlete-assigned;
- shared relation-owned;
- system/reference data;
- external-source cached data.

Dit is noodzakelijk voor delete/export, leaving organization, revocation en versioning.

## 27. Capability status model

Voor toekomstige architecture-to-build overgang iedere capability labelen met minimaal:
- NOT STARTED;
- IMPLEMENTED;
- TESTED;
- INTEGRATED;
- VALIDATED;
- CLOSED.

En dimensies waar nodig:
- software;
- database;
- integration;
- device;
- scientific;
- privacy/security;
- UX.

`Software closed` betekent niet automatisch `real-device validated` of `UX approved`.

## 28. Functioneel >=9 productarchitectuurcriteria

Voor een domein naar functioneel >=9 te brengen moet vooraf duidelijk zijn:
- canonical object model;
- ownership;
- permissions/consent;
- happy path;
- correction/edit/delete;
- offline/retry waar relevant;
- dedupe/conflict/versioning;
- provenance/data quality;
- notifications;
- import/export;
- observability;
- error/empty states;
- entitlement relationship;
- AI permissions/restrictions;
- Calculation/Decision dependencies;
- evidence/safety boundaries;
- integration tests;
- adversarial privacy/security tests;
- external validation status.

UX score is later een afzonderlijke dimensie.

## 29. Recommended architecture sequence from here

Voordat schermarchitectuur start, ontwerp in deze volgorde:

1. **Today/Home Orchestration** — centrale dagelijkse ervaring en priority rules.
2. **Onboarding & Activation** — ingang tot alle capabilities.
3. **Exercise/Workout/Program Content Governance** — fundering Training content.
4. **Central Notifications & Reminders** — cross-cutting consistency.
5. **Athlete Commercial & Entitlements** — complement op Gym commercial.
6. **Competition/Event Lifecycle**.
7. **Research/Scientific Product Layer**.
8. **Internal Ops/Support/Admin**.
9. **Integration/API Governance**.
10. **Accessibility/Localization/Time** als cross-cutting closure.
11. Safety/medical boundary definitief sluiten voor features die pijn/injury-context gebruiken.
12. Daarna finale target architecture completeness review.

Search/Discovery wordt parallel meegenomen in de content/social/nutrition domains en daarna als gedeeld contract gesloten.

## 30. Current architecture readiness assessment

Qualitatieve architecture completeness, niet runtime maturity:
- Training/Planning/Programs: HIGH;
- History/Performance: HIGH;
- Insight: HIGH;
- Coach: HIGH;
- Social/Team/Gym: HIGH;
- Devices: HIGH;
- Nutrition: HIGH;
- Profile/Privacy: HIGH;
- Gym Commercial/Web: HIGH;
- Today/Home: MEDIUM;
- Onboarding: MEDIUM/LOW;
- Content Library governance: MEDIUM;
- Notifications: MEDIUM;
- Athlete Commercial: MEDIUM;
- Events/Competitions: MEDIUM;
- Research product: MEDIUM/LOW;
- Internal Ops: MEDIUM/LOW;
- API/Partner governance: MEDIUM;
- Accessibility/Localization: MEDIUM;
- medical/injury boundary: MEDIUM.

Daarom is **screen architecture nog niet de volgende stap**.

## 31. Product Owner decision carried forward

De Product Owner heeft de volgorde vastgesteld:

1. productfunctionaliteit/architectuur eerst naar benchmarkwaardig >=9;
2. daarna schermen en user experience verbeteren;
3. per scherm eerst een voorbeeld/mock-up;
4. pas na expliciete goedkeuring bouwen;
5. daarna bredere visual/design-system consistency.

Deze audit volgt die volgorde.

## 32. Harde afsluitregel

Geen nieuw scherm of navigatie-item wordt gebruikt om een onopgelost functioneel architectuurprobleem te maskeren.

Eerst bepalen we **wat Trainingskompas functioneel is en welke bron van waarheid ieder onderdeel heeft**. Daarna bepalen we hoe de gebruiker het ziet en bedient.