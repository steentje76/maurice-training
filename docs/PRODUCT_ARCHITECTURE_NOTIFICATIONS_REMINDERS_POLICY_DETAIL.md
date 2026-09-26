# Trainingskompas Target Product Architecture — Notifications & Reminders Policy

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor notificaties, reminders, delivery policy, quiet hours, privacy, deep links, retries, dedupe en cross-domain event delivery. Geen definitief UX-ontwerp en geen claim dat alle beschreven runtimefunctionaliteit al bestaat.

## 1. Productdoel

Notificaties moeten relevante actie ondersteunen zonder Trainingskompas te veranderen in een engagement-machine.

Kernregel:

`NOTIFICATION = DELIVERY, NOT TRUTH`.

De bron van waarheid blijft het canonical object in Planning, Team, Coach, Devices, Account, Nutrition, Recovery of een ander domein.

## 2. Architectuurketen

```text
Canonical domain event/state
        ↓
Notification eligibility policy
        ↓
Priority + sensitivity + timing
        ↓
User preferences / consent / quiet hours
        ↓
Delivery decision
        ↓
Push / in-app / email later where allowed
        ↓
Deep link to canonical state
```

AI bepaalt niet zelfstandig wie wanneer welke push krijgt.

## 3. Notification Event model

Conceptueel `NOTIFICATION_EVENT`:
- notification_event_id;
- athlete/user recipient;
- source_domain;
- canonical_object_ref;
- event_type;
- created_at;
- relevance window;
- urgency;
- sensitivity;
- dedupe_key;
- actionability;
- delivery eligibility;
- required auth/entitlement;
- source actor where relevant;
- provenance;
- policy/version.

## 4. Notification Instance model

Delivery instance apart van event:
- notification_instance_id;
- event_id;
- channel;
- scheduled_for;
- delivered_at;
- opened_at;
- dismissed_at;
- failure/retry state;
- locale;
- payload version;
- deep-link target;
- privacy-safe preview mode.

Hiermee blijft één gebeurtenis één bron, ook als meerdere kanalen bestaan.

## 5. Categorieën

Minimaal:
- ACCOUNT_SECURITY;
- TRAINING_PLANNING;
- COACH_HUMAN;
- TEAM_GROUP_ORG;
- SOCIAL;
- RECOVERY_CONTEXT;
- DEVICE_SYNC;
- NUTRITION;
- EVENT_COMPETITION;
- COMMERCIAL;
- RESEARCH where separately consented.

Security mag niet afhankelijk zijn van marketing-notification opt-in.

## 6. Prioriteit

Aanbevolen klassen:
- CRITICAL: security/account integrity;
- HIGH: imminent actionable commitment or required response;
- NORMAL: useful time-relevant information;
- LOW: optional informational/engagement.

Commercial en social mogen geen training-, safety- of securityrelevante berichten verdringen.

## 7. Today versus Notification

Today item en notification zijn gescheiden.

Een geplande training kan als Today item blijven bestaan nadat push geopend is. Een push hoeft niet te bestaan voor ieder Today item.

Beide verwijzen naar hetzelfde canonical object.

## 8. Dedupe

Eén onderliggende gebeurtenis mag niet meerdere equivalente pushes veroorzaken.

Voorbeeld teamtraining:
- Calendar event;
- team reminder;
- coach assignment;
- Today composition.

Notification Policy gebruikt canonical object/dedupe key en contextregels om dubbele delivery te voorkomen.

## 9. Reschedule invalidation

Als training/event wordt verplaatst:
- oude geplande reminder wordt geannuleerd/invalide;
- nieuwe timing wordt afgeleid van canonical nieuwe tijd;
- reeds verzonden oude notification kan niet worden gewist, maar deep link moet actuele state tonen;
- geen reminder op oude starttijd.

## 10. User preferences

Gebruiker kan per categorie passende voorkeuren instellen, bijvoorbeeld:
- aan/uit waar veilig;
- reminder timing;
- quiet hours;
- channel later;
- preview privacy;
- team/group granulariteit.

Niet iedere system/security notification is volledig uitschakelbaar.

## 11. Quiet hours

Quiet hours respecteren lokale timezone.

Exceptions alleen expliciet voor categorieën die echt noodzakelijk zijn. Een gemiste social interaction is nooit reden om quiet hours te doorbreken.

Bij timezone change worden toekomstige schedules gereconcileerd.

## 12. Sensitive previews

Push/lockscreen bevat standaard minimale informatie voor gevoelige categorieën.

Geen standaard preview met:
- HRV-waarde;
- cycle/Women's detail;
- nutrition detail;
- medische/beperkingscontext;
- private coach health note.

Na authenticated open kan de app meer tonen volgens authorization.

## 13. Training reminders

Mogelijke triggers:
- planned workout approaching;
- athlete-configured reminder;
- schedule changed;
- in-progress workout left unfinished;
- missed planned workout where policy permits a later action reminder.

Geen shaming-taal bij missed/skipped workout.

## 14. Program reminders

Program itself hoeft niet dagelijks notificaties te genereren. Reminders volgen concrete planned items, milestones of expliciete productregels.

Geen pushspam omdat een programma `actief` is.

## 15. Human Coach notifications

Voorbeelden:
- new assignment;
- assignment changed;
- feedback received;
- consent/access request;
- message.

Bron `Human Coach` blijft expliciet zichtbaar. AI Coach mag niet een push laten lijken alsof een mens hem stuurde.

## 16. AI Coach notifications

Alleen via expliciete productregels. AI mag niet autonoom besluiten `ik ga de gebruiker nu pushen`.

AI kan content formuleren binnen vastgesteld event/policy, maar event eligibility/timing is deterministic.

## 17. Team notifications

Voorbeelden:
- training/match changed;
- availability requested;
- attendance deadline;
- material/task assigned;
- important team announcement.

Teamchat kan granulariteit/muting krijgen. High-volume chat mag planning-reminders niet verdringen.

## 18. Group/social notifications

Opt-in/configureerbaar en laagste functionele prioriteit tenzij direct interaction.

Geen dark-pattern engagement zoals kunstmatige urgency voor likes/challenges.

## 19. Device/sync notifications

Alleen actionable of betekenisvol:
- permission revoked;
- connector auth expired;
- repeated sync failure;
- relevant device unavailable before planned workout where user uses it.

Niet pushen voor elke succesvolle achtergrond-sync.

## 20. Recovery notifications

Recovery is context. Pushformulering mag geen diagnose of absolute instructie geven.

Bijvoorbeeld niet:
`Je HRV is laag, je moet vandaag rusten.`

Wel alleen indien ondersteund door Decision Rules en productpolicy een neutrale uitnodiging om context te bekijken.

## 21. Nutrition reminders

Alleen wanneer gebruiker dit wil of wanneer gekoppeld aan expliciete training/event-planregels.

Geen ongewenste calorie-, gewicht- of eetdruk. Geen shaming voor niet-gelogde voeding.

Niet gelogd != niet gegeten.

## 22. Event/competition reminders

Kunnen omvatten:
- event approaching;
- registration/availability deadline;
- travel/preparation later;
- race-plan reminders;
- start time/location changes.

Canonical event blijft source of truth.

## 23. Account/security

Voorbeelden:
- password/security event;
- new login/device where supported;
- account action needed;
- privacy-critical access change;
- export ready;
- deletion process status.

Securityberichten nooit verstoppen achter marketing consent.

## 24. Commercial

Commercial notifications:
- trial ending;
- billing failed;
- subscription state changed;
- invoice/receipt where relevant;
- voluntary product information.

Geen herstel/safety fear gebruiken als upsell. Commercial source duidelijk herkenbaar.

## 25. Consent changes

Als consent wordt ingetrokken:
- toekomstige notifications die afhankelijk zijn van die data/scope stoppen;
- queued sensitive notifications worden indien mogelijk invalidated;
- deep links hercontroleren authorization bij open.

Een oude push verleent nooit blijvende toegang.

## 26. Entitlements

Notification mag verwijzen naar premium capability, maar entitlement wordt opnieuw server-side gecontroleerd bij open/action.

Push payload is geen authorization token.

## 27. Deep links

Iedere actionable notification verwijst naar canonical productstate waar mogelijk.

Requirements:
- authenticated routing;
- authorization recheck;
- object may be moved/deleted/expired;
- graceful fallback;
- no sensitive identifiers unnecessarily in external URL/payload;
- multi-role/org context validated.

## 28. Opened after state changed

Als push zegt `Training om 18:00` maar training is inmiddels verplaatst naar 19:00, open toont actuele canonical state.

Notification is historische delivery, niet snapshot that overrides current truth.

## 29. Scheduling

Reminder schedule wordt afgeleid van canonical time + user policy.

Bij schedule mutation:
- recalculate;
- cancel obsolete jobs;
- idempotently create replacement;
- preserve audit.

## 30. Timezone/DST

Test:
- timezone travel;
- DST change;
- event timezone vs athlete timezone;
- overnight workout;
- quiet hours across timezone changes.

## 31. Recurring events

Iedere recurrence occurrence krijgt stabiele occurrence identity. Wijziging van één occurrence veroorzaakt niet per ongeluk wijziging/reminder cancellation voor alle occurrences.

## 32. Offline

Lokale reminders kunnen nuttig zijn voor cached planned items, maar:
- stale server auth mag geen gevoelige nieuwe info vrijgeven;
- reschedule conflict kan optreden;
- reconnect reconciliation annuleert obsolete reminders;
- queued acknowledgement/action synct idempotent.

## 33. Delivery retry

Push provider failure:
- bounded retry;
- expiry/relevance window;
- geen late reminder na event;
- idempotency;
- observability.

Een reminder voor training 18:00 wordt niet om 23:00 alsnog verstuurd omdat provider herstelt.

## 34. Rate limiting

Per gebruiker en categorie. Bundling/digest waar passend.

Belangrijke planning/security events blijven afzonderlijk indien nodig. Social/chat kan worden gegroepeerd.

## 35. Notification fatigue

Meet en begrens:
- notifications/day;
- dismiss without open;
- mute rate;
- duplicate suppression;
- category opt-out;
- stale delivery.

Optimalisatie is op relevantie, niet maximale open-rate.

## 36. Language

Notification copy gebruikt locale, maar canonical event types blijven taalneutraal.

Geen AI-vrije vertaling die betekenis van safety/consent verandert zonder gecontroleerde templates/policies.

## 37. AI-generated copy

Als AI later copy personaliseert:
- event/timing/recipient/sensitivity staan vast vóór AI;
- AI krijgt minimale payload;
- no invented metrics/facts;
- no causal claims;
- fallback deterministic template;
- versie/provenance waar relevant.

## 38. Notification Templates

High-impact categorieën gebruiken versioned templates/content rules.

Per template:
- event type;
- allowed variables;
- sensitivity class;
- default channel;
- tone restrictions;
- localization;
- fallback;
- deep-link contract.

## 39. Tone

Trainingskompas notifications zijn:
- feitelijk;
- behulpzaam;
- niet beschamend;
- niet manipulatief;
- niet diagnostisch;
- niet overdreven urgent zonder reden.

## 40. Action semantics

Notification action kan bijvoorbeeld:
- open object;
- start training;
- snooze reminder;
- give availability;
- acknowledge coach/team action.

Destructieve/high-risk acties niet direct vanaf lockscreen zonder passende auth/confirmation.

## 41. Snooze

Snooze alleen voor events waar dat semantisch klopt. Snooze verandert canonical event niet.

Een snoozed reminder voor training verplaatst training dus niet.

## 42. Read/dismiss state

Read/dismiss is notification state, niet task completion.

Push wegvegen mag niet team availability op `completed` zetten.

## 43. Multi-device

User kan meerdere app devices hebben.

Requirements:
- duplicate control;
- tokens lifecycle;
- logout/revoke cleanup;
- security;
- read state sync where product chooses;
- no cross-account token leak.

## 44. Token security

Push tokens zijn sensitive operational identifiers:
- server-side protected;
- rotate/revoke;
- no logs where avoidable;
- bound to authenticated installation/account state;
- cleanup stale tokens.

## 45. Organization/admin broadcasts

Gym/team/org broadcast heeft governance:
- sender role authorized;
- recipient scope correct;
- rate limit;
- audit;
- category distinction operational vs commercial;
- member preference rules;
- no health data broadcast.

## 46. Emergency communication

Trainingskompas is geen gecertificeerd emergency alert system. Org/team communicatie mag niet impliceren dat critical life-safety delivery gegarandeerd is.

## 47. Action Center

Niet alles hoeft push te zijn. Openstaande acties kunnen in-app Action Center/Today verschijnen zonder externe notification.

Voorbeelden:
- consent review;
- incomplete setup;
- nonurgent device reconnect;
- team task;
- coach invite.

## 48. Inbox/history

Optioneel kan later een in-app notification history bestaan. Dit mag geen tweede database van inhoudelijke waarheid worden. Items linken naar canonical state en tonen `niet meer beschikbaar` indien object verdwenen/rechten ingetrokken zijn.

## 49. Data retention

Notification metadata/content retention wordt apart governed. Vermijd langdurige duplicatie van sensitive domain content in notification payload/history.

## 50. Export/delete

Waar notification history persoonsgegevens bevat valt dit onder export/delete/retention policy. Operational audit kan onder expliciete uitzonderingen vallen.

## 51. Observability

Meet:
- event generated;
- eligibility result;
- suppressed reason;
- scheduled/delivered/failed;
- latency;
- dedupe;
- stale delivery;
- invalid deep link;
- auth denied on open;
- retries.

Geen raw sensitive payloads in logs.

## 52. Cross-domain event bus contract

Domeinen publiceren canonical change/events; Notification Engine leest die events.

Voorbeelden:
- planned_item.rescheduled;
- coach_assignment.created;
- team_event.changed;
- device_connector.auth_expired;
- subscription.payment_failed;
- consent.revoked.

Notification Engine schrijft geen business truth terug behalve eigen delivery/read state of expliciete user action routed naar domeincommand.

## 53. Functional >=9 closure criteria

Notifications & Reminders is pas >=9 wanneer minimaal bewezen is:
- canonical event versus delivery instance gescheiden is;
- category/priority/sensitivity model bestaat;
- Today en Notification niet worden verward;
- dedupe cross-domain werkt;
- reschedule obsolete reminders annuleert;
- user preferences/quiet hours correct werken;
- security notifications onafhankelijk van marketing consent zijn;
- sensitive previews veilig zijn;
- human coach/AI source onderscheiden blijft;
- recovery/nutrition copy safety rules volgt;
- deep links auth opnieuw controleren;
- stale/changed objects graceful openen;
- timezone/DST/recurrence getest zijn;
- offline/reconnect obsolete local reminders reconciliëren;
- retry geen late irrelevante push veroorzaakt;
- rate limiting/bundling werkt;
- multi-device token lifecycle veilig is;
- org broadcasts authorization/audit hebben;
- notification read != task completion;
- snooze != reschedule;
- consent revoke queued sensitive delivery stopt waar mogelijk;
- entitlement niet als authorization token wordt gebruikt;
- observability geen sensitive leakage bevat;
- adversarial cross-user/deep-link tests groen zijn;
- accessibility/localization later getest zijn.

## 54. UX governance

Later ontwerpen we apart:
- notification settings;
- quiet hours;
- privacy preview choices;
- Action Center/inbox if chosen;
- notification deep-link destinations.

Eerst functionele architectuur, daarna mock-up per scherm en Product Owner akkoord vóór build.

## 55. Harde architectuurregels

`NOTIFICATION IS DELIVERY — CANONICAL STATE IS TRUTH.`

`DISMISS != COMPLETE.`

`SNOOZE != RESCHEDULE.`

`AI MAY WORD A MESSAGE — AI DOES NOT DECIDE DELIVERY POLICY.`

`SENSITIVE DATA IS MINIMIZED OUTSIDE THE AUTHENTICATED APP.`