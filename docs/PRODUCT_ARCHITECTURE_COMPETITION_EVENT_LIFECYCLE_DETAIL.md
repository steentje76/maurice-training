# Trainingskompas Target Product Architecture — Competition & Event Lifecycle

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor wedstrijden, races, events, tests en andere doelmomenten van ontdekking/aanmaak tot voorbereiding, uitvoering, resultaat en evaluatie. Geen definitief schermontwerp en geen claim dat alle targetfunctionaliteit al bestaat.

## 1. Productdoel

Een wedstrijd/event is in Trainingskompas niet alleen een kalenderregel. Het kan een doelanker zijn dat Planning, Programma's, Today, Nutrition, Team, Coach, Devices, History, Calculation en Insight met elkaar verbindt.

Kernketen:

```text
Event Definition
      ↓
Athlete Participation / Goal
      ↓
Preparation Context
      ↓
Program + Planning
      ↓
Pre-event Readiness / Logistics
      ↓
Event Execution
      ↓
Canonical Result
      ↓
Calculation / PR / Comparison
      ↓
Post-event Review
      ↓
Future Context / Goals
```

## 2. Harde begrippen

`EVENT != PARTICIPATION != PLANNED ITEM != EXECUTION != RESULT`.

- Event Definition = het externe/interne evenement zelf.
- Participation = relatie van athlete/team tot event.
- Planned Item = kalenderrepresentatie van deelname/onderdeel.
- Execution = wat athlete werkelijk uitvoert.
- Result = gevalideerde/gelogde uitkomst.

Een marathon bestaat dus één keer als event, maar duizenden athletes kunnen eigen participations/results hebben.

## 3. Event types

Target model ondersteunt minimaal:
- race/competition;
- recreational event;
- personal test/time trial;
- qualification event;
- team match/game;
- tournament;
- HYROX/hybrid event;
- rowing/erg competition;
- cycling event;
- running event;
- multisport/triathlon;
- strength competition later;
- club/gym event;
- recurring league/series later.

Niet ieder type gebruikt dezelfde metrics.

## 4. Canonical Event Definition

Minimaal conceptueel:
- event_id;
- name;
- event_type;
- sport/capabilities;
- organizer/source;
- start date/time;
- end date/time where relevant;
- event timezone;
- location;
- route/course reference where available;
- distance/format/categories;
- official external identifier/source where available;
- registration URL/reference where allowed;
- status;
- source/provenance;
- last_verified_at;
- version.

## 5. Event source/provenance

Event kan komen van:
- USER_CREATED;
- TRAININGSKOMPAS_CURATED;
- ORGANIZER_IMPORT;
- TEAM/CLUB;
- COACH;
- EXTERNAL_CALENDAR;
- EXTERNAL_EVENT_PROVIDER later.

External data is not automatically truth forever. Freshness/versioning matters.

## 6. Event identity and dedupe

Zelfde event kan via user, coach, calendar en external provider binnenkomen.

Dedupe gebruikt waar beschikbaar:
- official identifier;
- organizer;
- name;
- date/time;
- location;
- course/distance/category.

Bij onzekerheid niet automatisch mergen. Candidate duplicate kan user/admin confirmation vereisen.

## 7. Participation

Canonical athlete participation bevat minimaal:
- participation_id;
- athlete_id;
- event_id;
- category/distance/discipline;
- status;
- goal type/value where applicable;
- priority;
- registration state;
- start wave/time where known;
- bib/start number optional;
- source;
- created/updated timestamps.

## 8. Participation states

Bijvoorbeeld:
- INTERESTED;
- PLANNED;
- REGISTERED;
- WAITLISTED;
- CONFIRMED;
- CANCELED;
- DID_NOT_START;
- STARTED;
- FINISHED;
- DID_NOT_FINISH;
- RESULT_PENDING;
- RESULT_CONFIRMED.

Niet ieder event gebruikt alle states.

## 9. Event priority

Athlete kan event markeren als bijvoorbeeld:
- A / primary target;
- B / secondary;
- C / training/preparation;
- neutral/unclassified.

Exacte labels kunnen later UX-keuze zijn. Functioneel moet importance bestaan zodat Planning/Program Context niet iedere lokale 5 km als hoofddoel behandelt.

AI mag priority voorstellen op basis van gesprek, maar user/coach bevestigt.

## 10. Goal model

Event goal kan zijn:
- finish;
- time;
- pace/speed/power;
- placing/rank;
- qualification;
- completion of discipline;
- process goal;
- team result;
- no explicit performance goal.

Doelwaarden hebben units/provenance en zijn geen gegarandeerde voorspelling.

## 11. Event-first onboarding

Als athlete tijdens onboarding een concreet event noemt, kan dit canonical event/participation object worden gebruikt als planninganker.

AI mag helpen event te herkennen, maar exacte identity/date wordt bevestigd of external verified.

## 12. Program anchor

Program kan refereren aan participation/event.

Program planning gebruikt:
- event date;
- sport/format;
- athlete goal;
- phase;
- availability;
- registered Decision Rules.

Event date change triggert replanning/conflictflow; geen stille totale programmaherschrijving.

## 13. Multiple events

Athlete kan meerdere events hebben. Planning moet conflicts/priority kunnen beoordelen.

Voorbeeld:
- halve marathon A-race;
- lokale 10 km B-race;
- teamwedstrijd dezelfde week.

Geen `single target event` architectuur.

## 14. Event series / season

Later kan een season/series meerdere events groeperen. Team competition season en race series zijn parent contexts, geen vervanging voor individuele event instances.

## 15. Team events

Team match/training/event gebruikt dezelfde event/planningfundamenten plus:
- team participation;
- athlete availability;
- selection/roster where applicable;
- attendance;
- assembly time;
- location;
- tasks/materials;
- announcements;
- team conversation/context cohort.

Team event geeft geen toegang tot individuele health/recovery data.

## 16. Activity cohort

Een event kan een tijdelijke activity-bound cohort hebben voor deelnemers/chat/logistiek.

Event cohort != permanent Group != Team.

Na event kan cohort read-only/archive volgens policy.

## 17. Registration

Trainingskompas kan registration state vastleggen en eventueel naar externe organizer verwijzen.

Tenzij expliciete organizer integration bestaat, claimt TK niet dat registratie definitief bij organizer voltooid is.

External registration transaction blijft source-specific.

## 18. Calendar integration

Event/participation wordt naar centrale Planning vertaald.

Calendar export/sync bewaart canonical event reference. Externe agenda is geen tweede event database.

Wijziging extern vraagt conflict/source policy.

## 19. Timezone

Event heeft eigen timezone. Athlete kan reizen.

Bewaar:
- canonical event local time;
- event timezone;
- athlete display timezone;
- travel context where explicitly used.

Geen omzetting die starttijd bij DST/travel fout maakt.

## 20. Location/course

Waar relevant:
- start/finish location;
- course route;
- elevation/profile;
- laps;
- surface/terrain;
- indoor/outdoor;
- organizer-provided course version.

Route/course is versioned; organisator kan parcours wijzigen.

## 21. Weather

Pre-event weather kan context zijn met source/freshness/confidence.

Decision influence alleen via registered rules. AI mag niet op basis van losse forecast nieuwe pacing/fuelingregels verzinnen.

## 22. Logistics

Participation kan optionele praktische data bevatten:
- travel;
- accommodation reference;
- assembly/check-in;
- equipment checklist;
- bib pickup;
- team task;
- start wave;
- reminders.

Geen noodzaak om alle travel data als athlete health context te behandelen.

## 23. Equipment checklist

Sport/event-specific checklist kan productcontent zijn. User kan items afvinken/toevoegen.

Voorbeelden:
- shoes;
- race number;
- HR strap;
- bike equipment;
- nutrition/fueling;
- Concept2/event-specific items.

Checklist completion verandert geen readiness score tenzij expliciete rule bestaat.

## 24. Nutrition/fueling plan

Endurance/hybrid event kan gekoppeld worden aan canonical Event Nutrition Plan.

Plan en actual blijven gescheiden:
- planned intake/timing;
- actual logged intake;
- source;
- evidence/rule refs;
- user/coach ownership.

AI mag geen fueling targets verzinnen buiten approved calculation/decision/evidence logic.

## 25. Pre-event Today orchestration

Today kan contextueel tonen:
- event countdown;
- training/taper item;
- travel/check-in;
- equipment task;
- fueling reminder;
- coach/team message;
- device readiness;
- weather update.

Prioriteit volgt Today rules, niet event marketing.

## 26. Taper

Taper is program/Decision functionality, niet automatisch `event over 7 days = minder trainen`.

Event levert context; registered sport/program rules bepalen aanpassing.

## 27. Readiness

Pre-event recovery/readiness is ondersteunende context. Lage HRV alleen mag geen event cancellation recommendation veroorzaken.

AI mag onzekerheid uitleggen maar niet medische clearance geven.

## 28. Event execution

Event start gebruikt waar passend dezelfde centrale execution/logging architecture als training, met `event participation` als source/context.

Zo blijven sport metrics, devices, offline/retry en provenance gedeeld.

## 29. Competition mode

Event execution kan een sport-specifieke competition mode hebben, bijvoorbeeld:
- minder afleiding;
- grote live metrics;
- lap/segment focus;
- offline resilience;
- device reconnect;
- accidental-touch protection.

Dit is later UX; onderliggende execution engine blijft canonical.

## 30. Device connection

Pre-event kan relevante devices checken:
- wearable;
- HR sensor;
- power meter;
- Concept2 PM5;
- other sport-specific device.

Connection failure blokkeert event logging niet als manual/no-device fallback mogelijk is.

## 31. Live tracking

Live tracking/sharing is niet automatisch onderdeel van baseline event model. Indien later toegevoegd vereist aparte privacy/location/battery/safety architecture.

Geen stille realtime location sharing.

## 32. Offline resilience

Competition execution moet waar mogelijk zonder stabiel internet kunnen doorgaan:
- local execution state;
- local timestamps;
- sensor capture;
- queued sync;
- idempotent upload;
- reconnect/retry;
- no duplicate result.

## 33. Result model

Canonical result bevat sport-specific metrics plus:
- participation_id;
- execution_id where available;
- status finish/DNF/DNS etc.;
- official versus self-recorded source;
- official time/result where available;
- measured device result;
- manual corrections;
- rank/category result where available;
- provenance;
- confidence/verification status.

## 34. Official versus measured result

Official result en wearable/device result kunnen verschillen.

Beide kunnen worden bewaard:
- OFFICIAL_RESULT;
- DEVICE_MEASURED;
- USER_RECORDED;
- CALCULATED.

Voor race ranking/official finish is organizer source leidend waar verified; voor physiological/activity analysis kan device stream relevant zijn.

Geen destructieve keuze tussen beide.

## 35. Result verification

Statuses bijvoorbeeld:
- SELF_REPORTED;
- DEVICE_SUPPORTED;
- EXTERNAL_MATCHED;
- OFFICIAL_VERIFIED;
- CONFLICTED.

Conflict wordt zichtbaar/resolveable, niet stil overschreven.

## 36. PR integration

Event result voedt sport-specific PR engine.

PR type blijft measured/calculated/estimated/official onderscheiden.

Official 10 km result kan bijvoorbeeld een race PR zijn terwijl GPS 10.08 km registreerde. Beide contexts blijven herleidbaar.

## 37. Course-specific comparison

Waar course identity betrouwbaar is, kan dezelfde route/course over jaren worden vergeleken.

Course version/elevation/conditions moeten worden meegenomen voordat `same course` wordt geclaimd.

## 38. Post-event review

Na event kan TK structured review verzamelen:
- perceived effort;
- subjective experience;
- goal achieved/not;
- pacing/strategy notes;
- nutrition actual;
- equipment issues;
- conditions;
- recovery follow-up;
- coach feedback.

Subjective data blijft user-reported provenance.

## 39. Goal evaluation

Goal result wordt deterministic geëvalueerd waar mogelijk.

Voorbeeld time goal:
- goal 1:45:00;
- official result 1:43:20;
- achieved = deterministic comparison.

AI kan uitleggen maar berekent/claimt dit niet zelfstandig.

## 40. Post-event recovery

Event completion kan recovery/context triggeren via dezelfde Calculation/Decision architecture als andere activities. Geen speciale AI `race recovery score` zonder registered calculation.

## 41. Program completion/transition

Primary target event kan program phase beëindigen of transition state activeren volgens program rules.

Geen automatische nieuwe program cycle zonder user/coach confirmation/policy.

## 42. Historical event record

Event history bewaart:
- event/version;
- participation;
- goals;
- result;
- official/device provenance;
- program relation;
- relevant post-event review.

Latere wijziging van public event metadata mag historisch resultaat niet betekenisloos maken.

## 43. Comparison

Athlete kan later vergelijken:
- zelfde distance;
- zelfde event/course;
- year-over-year;
- goal versus result;
- pacing/splits;
- training block before events;
- recovery/load context waar evidence/quality voldoende is.

Correlation is geen causaliteit.

## 44. Coach

Human coach kan met authorization:
- event toevoegen/voorstellen;
- goal bespreken;
- program eraan koppelen;
- assignments geven;
- post-event feedback geven.

Athlete blijft eigenaar van persoonlijke result/health data volgens governance.

## 45. AI Coach

AI mag:
- eventcontext samenvatten;
- logistieke/planinformatie uitleggen;
- registered Decision outputs toelichten;
- post-event structured reflection begeleiden.

AI mag niet:
- resultaat verzinnen;
- officiële ranking claimen zonder bron;
- medische race clearance geven;
- taper/pacing/fuelingregels uitvinden;
- causaal verklaren waarom resultaat goed/slecht was zonder evidence.

## 46. Team result

Team event kan zowel teamresultaat als individuele athlete execution/result hebben. Deze zijn verschillende canonical objects.

Teamresultaat mag individuele health data niet bevatten.

## 47. Privacy

Event visibility kan verschillen van participation/result visibility.

Een openbaar evenement betekent niet dat athlete deelname/result/route automatisch publiek is.

Location privacy zones en social sharing volgen aparte privacy settings.

## 48. Social sharing

Athlete kan bewust canonical event/result reference delen. Share rendering recheckt privacy bij openen/tonen.

Sensitive recovery/nutrition context wordt niet automatisch meegedeeld met race result.

## 49. Public result imports

Als later publieke official results worden geïmporteerd, vereist identity matching voorzichtigheid. Naamovereenkomst alleen is onvoldoende voor automatische koppeling aan athlete account.

User confirmation/external identifier kan nodig zijn.

## 50. Event discovery

Later Search & Discovery kan events vinden op:
- sport;
- date;
- location;
- distance/format;
- organizer;
- difficulty/terrain where sourced;
- team/club context.

Discovery source quality/freshness moet zichtbaar/governed zijn.

## 51. User-created event

Athlete kan event handmatig aanmaken als external catalog ontbreekt. Later external match mag het user goal/result niet verliezen.

## 52. Event cancellation/postponement

Canonical event status kan zijn:
- SCHEDULED;
- POSTPONED;
- CANCELED;
- COMPLETED.

Bij postponement:
- nieuwe datum/version;
- participation blijft traceerbaar;
- Planning/Program krijgt conflict/replanning action;
- reminders worden geherberekend;
- user/coach confirmation waar plan breed verandert.

## 53. Organizer changes

Course/starttime/wave changes hebben source/freshness. Critical changes kunnen notification/action item genereren, maar alleen als bron betrouwbaar en verschil bevestigd is.

## 54. Event deletion

External event mag niet hard verwijderd worden als historische participation/results bestaan. Gebruik archive/tombstone/versioning.

User kan eigen participation verwijderen volgens privacy/history policy zonder shared event definition voor anderen te verwijderen.

## 55. Data quality

Per event/result field waar relevant:
- source;
- timestamp;
- confidence/verification;
- missingness;
- version.

UNKNOWN distance != 0 km. Unknown rank != last place.

## 56. Integration contract

Event lifecycle publiceert canonical changes zodat andere domains reageren:
- event created -> Planning;
- participation registered -> Today/Notifications;
- date changed -> Planning/Program/Notifications;
- event tomorrow -> Today/Preparation;
- event started -> Execution;
- event completed -> History/Calculation/PR/Insight;
- result verified -> comparison/PR update;
- participation canceled -> planning/reminders cleanup.

Geen losse screen-specific side effects.

## 57. Notifications

Event notifications refereren canonical event/participation state. Verplaatsing/cancellation invalideert oude reminders.

Snooze reminder != event reschedule.

## 58. Search/indexing

Event indexing mag public event metadata gebruiken, maar private participation/goals/results alleen binnen authorized user scope.

## 59. Entitlements

Basis eigen eventplanning/history mag niet afhankelijk worden gemaakt van het prijsmodel zonder expliciete PO-beslissing. Advanced race analytics/content kunnen later entitlement-capabilities zijn.

Entitlement geeft geen toegang tot andere athlete results/private events.

## 60. Research

Event results kunnen wetenschappelijk relevant zijn, maar research use vereist afzonderlijke consent/governance. Normale productparticipation is geen research consent.

## 61. Observability

Monitor bijvoorbeeld:
- event import failures;
- duplicate candidates;
- stale external metadata;
- date-change propagation;
- reminder invalidation;
- execution/result link failures;
- official result matching conflicts;
- offline sync errors.

Geen sensitive athlete payloads in telemetry.

## 62. Functioneel >=9 closure criteria

Competition & Event Lifecycle is pas >=9 wanneer minimaal bewezen is:
- Event/Participation/Planned Item/Execution/Result gescheiden zijn;
- multiple event types/sports werken;
- event source/provenance/versioning bestaat;
- dedupe/conflict safe is;
- multiple athlete events/priorities werken;
- event als program anchor werkt;
- team events/availability correct integreren;
- timezone/travel/DST correct zijn;
- postponement/cancellation Planning/Program/Notifications correct bijwerkt;
- event nutrition/logistics canonical gekoppeld kunnen worden;
- Today pre-event orchestration werkt;
- execution dezelfde central logging chain gebruikt;
- offline event execution/retry idempotent is;
- official/device/manual result naast elkaar kunnen bestaan;
- result verification/conflict zichtbaar is;
- PR engine correct onderscheid maakt;
- post-event review user-reported provenance bewaart;
- privacy/social sharing event participation niet automatisch openbaar maakt;
- public result matching geen identity leak veroorzaakt;
- coach scopes/RLS veilig zijn;
- AI geen shadow pacing/taper/fueling/medical logic creëert;
- delete/archive history-safe is;
- event changes cross-domain deterministic propagateren;
- adversarial privacy/integration tests groen zijn.

## 63. UX governance

Later pas scherm-/flowontwerp voor:
- Events overview;
- Event zoeken/toevoegen;
- Event detail;
- Participation/goal;
- Preparation/logistics;
- Competition mode;
- Result;
- Post-event review;
- Comparison.

Eerst concrete mock-up/voorbeeld -> Product Owner review -> aanpassen -> expliciet akkoord -> bouwen.

## 64. Harde architectuurregels

`AN EVENT IS A CANONICAL PRODUCT OBJECT, NOT JUST A CALENDAR ROW.`

`PUBLIC EVENT != PUBLIC ATHLETE PARTICIPATION.`

`OFFICIAL RESULT != DEVICE RESULT — BOTH MAY MATTER.`

`EVENT CONTEXT MAY INFORM DECISIONS; AI DOES NOT INVENT COMPETITION LOGIC.`

`EVENT CHANGES MUST PROPAGATE THROUGH PLANNING, PROGRAMS, TODAY AND NOTIFICATIONS.`