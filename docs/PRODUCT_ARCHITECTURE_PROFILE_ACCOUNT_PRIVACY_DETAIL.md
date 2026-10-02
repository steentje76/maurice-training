# Trainingskompas Target Product Architecture — Profile, Account & Privacy

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** targetarchitectuur voor identiteit, sportprofiel, profielfoto, instellingen, privacy/consent, delen, apparaten/verbindingen, notificaties, account/security, datarechten en abonnement. Dit document beschrijft targetfunctionaliteit; het is geen claim dat deze runtimefunctionaliteit al bestaat.

## 1. Kernprincipe

Trainingskompas scheidt vier concepten strikt:

1. **PROFILE** — wie is de gebruiker en welke sportcontext hoort bij hem/haar?
2. **SETTINGS** — hoe wil de gebruiker de app gebruiken?
3. **PRIVACY & CONSENT** — wie mag welke data voor welk doel zien/gebruiken?
4. **ENTITLEMENTS** — welke commerciële/productfunctionaliteit is beschikbaar?

Een instelling, abonnement of organisatierol is nooit automatisch toestemming om gevoelige sport-/gezondheidsdata te zien.

## 2. Target structuur

PROFIEL / INSTELLINGEN
- Persoonlijk profiel
- Sportprofiel
- Doelen & events
- Apparaten & verbindingen
- Privacy & delen
- Meldingen
- Data & account
- Abonnement
- Help & support
- App-instellingen

Dit is productarchitectuur. De uiteindelijke schermindeling, navigatie en visuele hiërarchie worden later scherm voor scherm door de Product Owner goedgekeurd vóór implementatie.

## 3. Persoonlijk profiel

Canonical ATHLETE PROFILE bevat minimaal:
- user/profile id;
- display name;
- optionele canonical avatar reference;
- locale/language;
- timezone;
- preferred units;
- expliciet gekozen zichtbare profielvelden;
- timestamps/versioning waar relevant.

Niet alle accountgegevens horen in het publieke/sociale profiel. Login-e-mail, securitygegevens, billinginformatie en gevoelige context zijn geen standaard profielvelden.

## 4. Profielfoto / avatar

Capability: `PROFILE-AVATAR-001`.

Gebruiker kan:
- profielfoto uploaden;
- vervangen;
- verwijderen;
- terugvallen op generated/default avatar.

Architectuurregels:
- één canonical avatarbron per account/profile;
- dezelfde avatar wordt hergebruikt in Profiel, AI Coach-context waar visueel relevant, Social/feed, Groups, Challenges, Team, Human Coach/PT en Gym/Club;
- modules maken geen onafhankelijke kopieën als eigen bron van waarheid;
- afbeelding wordt opgeslagen in protected/private storage met expliciete access policy;
- valideer filetype, grootte en decodeerbaarheid;
- strip onnodige metadata;
- server-side/object-level authorization voor wijzigen/verwijderen;
- oude avatarobjecten worden gecontroleerd opgeruimd na replacement;
- fallback blijft werken bij ontbrekende/corrupte image;
- avatar visibility volgt expliciete profiel/privacyregels.

Geen biometrische identificatie of gezichtsherkenning als onderdeel van deze capability.

## 5. Sportprofiel

SPORT PROFILE is trainingscontext en kan bevatten:
- primaire sport(en);
- secundaire sport(en);
- sportfamilies;
- ervaring/niveau;
- relevante voorkeuren;
- trainingsbeschikbaarheid waar bewust opgegeven;
- units/metric preferences;
- relevante sportcontext die door Context Engine mag worden gebruikt.

Sportprofiel is niet hetzelfde als sociaal profiel. Een sport kan relevant zijn voor Calculation/Context zonder publiek zichtbaar te zijn.

## 6. Doelen en events

Doelen/events kunnen centraal aan profielcontext worden gekoppeld, maar hun domeinlogica blijft in Training/Planning/Program/Events.

Voorbeelden:
- kracht-/performance-doel;
- 5 km/10 km/halve marathon/marathon;
- fiets-/triathlon-event;
- HYROX/wedstrijd;
- teamcompetitie/event;
- algemene consistentie-/trainingsdoelen.

Doeldata is input voor Context/Decision, niet een vrije AI-instructie om trainingsregels te verzinnen.

## 7. Apparaten & verbindingen

Managementlocatie voor connectoren/devices:
- gekoppelde platformaccounts;
- gekoppelde fysieke apparaten waar relevant;
- status laatste sync;
- scopes/toestemmingen;
- reconnect;
- disconnect;
- bron-/syncinformatie;
- real-device validation status waar productmatig relevant.

Dit verwijst naar de aparte Devices & Connections-architectuur. Apparaten blijven contextueel vanuit workouts verbindbaar; gebruiker hoeft niet eerst naar Instellingen.

## 8. Privacy als centrale capability

Privacy is geen verzameling losse toggles per scherm maar één canonical authorization/consent model.

Minimaal onderscheid:
- private by default;
- profile visibility;
- activity sharing;
- social sharing defaults;
- coach/PT data scopes;
- team/group scopes;
- organization/gym scopes;
- sensitive data scopes;
- research consent;
- blocked users;
- export/delete rights.

## 9. Data-classificatie

Minimaal classificeren:

**Identity/basic profile**
- display name;
- avatar;
- consciously public sports/profile fields.

**Training data**
- planned sessions;
- executions;
- performance;
- activities/history.

**Recovery/health-context data**
- HRV;
- resting HR;
- sleep;
- readiness/recovery inputs;
- health-platform sourced signals.

**Sensitive context**
- Women's Performance/cycle-related context;
- nutrition where user considers it sensitive;
- future health-context categories.

**Social/team/org data**
- memberships;
- posts/messages;
- attendance/availability;
- role/assignment information.

Authorization kan per categorie verschillen.

## 10. Consent/scopes

Een human coach/PT krijgt nooit automatisch alle athlete data.

Voorbeelden van afzonderlijke scopes:
- profile_basic;
- training_plan;
- training_execution;
- performance_history;
- recovery_summary;
- recovery_raw;
- nutrition_summary;
- nutrition_detail;
- womens_performance_context;
- messages;
- goal/event context.

Exacte scopes worden vóór implementatie gecanonicaliseerd. Sensitive scopes zijn expliciet opt-in en mogen niet door een generieke `coach_access=true` worden vervangen.

## 11. Consent lifecycle

Consent/relationship heeft minimaal:
- requested;
- active;
- declined;
- revoked;
- expired/ended waar relevant.

Bij revocation:
- nieuwe toegang stopt direct volgens policy;
- caches/materialized views worden ingetrokken/geïnvalideerd;
- toekomstige AI/context payloads bevatten de ingetrokken data niet;
- auditlog registreert policywijziging zonder gevoelige inhoud te dupliceren;
- wettelijke/operationele retentie wordt apart geregeld.

## 12. Team, Group en Gym/Club

Lidmaatschap is geen algemene data-access grant.

TEAM/GROUP/GYM mag alleen data zien die nodig is voor de expliciete productfunctie, bijvoorbeeld:
- naam/avatar indien zichtbaar;
- beschikbaarheid voor team-event;
- attendance;
- toegewezen training;
- relevante teamresultaten wanneer bewust gedeeld.

Geen impliciete toegang tot HRV, slaap, Women's Performance, volledige nutrition logs of privécoachdata.

Canonical organizations/teams/memberships zijn leidend; legacy gym-id architectuur mag niet de target authorizationbron worden.

## 13. Multi-role account

Eén persoon kan meerdere rollen hebben:
- athlete;
- coach/PT;
- team coach;
- gym staff;
- organization admin.

Geen afzonderlijk account per rol nodig.

Rollen bepalen beschikbare werkcontext en acties, maar niet automatisch datarechten. Context switching moet duidelijk maken namens welke rol/organisatie de gebruiker handelt.

## 14. Organization context switching

Bij meerdere organisaties/teams:
- expliciete active context;
- zichtbare organisatie/team-identiteit;
- geen data-lekkage tussen tenants;
- role/permission check op iedere server-side actie;
- geen vertrouwen op alleen client-side verborgen knoppen.

## 15. Account & authenticatie

DATA & ACCOUNT omvat conceptueel:
- login identity;
- verified email/status;
- password reset/auth provider management;
- actieve sessies/devices waar technisch ondersteund;
- sign-out everywhere;
- security events waar nuttig;
- toekomstige MFA/passkey mogelijkheid;
- account export;
- account deletion.

Geen gevoelige secrets/tokens zichtbaar in UI/logs.

## 16. Data export

Export moet gebruiker begrijpelijk toegang geven tot eigen data.

Architectuurvereisten:
- exportjob heeft eigenaar/auth check;
- bevat relevante user-owned datasets volgens beleid;
- provenance waar relevant behouden;
- gevoelige data beschermd;
- download tijdelijk/secure;
- expiry/cleanup;
- geen data van andere athletes/tenants lekken via gedeelde objecten.

## 17. Account deletion

Delete is end-to-end capability, niet alleen verwijderen van profielrij.

Deletion policy omvat:
- identity/account;
- athlete-owned training/activity/recovery/nutrition/context data;
- device tokens/connections;
- private files/avatar;
- social data volgens expliciete relationele policy;
- coach/team/org relationships;
- notification data;
- export artifacts;
- community-contributed productdata volgens aparte anonymization/governance policy;
- audit/legal retention uitzonderingen alleen expliciet.

Deletion completeness moet adversarieel getest worden.

## 18. Block/report

Blocked user policy is cross-cutting:
- social/feed;
- direct messaging;
- group interaction waar relevant;
- invitations;
- discoverability;
- notifications.

Een organisatorische/teamrelatie mag block/privacy niet stil omzeilen; uitzonderingen voor noodzakelijke teamadministratie vereisen expliciete productregel.

## 19. Notificaties

Notification preferences scheiden minimaal:
- training/planning reminders;
- coach messages/assignments;
- team/group messages/events;
- social interactions;
- recovery/context suggestions;
- device/sync errors;
- product/account/security;
- commercial communication.

Security-/accountkritische berichten mogen niet afhankelijk zijn van marketingopt-in.

Notificatiecontent respecteert lock-screen/privacycontext; gevoelige health/cycle/nutrition details niet standaard in push preview.

## 20. App-instellingen

Voorbeelden:
- taal;
- units;
- timezone/default planning behavior;
- accessibility preferences waar ondersteund;
- cache/local storage controls;
- diagnostics opt-in waar relevant;
- app information/version;
- legal documents.

Cache wissen is geen accountdata verwijderen.

## 21. Product telemetry & beta feedback

Telemetry is apart van functionele athlete data.

Vereisten:
- doelbinding;
- dataminimalisatie;
- geen raw health/sensitive payloads in analytics events;
- geen secrets/tokens;
- expliciete consent/legal basis volgens gekozen productbeleid;
- environment/build/version context;
- crash reports scrubben op PII/sensitive data;
- beta feedback kan screenshots/attachments alleen met expliciete user action bevatten.

## 22. Entitlements / abonnement

Subscription/entitlement bepaalt **of een capability beschikbaar is**, niet of iemand andermans data mag lezen.

Voorbeeldtiers blijven conceptueel:
- Free Athlete;
- Premium Athlete;
- Coach Pro;
- Gym/Club;
- Research/Enterprise.

Authorization/RLS en entitlement checks zijn afzonderlijke gates. `premium=true` mag nooit een privacy/RLS-check vervangen.

## 23. Upgrade/downgrade/cancel

Architectuur moet later ondersteunen:
- trial;
- upgrade;
- downgrade;
- cancel;
- restore purchase/subscription;
- billing failure/grace state;
- entitlement expiry;
- server-side verified entitlement state.

Bij downgrade blijft user-owned data behouden volgens policy; premiumanalyse kan ontoegankelijk worden zonder historische brondata destructief te verwijderen.

## 24. Profile visibility

Profielvelden hebben expliciete visibility in plaats van één alles-of-niets profiel.

Targetcategorieën kunnen zijn:
- PRIVATE;
- CONNECTIONS;
- GROUP/TEAM CONTEXT;
- PUBLIC waar productmatig toegestaan.

Sensitive health/contextvelden krijgen geen PUBLIC-optie zonder afzonderlijke veiligheids-/productbeslissing.

## 25. Sharing contract

Delen gebruikt canonical references naar bestaande objecten waar mogelijk, geen onbeheerde kopieën van gevoelige data.

Bij openen/renderen wordt authorization opnieuw gecontroleerd waar nodig. Revocation moet toekomstige toegang stoppen. Een share bevat alleen expliciet geselecteerde velden/context.

## 26. AI Coach privacy contract

AI Coach ontvangt alleen:
- data die voor de concrete taak nodig is;
- canonical berekende/Decision outputs waar beschikbaar;
- context waarvoor athlete/product policy toegang toestaat;
- confidence/provenance waar relevant.

AI krijgt geen brede profiel-/health dump uit gemak. AI mag privacy-instellingen niet wijzigen, consent niet verlenen en geen data met coach/team/social delen zonder expliciete toegestane useractie/productflow.

## 27. Data provenance

Waar profiel/contextdata downstream beslissingen beïnvloedt, blijft bekend:
- user-entered;
- imported;
- derived;
- coach-entered/assigned;
- organization-provided;
- system default.

Een default of inference mag niet als user-confirmed feit worden gepresenteerd.

## 28. Offline & sync

Profiel/settings/privacy hebben verschillende offline eisen.

Toegestaan waar veilig:
- cached profile display;
- lokale voorkeuren;
- queued non-sensitive edits met conflict policy.

Privacy/consent/securitywijzigingen vereisen serverbevestiging voordat de app doet alsof rechten definitief gewijzigd zijn. Offline stale authorization mag geen nieuwe toegang creëren.

## 29. Conflict resolution

Bij wijzigingen vanaf meerdere apparaten:
- settings kunnen veldgewijs/versioned worden opgelost;
- privacy/consent gebruikt expliciete server-side versie/audit;
- destructive actions krijgen idempotency;
- geen silent rollback van revocation door oude offline state.

## 30. Privacy by default

Defaults:
- athlete data private;
- geen automatische social sharing;
- geen automatische team/gym toegang tot sensitive data;
- geen automatische coach toegang buiten geaccepteerde scopes;
- geen automatische research sharing zonder consentmodel;
- notifications minimaliseren gevoelige previewtekst.

## 31. Help & support

Help/support kan omvatten:
- uitleg functionaliteit;
- sync/device troubleshooting;
- privacy/datarechten uitleg;
- contact support;
- feedback/bug report;
- app/build diagnostics die gebruiker bewust kan delen.

Supporttoegang tot productiegegevens is geen standaard recht en vereist aparte privileged-access governance/audit.

## 32. Legal/public documents

Minimaal productmatig voorbereiden:
- privacy policy;
- terms;
- data/export/delete uitleg;
- third-party data/integration disclosures;
- research consent information waar relevant;
- subscription terms waar relevant.

Deze documenten zijn niet hetzelfde als technische privacycontrols maar moeten ermee overeenkomen.

## 33. Functioneel >=9 closure criteria

Deze capability is pas functioneel >=9 wanneer minimaal bewezen is:
- canonical profile werkt;
- avatar upload/replace/delete/fallback werkt;
- avatar authorization/storage cleanup werkt;
- sportprofiel/context werkt zonder public-sharing koppeling;
- privacy defaults private zijn;
- granular coach scopes end-to-end worden afgedwongen;
- sensitive scopes afzonderlijk zijn;
- consent grant/revoke direct doorwerkt;
- team/gym membership geen impliciete sensitive access geeft;
- multi-role/multi-org tenant isolation bewezen is;
- block/report cross-cutting wordt afgedwongen;
- notifications privacy respecteren;
- export compleet en tenant-safe is;
- delete completeness bewezen is;
- device disconnect/revoke correct werkt;
- entitlement en authorization aantoonbaar gescheiden zijn;
- offline state geen authorization bypass veroorzaakt;
- AI payload minimalisatie/scopes getest zijn;
- telemetry/crash reports geen gevoelige payloads lekken;
- security/adversarial RLS tests groen zijn;
- error/empty/offline states veilig zijn;
- accessibility voor uiteindelijke UX getest is.

## 34. Product Owner defaults

Aanbevolen defaults voor Trainingskompas:
- één account kan meerdere rollen hebben;
- één canonical avatar;
- profile identity en account/security strikt gescheiden;
- private by default;
- sensitive data nooit automatisch social/team/gym delen;
- coach toegang granular en revocable;
- devices onder Profile/Settings beheerd maar ook contextueel verbindbaar;
- entitlements en authorization strikt gescheiden;
- data export/delete first-class;
- geen biometrische gezichtsherkenning;
- geen final UX bouwen vóór screen-by-screen Product Owner approval.

## 35. Open beslissingen voor latere productfase

Nog niet nodig om architectuur te blokkeren:
- exacte publieke profielvelden;
- username/handle versus alleen display name;
- MFA/passkeys releasefase;
- precieze subscription tiers/prijzen;
- diagnostics/telemetry opt-in model per markt;
- eventuele family/minor accounts;
- expert/research accountrollen;
- exacte retentiontermijnen per datacategorie.

## 36. Harde architectuurregel

`IDENTITY != AUTHORIZATION != ENTITLEMENT`.

Wie iemand is, welke rol iemand heeft en voor welke functionaliteit is betaald zijn afzonderlijke dimensies. Toegang tot athlete data wordt uitsluitend verleend door de relevante ownership/relationship/consent/RLS-policy. Geen scherm, rol, abonnement of AI-context mag deze scheiding omzeilen.