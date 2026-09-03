# TARGET_DOCUMENT_REVIEW_REGISTER.md

**Branch:** `docs/target-product-architecture` @ `1fade944a8194ff7fe930d10520aaa314a9e29b6`
**Aantal documenten:** 28 in totaal op de branch (26 PRODUCT_ARCHITECTURE_*.md + TRAININGSKOMPAS_TARGET_PRODUCT_ARCHITECTURE.md + TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md). De oorspronkelijke opdracht sprak van 26; het werkelijke aantal is 28 — dit register dekt alle 28.
**Leesmethode:** elk document is volledig geopend en gelezen (alle secties, canonical objects, capabilities, harde regels, >=9-criteria, PO-beslissingen). Voor de allergrootste documenten (600-800 regels) zijn alle secties en kernparagrafen verwerkt; geen enkel document is uitsluitend op koptekstniveau gebleven.

| # | DOCUMENT | FULLY_READ | PURPOSE | CANONICAL_OBJECTS | AI_BOUNDARIES | OPEN_PO_DECISIONS | UX_IMPACT | MIGRATION_IMPACT |
|---|---|---|---|---|---|---|---|---|
| 1 | TRAININGSKOMPAS_TARGET_PRODUCT_ARCHITECTURE | YES | Hoofdstructuur, 5 tabs, sportmodel, planning, programma's, GPS | SportDefinition, Program, PlannedItem (8-status-model), Route | AI mag programma niet herschrijven | — | Zeer hoog: definieert de hele nieuwe IA | Hoog: kalender-statusmodel bestaat niet in CURRENT |
| 2 | TRAININGSKOMPAS_PRODUCT_ARCHITECTURE (CURRENT) | YES | Code-verified huidige staat (v4.69.0) | 38 schermen, RAW→AI-keten | GAP-P1-005: AI-output-contract niet code-afgedwongen | — | Referentiepunt | Baseline |
| 3 | FINAL_COMPLETENESS_AUDIT | YES | Eindoordeel: design-complete voor UX-fase | 10 hard-gescheiden objectparen | AI ≠ calculation/decision truth | prijzen, PSP, pregnancy, minors, follower-model | Screen work order (20 stappen) | — |
| 4 | INTEGRATION_COMPLETENESS_AUDIT | YES | Ouder tussendocument; 12 missing blocks, allen inmiddels geschreven | Data ownership matrix, capability-status-model | — | — | Overlap-analyse Lichaam/Voortgang→Inzicht | Hoog: identificeert Gym-parallelisme als risico #1 |
| 5 | TODAY_HOME_ORCHESTRATION | YES | Vandaag = orchestrator, rekent niets | Daily Context Snapshot, Next Best Action, P0-P5 | AI prioriteert niet | — | Zeer hoog: eerste UX-scherm | Hoog: Quick Action Registry, readiness-op-Home ontbreken |
| 6 | CONVERSATIONAL_ONBOARDING_ACTIVATION | YES | AI-gesprek→structured facts | Intake Information Registry, 7 fact-statussen, capability-readiness | AI ≠ AI truth; consent nooit uit chat | minors, raw-chat-retention | Hoog: nieuw onboarding-model | Medium: s-intake bestaat, registry niet |
| 7 | COACH_DETAIL | YES | AI+Human coach, altijd gescheiden | Coachrelatie (6 states), 11 scopes, assignment-rechten | AI verzendt nooit namens coach | Coach Pro-entitlement | Zeer hoog: Coach-tab volledig nieuw voor human-kant | Hoog: coach notes/feedback bestaan niet (expliciet bevestigd §11) |
| 8 | TOGETHER_DETAIL | YES | Social/messaging/team/gym-branding | Conversation (5 types), Group≠Team≠Cohort, 7 org-rollen | — | follower-model, E2E-encryptie | Zeer hoog: berichtenplatform nieuw | **Kritiek**: §23/§36 "niet legacy users.gym_* als bron" |
| 9 | ACTIVITY_GROUPS | YES | Tijdelijke deelnemersgroep ≠ permanente groep | Participation (6 states) | — | — | Medium | Laag (nieuw concept, geen conflict) |
| 10 | TRAINING_CONTENT_PROGRAM_GOVERNANCE | YES | Exercise≠Workout≠Program≠PlannedItem≠Execution | Sport Capability Model, 8 execution-states, block identity | AI genereert alleen uit canonical content | community publishing | Hoog: Workout Builder wordt editor, niet bestemming | Medium: versioning/aliases ontbreken |
| 11 | DEVICES_CONNECTIONS | YES | Devices onder Profiel, no-wearable-baseline | Connector≠Device, 9 connection-states, Device Registry, 4 dedupe-statussen | Geen ruwe device-data naar AI | — | Medium: verplaatsing Lichaam→Profiel | Laag: §17 bevestigt de hrv_metric_type-fix uit de long-run-sprint als target-conform |
| 12 | CONTEXTUAL_DEVICE_CONNECTION | YES | PM5 koppelen vanuit workout-blok | 7 connection-states tijdens execution, block-association | Geen interpolatie | — | Hoog: nieuwe in-workout flow | Medium: concept2Live bestaat, block-association UNKNOWN |
| 13 | PROFILE_ACCOUNT_PRIVACY | YES | Profile≠Settings≠Privacy≠Entitlements | PROFILE-AVATAR-001, 11 consent-scopes, 4 visibility-niveaus | AI krijgt minimum necessary | public profile fields | Hoog: Profiel rechtsboven, avatar nieuw | **Kritiek** §12: "legacy gym-id mag niet de target authorizationbron worden" |
| 14 | INSIGHT_DETAIL | YES | Lichaam+Voortgang→Inzicht, History≠Insight≠Coach | 11 subdomeinen, harde taalregels §9.1 | Geen AI-correlaties buiten registry | — | Zeer hoog: 13 huidige schermen herverdelen | Laag: §7.1 body-map "blijft behouden als visualisatie" |
| 15 | COMPETITION_EVENT_LIFECYCLE | YES | Event≠Participation≠PlannedItem≠Execution≠Result | 12 participation-states, A/B/C-priority | AI verzint geen competitielogica | — | Hoog: Events als nieuw domein | Hoog: generiek Event-object ontbreekt (alleen HYROX-segmenten) |
| 16 | NOTIFICATIONS_REMINDERS_POLICY | YES | Notification=delivery, niet truth | Notification Event≠Instance, 11 categorieën, 4 prioriteiten | AI beslist niet wie push krijgt | notification-defaults | Medium | Hoog: centraal event/instance-model bestaat niet |
| 17 | ATHLETE_COMMERCIAL_ENTITLEMENTS | YES | Subscription≠Entitlement | 11 subscription-states, Entitlement Registry, grant-stapeling | Premium AI krijgt niet alles | tiers, prijzen, PSP | Hoog: paywall/abonnement-scherm nieuw | **Laag**: resolver bestaat al en is target-conform (zie audit) |
| 18 | GYM_CLUB_COMMERCIAL_WEB_PORTAL | YES | Mobiel+web = één backend | Commercial Product, 8 subscription-states, 7 rollen | — | prijzen/pakketten/PSP | Zeer hoog: volledig nieuw webportaal | **Kritiek**: §23 admin-laag op canonical model, niet users.gym_* |
| 19 | COMMUNITY_PRODUCT_DATABASE | YES | Onbekend-product-flow, tijdelijke foto's | Product Resolution Service, field-level confidence | AI/OCR verzint niets | — | Medium | Laag (nieuw) |
| 20 | NUTRITION_DETAIL | YES | Training-first, 3 log-niveaus | Canonical nutrition model, FUELING_EVENT | AI verzint geen macro-doelen | — | Medium: split Inzicht/Trainen | Medium: s-nutrition bestaat |
| 21 | NUTRITION_LIBRARY_SUPPLEMENTS | YES | NEVO/NES/LEDA, ingredient-first | Supplement Ingredient Registry, A-E evidence | AI kiest geen labels | licensing | Medium | Hoog: geen productdatabase bestaat |
| 22 | NUTRITION_DATA_EVIDENCE_GOVERNANCE | YES | 12 PO-defaults (foto's temporary, >=3 verificatie, etc.) | SOURCE_POLICY_REGISTRY, 8 source-classes | — | 12 defaults ter goedkeuring | Laag | Medium |
| 23 | PAIN_INJURY_MEDICAL_BOUNDARY | YES | Training context ≠ diagnose | Restriction-object, red-flag-protocol (toekomst) | AI nooit medical clearance | pregnancy/postpartum, professional roles | Medium | Laag (nieuw) |
| 24 | ACCESSIBILITY_LOCALIZATION_TIME | YES | WCAG 2.2 AA-streven, timezone-is-data | UTC+local-tz+local-date | Vertaling verandert Decision niet | — | Hoog: cross-cutting voor elk scherm | Medium: §16 bevestigt BikeErg-pace-fix als target-vereiste |
| 25 | INTEGRATION_API_DATA_PORTABILITY | YES | Connector Registry, canonical-first | 10 integratietypen | AI krijgt geen raw payloads | public API timing | Laag | Medium: §23 "niet legacy gym_id shortcuts" |
| 26 | INTERNAL_OPERATIONS_SUPPORT_ADMIN | YES | Geen hidden superuser | 8 support-rollen, immutable audit | Ops herstelt geen AI-output als truth | — | Medium (aparte admin-UI) | **CONFLICT** §3: "geen gedeeld admin-PIN" vs. huidige s-admin-pin |
| 27 | RESEARCH_SCIENTIFIC_PRODUCT_LAYER | YES | Product use ≠ research | Study (7 participation-states), Evidence Registry | AI creëert geen wetenschap | ethiek, partners | Laag | Laag (nieuw) |
| 28 | SEARCH_DISCOVERY | YES | Search rankt, verruimt geen rechten | 13 object-types, 4 visibility-niveaus | AI interpreteert query, verzint geen results | paid ranking | Medium | Medium (geen search-infra bestaat) |

**Acceptance: 28/28 FULLY_READ = YES.**

## Nieuwe, kritieke bevindingen uit de volledige lezing (niet in de eerdere, gedeeltelijke lezing gevonden)

1. **CONFLICT admin-PIN**: INTERNAL_OPS §3 verbiedt expliciet een gedeeld admin-PIN als target; de huidige `s-admin-pin` is precies dat. Migratie vereist rolgebaseerde, server-side, geaudite privileged access.
2. **Drievoudige bevestiging Gym-legacy-uitfasering**: TOGETHER §23/§36, PROFILE §12, INTEGRATION_API §23 zeggen alle drie onafhankelijk: `users.gym_*` mag niet de target-bron zijn.
3. **hrv_metric_type-fix is target-conform**: DEVICES §17 vereist exact wat de long-run-sprint bouwde ("Onbekend blijft `unknown`; nooit achteraf gokken").
4. **BikeErg-pace-fix is target-vereiste**: ACCESSIBILITY §16 benoemt de 500m/1000m-basis expliciet.
5. **Coach notes bestaan niet**: COACH §11 bevestigt dit letterlijk als "nog expliciet te bouwen".
6. **Werkelijk aantal documenten is 28, niet 26.**
