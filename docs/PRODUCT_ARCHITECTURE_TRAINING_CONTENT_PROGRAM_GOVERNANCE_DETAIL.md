# Trainingskompas Target Product Architecture — Training Content, Workouts & Programs

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor oefeningen, sport-specifieke trainingselementen, workouts, templates, programma's, planning, versiebeheer, assignments, uitvoering en feedback. Geen definitief schermontwerp en geen claim dat alle targetfunctionaliteit al bestaat.

## 1. Productdoel

Trainingskompas heeft één samenhangend trainingscontentmodel nodig dat kracht, endurance, ergometer, hybrid, multisport en later teamsport ondersteunt zonder voor iedere sport een los systeem te bouwen.

Kernketen:

```text
Sport Capability
      ↓
Exercise / Training Element Library
      ↓
Workout Definition / Template
      ↓
Program Definition + Phases
      ↓
Planning / Assignment
      ↓
Execution
      ↓
Logged Result
      ↓
Calculation
      ↓
Context + Decision
      ↓
Progress / Recovery / Program Adaptation
```

## 2. Harde begrippen

`EXERCISE != WORKOUT != PROGRAM != PLANNED ITEM != EXECUTION`.

- Exercise/Training Element = herbruikbare bouwsteen.
- Workout = één trainingssessie-definitie.
- Program = geordende reeks/structuur van workouts met doel, periode en progressielogica.
- Planned Item = concrete plaatsing/toewijzing op kalender/context.
- Execution = daadwerkelijke uitvoering.
- Logged Result = immutable/historisch resultaat van wat werkelijk is uitgevoerd, behoudens expliciete correctieversies.

Deze objecten mogen niet door elkaar worden gebruikt.

## 3. Workout Builder

De Workout Builder is geen zelfstandige productbestemming. Hij is de editor achter `Training maken`.

Een gemaakte workout kan:
- direct worden gestart;
- worden opgeslagen als `Mijn training`;
- in planning worden geplaatst;
- onderdeel van een programma worden;
- door bevoegde coach/org als template worden beheerd;
- later opnieuw worden uitgevoerd.

Iedere uitvoering gaat door dezelfde centrale Preview -> Execution -> Logging keten.

## 4. Sport Capability Model

Ondersteuning wordt capability-based ontworpen, niet met één gigantische sport-enum met losse if-statements.

Sport families:
- STRENGTH;
- ENDURANCE;
- ERGOMETER;
- HYBRID;
- MULTISPORT;
- TEAM;
- RACKET later;
- WINTER later;
- overige extensies.

Een sport capability beschrijft bijvoorbeeld:
- toegestane training element types;
- relevante metrics;
- execution modes;
- sensor/device capabilities;
- interval structure;
- route relevance;
- PR types;
- Calculation Registry links;
- Decision Rules;
- required/optional inputs.

## 5. Exercise / Training Element Library

Kracht gebruikt klassieke exercises, maar de library moet breder zijn.

Canonical training element kan typen bevatten zoals:
- strength exercise;
- running segment;
- cycling segment;
- rowing/ski/bike erg segment;
- timed effort;
- distance effort;
- interval block;
- recovery block;
- warm-up/cool-down;
- mobility/preparation element;
- HYROX station;
- team drill later;
- multisport transition.

Niet elk element gebruikt sets/reps/weight.

## 6. Strength Exercise model

Minimaal:
- canonical exercise_id;
- name + aliases/localization;
- movement pattern;
- primary/secondary muscles waar evidence/model dit ondersteunt;
- equipment requirements;
- unilateral/bilateral;
- load modes;
- rep/time/distance support;
- bodyweight/external load semantics;
- compatible metrics;
- instructions/content provenance;
- status/version.

Media/instructions zijn content, niet de calculation source.

## 7. Exercise Intelligence

Exercise metadata mag gebruikt worden voor:
- search/filter;
- equipment matching;
- muscle/movement summaries;
- substitutions;
- workout building;
- training analysis.

Substitution is niet alleen `zelfde spier`. Een geldige substitution kan rekening houden met:
- movement pattern;
- equipment;
- training intent;
- unilateral/bilateral;
- skill/complexity;
- program role;
- user restriction;
- metric compatibility.

AI mag geen vrije substitutionregel verzinnen. Toegestane substitution logic hoort versioned in product/Decision content.

## 8. Endurance Training Elements

Running/cycling/ergometer ondersteunen generieke segmenten:
- warm-up;
- steady;
- distance target;
- duration target;
- pace/speed/power target;
- HR/intensity zone target;
- work interval;
- recovery interval;
- repeat group;
- cool-down;
- free/open segment.

Targets bewaren type, range/target, unit, source en confidence/evidence waar van toepassing.

## 9. Ergometer

RowErg, SkiErg en BikeErg gebruiken gedeelde ergometer capabilities met machine-specific semantics.

Metric basis wordt expliciet opgeslagen; bijvoorbeeld pace basis 500m versus 1000m. Geen impliciete conversies in UI/AI.

Realtime PM5/device data en handmatige uitvoering moeten naar dezelfde canonical execution metrics kunnen mappen met provenance.

## 10. Hybrid / HYROX

Hybrid workout kan verschillende element families combineren, bijvoorbeeld:
- run segment;
- sled/station;
- ergometer;
- strength/carry;
- recovery/transition.

Execution bewaart block identity zodat metrics exact aan het juiste onderdeel gekoppeld blijven.

## 11. Multisport

Multisport workout/event kan disciplines en transitions bevatten.

Voorbeeld brick:
- cycling block;
- transition;
- running block.

Planning, execution en result blijven één coherente composite activity/workout met child blocks waar passend, zonder discipline-data te verliezen.

## 12. Team training content

Teamsport gebruikt dezelfde contentprincipes maar kan later elementen toevoegen zoals:
- drill;
- tactical block;
- conditioning block;
- warm-up;
- small-sided game;
- test;
- cooldown.

Teamplanning/attendance blijft apart van inhoud van training.

## 13. Workout Definition

Canonical workout definition bevat minimaal:
- workout_id;
- owner/source;
- title;
- sport/capabilities;
- goal/intention;
- ordered blocks/elements;
- target prescription;
- estimated/expected duration waar deterministic beschikbaar;
- equipment requirements;
- tags;
- version;
- status;
- provenance;
- visibility/ownership;
- created/updated timestamps.

## 14. Prescription versus Result

Prescription en execution result zijn gescheiden.

Voor strength:
- prescribed sets/reps/load/RPE/RIR etc.;
- actual sets/reps/load/RPE/RIR etc.

Voor endurance:
- prescribed duration/distance/zone/pace etc.;
- actual measured/manual result.

Planned values worden nooit achteraf overschreven door actuals.

## 15. Workout versioning

Een opgeslagen/published workout krijgt versioning.

Als template later verandert:
- toekomstige assignments kunnen nieuwe versie gebruiken;
- reeds uitgevoerde sessies blijven verwijzen naar de versie die toen gold;
- geplande items volgen expliciete update policy;
- geen historische mutation.

## 16. Ownership/source types

Workout/program kan afkomstig zijn van:
- ATHLETE;
- TRAININGSKOMPAS_OFFICIAL;
- HUMAN_COACH;
- TEAM;
- ORGANIZATION/GYM;
- IMPORTED source later.

Ownership bepaalt editrechten, niet automatisch data access tot athlete results.

## 17. Mijn trainingen

`Mijn trainingen` is de persoonlijke herbruikbare workoutbibliotheek van athlete.

Gebruiker kan:
- eigen workout opslaan;
- dupliceren;
- aanpassen;
- archiveren/verwijderen volgens history rules;
- plannen;
- starten.

Een eerdere execution is geen workout template tenzij expliciet als nieuwe/herbruikbare workout opgeslagen.

## 18. Program Definition

Program is meer dan lijst workouts.

Minimaal:
- program_id;
- owner/source;
- sport/context;
- target goal/event;
- target population/applicability;
- duration or flexible horizon;
- phases;
- schedule pattern;
- workout template refs/versions;
- progression/adaptation rules refs;
- minimum inputs;
- equipment requirements;
- evidence/provenance;
- version/status;
- limitations;
- entitlement/visibility.

## 19. Program phases

Target phases kunnen zijn:
- Foundation/Base;
- Build;
- Specific;
- Peak;
- Taper;
- Recovery/Transition;
- custom domain-specific phase.

Niet ieder programma hoeft alle fases te gebruiken. Phase semantics worden sport-specifiek governed.

## 20. Program scheduling

Program wordt via centrale Planning Engine naar concrete planned items vertaald.

Scheduler houdt rekening met:
- program structure;
- athlete availability;
- event date;
- rest/recovery constraints volgens Decision Rules;
- andere actieve programs;
- team events;
- timezone;
- user locks/manual edits.

Auto-schedule produceert preview. Gebruiker bevestigt voordat brede planning wordt gewijzigd, tenzij expliciet gekozen auto-policy later bestaat.

## 21. Meerdere programma's

Athlete kan meerdere programma's/contexten hebben.

Voorbeeld:
- strength program;
- half-marathon program;
- teamtraining schedule.

Er is geen aanname `one active program per user`.

Conflict detection signaleert overlap/constraints. Decision Engine bepaalt alleen wat expliciet in rules staat; AI verzint geen compromis.

## 22. Program assignment

Program kan worden assigned door:
- athlete zelf;
- human coach met rechten;
- team coach voor teamcontext;
- gym/org via toegestane productcapability.

Assignment bevat:
- assigner;
- recipient;
- program version;
- start/context;
- permissions;
- accepted/active/ended state;
- provenance/audit.

## 23. Coach editrechten

Coach kan alleen wijzigen binnen actieve relationship/scopes.

Duidelijk onderscheid:
- coach-owned program/template;
- athlete copy;
- assigned instance;
- athlete manual change;
- coach update.

Geen stille overschrijving van athlete edits zonder policy/conflict handling.

## 24. Official Trainingskompas Programs

Official content is versioned curated productcontent.

Per program:
- authoring/review status;
- sport/domain;
- evidence basis;
- intended population;
- minimum data;
- limitations;
- Calculation/Decision dependencies;
- last review date;
- version/changelog.

`Official` is geen synoniem voor wetenschappelijk bewezen. Claims volgen Evidence Registry.

## 25. Community programs

Niet baseline. Als later user/community publishing wordt toegestaan, is moderation/content quality/licensing/safety een aparte capability. Eigen persoonlijke templates worden niet automatisch publiek.

## 26. Progression

Progression wordt niet door vrije AI-tekst bepaald.

Mogelijke progression mechanisms:
- fixed prescription;
- percentage-based;
- RPE/RIR-based binnen registered rules;
- performance-triggered;
- exercise-specific stagnation response;
- volume/intensity progression;
- sport-specific pace/power/zone progression;
- phase transition.

Iedere mechanism linkt naar Calculation/Decision Registry en evidence/limitations.

## 27. Adaptation

Niveaus:
1. MANUAL — athlete/coach past aan;
2. RULE-BASED — expliciete Decision Rules;
3. ADAPTIVE PROGRAM — combinatie van registered rules/context;
4. AI EXPLANATION — legt gekozen aanpassing uit.

AI is nooit niveau 3 op eigen initiatief.

## 28. Missed workout

Bij gemiste workout:
- status MISSED/SKIPPED;
- programma/history blijft intact;
- mogelijke actions: laten staan, verplaatsen, overslaan, reschedule suggestion;
- automatische verschuiving alleen via expliciete policy/rule en user-config.

Geen domino-reschedule zonder controle.

## 29. Recovery influence

Recovery kan programma/planning beïnvloeden via Decision Rules.

HRV alleen mag geen automatische rustdag bepalen. Recovery signalen worden gecombineerd volgens registered logic en confidence.

## 30. Competition/event influence

Event kan program anchor zijn.

Program gebruikt canonical event date/type/sport. Wijziging event date triggert conflict/replanning workflow; niet stil hele programma herschrijven.

## 31. Execution contract

Alle normale workout starts convergeren naar één centrale execution/logging architecture.

Startbronnen:
- Today;
- Planning;
- Program;
- Mijn trainingen;
- Vrij trainen;
- Human Coach assignment;
- Team event;
- contextual device flow.

Bron bepaalt context/provenance, niet een compleet andere logging engine.

## 32. Preview

Voor execution kan Training Preview functioneel tonen:
- workout/version;
- doel/intentie;
- blocks;
- targets;
- equipment;
- estimated duration waar betrouwbaar;
- contextual device options;
- relevant Decision/context modification;
- source/coach/program.

Preview is geen verplicht apart visueel scherm in deze architectuur; het is een functionele pre-execution state.

## 33. Execution state

Minimaal:
- NOT_STARTED;
- IN_PROGRESS;
- PAUSED waar sport ondersteunt;
- COMPLETED;
- ABORTED;
- PENDING_SYNC;
- SYNCED;
- CORRECTED later via result versioning.

Crash/reload/offline mag in-progress state niet onnodig verliezen.

## 34. Block identity

Iedere workout block/element instance krijgt stabiele identity zodat:
- live device metrics;
- manual logging;
- interval result;
- comments/feedback;
- planned-vs-actual;
exact aan juiste block gekoppeld zijn.

Essentieel voor hybrid/multisport/Concept2.

## 35. Strength logging

Functioneel ondersteunen waar relevant:
- sets;
- reps;
- load;
- RPE/RIR;
- rest;
- set type;
- unilateral semantics;
- bodyweight/external load;
- notes;
- completion/edit;
- optional device-derived data later.

Units canonical normalized, display volgens user settings.

## 36. Endurance logging

Ondersteun:
- elapsed/moving time;
- distance;
- pace/speed;
- HR;
- power;
- cadence;
- elevation;
- route/GPS;
- laps/splits/segments;
- intervals;
- device/source provenance;
- weather/context where available.

Missing sensor != zero.

## 37. Manual versus measured

Iedere metric behoudt provenance:
- MANUAL;
- DEVICE_REALTIME;
- CLOUD_IMPORT;
- CALCULATED;
- CORRECTED_MANUAL;
- other registered source.

Manual correction krijgt precedence policy zonder originele provenance te vernietigen.

## 38. Dedupe

Zelfde workout kan via realtime device en later cloud import binnenkomen. Dedupe gebruikt identity/timestamps/device/source/sport-specific evidence.

Geen dubbele activiteit in history omdat PM5 realtime én cloud later hetzelfde resultaat leveren.

## 39. Completion

Completion produceert canonical execution/result en triggert daarna pas:
- calculations;
- PR detection;
- load/recovery updates;
- program progress;
- Today update;
- Insights;
- eligible coach/social references.

AI genereert niet de resultwaarden.

## 40. Planned versus actual

Bewaar expliciet:
- wat was voorgeschreven;
- wat is uitgevoerd;
- deviations;
- reason/user note waar ingevoerd;
- source.

Dit maakt betrouwbare adherence/progression analyse mogelijk zonder afwijking automatisch als slecht te classificeren.

## 41. Exercise substitutions tijdens execution

Gebruiker kan waar toegestaan exercise vervangen.

Result bewaart:
- originally prescribed exercise;
- actual exercise;
- substitution reason optional;
- rule/source;
- metric compatibility.

Program history wordt niet achteraf herschreven alsof vervanging oorspronkelijk gepland was.

## 42. PR engine

PR's zijn sport-/metric-specifiek en deterministic.

Typen kunnen zijn:
- measured;
- calculated;
- estimated.

UI/AI moet onderscheid behouden. e1RM is bijvoorbeeld geen gemeten 1RM.

## 43. History

History bewaart executions/results, niet actuele templateweergave.

Filters kunnen later sport/program/event/source/period bevatten. Edit/correct/delete volgt provenance/audit rules.

`History = wat gebeurde er.`

## 44. Insight

Insight analyseert canonical results via Calculation/Context/Evidence.

`Insight = wat betekent de ontwikkeling.`

Het verandert geen historische data.

## 45. Coach

Coach gebruikt dezelfde results en Decision outputs.

`Coach = wat kan ik hiermee doen.`

AI Coach mag result niet herberekenen of een shadow program aanpassen.

## 46. Search/discovery

Training content search ondersteunt contextafhankelijk:
- naam/alias;
- sport;
- movement/muscle;
- equipment;
- duration;
- difficulty/level waar governed;
- program goal;
- source/owner;
- saved/recent.

Search ranking mag safety/applicability filters niet omzeilen.

## 47. Equipment model

Exercises/workouts/programs verwijzen naar canonical equipment capabilities, niet alleen vrije tekst.

Voorbeelden:
- barbell;
- dumbbell;
- rack;
- treadmill;
- bicycle;
- RowErg/SkiErg/BikeErg;
- sled;
- gym machine capability.

Gym/Club kan later beschikbare equipment catalog koppelen zodat content applicability kan worden bepaald.

## 48. Facility/context matching

Als gebruiker aangeeft thuis/gym/outdoor te trainen kan content filtering rekening houden met beschikbare equipment/context. Geen impliciete aanname dat iedere gym hetzelfde heeft.

## 49. Content localization

Canonical IDs blijven taalneutraal. Namen/instructions kunnen vertaald worden. Een vertaling creëert geen nieuwe exercise identity.

## 50. Content provenance/licensing

Voor tekst, afbeeldingen, video, programma's en imported content moet bron/licentie bekend zijn.

Geen willekeurig kopiëren van commerciële exercise libraries/programs.

Per content asset waar relevant:
- source;
- license/permission;
- author;
- version;
- review status.

## 51. Evidence governance

Niet iedere oefening heeft evidence nodig voor het bestaan ervan, maar wetenschappelijke claims en program/progression rules wel.

Claims linken naar Evidence Registry. Exercise instructions kunnen safety/technique guidance hebben met eigen review/provenance.

## 52. AI-generated workout/program

Als later AI helpt creëren:
- AI assembleert alleen uit toegestane canonical content/rules;
- targets komen uit registered calculations/decision logic;
- constraints worden gevalideerd;
- output krijgt draft status;
- gebruiker/coach bevestigt;
- AI mag geen nieuwe exercise facts/evidence/rules verzinnen.

`AI GENERATED` is provenance, geen kwaliteitsgarantie.

## 53. Program templates versus athlete instance

Published program definition is immutable/versioned. Wanneer athlete start, ontstaat assignment/instance/context. Persoonlijke planning/adaptations muteren niet het masterprogramma.

## 54. Team program/template

Teamcoach kan teamtemplate beheren en aan team/event koppelen. Individuele athlete execution blijft per athlete. Teamtemplate mag geen gedeeld resultrecord veroorzaken.

## 55. Gym/Club content

Gym kan eigen workouts/programs/templates publiceren binnen organisatiecontext. Ownership blijft organization. Member execution/result blijft athlete-owned volgens data governance.

Gym commercial entitlement kan toegang tot content bepalen, maar niet recht op athlete resultdata.

## 56. Entitlements

Entitlement kan bepalen of gebruiker bepaalde premium content/capabilities mag gebruiken. Het bepaalt niet Calculation truth, privacy of ownership.

Bij downgrade blijft historische execution/data behouden; toegang tot premium editing/analytics volgt productpolicy.

## 57. Delete/archive

Template verwijderen mag historische executions niet breken.

Gebruik waar nodig archive/tombstone/version retention. History moet voldoende snapshot/reference behouden om oude sessie begrijpelijk te houden.

## 58. Offline

Workout definitions die nodig zijn voor geplande/offline training kunnen lokaal gecachet worden.

Offline execution:
- stable IDs;
- local timestamps/timezone;
- queued result;
- idempotent sync;
- conflict handling;
- geen server-only entitlement/permission uitbreiding offline.

## 59. Error handling

Voorbeelden:
- templateversion niet beschikbaar;
- program assignment revoked;
- device disconnect;
- invalid target;
- unsupported unit;
- partial sync;
- duplicate import;
- coach edit conflict.

Failure van één sensor blokkeert niet noodzakelijk workout; degradation is capability-specific.

## 60. Auditability

Voor program/workout wijzigingen moet herleidbaar zijn:
- actor;
- source;
- version;
- change;
- assignment context;
- applicable rule/version;
- athlete confirmation waar nodig.

## 61. Functioneel >=9 closure criteria

Training Content/Program architecture is pas >=9 wanneer minimaal bewezen is:
- Exercise/Training Element/Workout/Program/Planned Item/Execution strikt gescheiden zijn;
- sport capability model extensible is;
- strength/endurance/ergometer/hybrid/multisport ondersteund zijn;
- Workout Builder achter Training maken zit;
- Mijn trainingen herbruikbaar werkt;
- workout/program versioning history-safe is;
- multiple programs werken;
- planning/scheduler conflicts detecteert;
- coach/team/gym assignments authorization-safe zijn;
- prescription versus actual behouden blijft;
- alle starts dezelfde execution/logging chain gebruiken;
- stable block identity werkt;
- manual/device/cloud provenance behouden blijft;
- dedupe realtime/cloud bewezen is;
- offline/retry idempotent is;
- missed/reschedule policy expliciet is;
- progression/adaptation alleen registered rules gebruikt;
- HRV niet als solitaire restregel wordt gebruikt;
- PR measured/calculated/estimated onderscheidt;
- history immutable/versioned blijft;
- exercise substitution traceable is;
- equipment applicability werkt;
- content licensing/provenance bekend is;
- AI geen shadow calculations/rules/programmutations doet;
- deletion/archive history niet breekt;
- adversarial RLS/assignment tests groen zijn;
- error/empty states/accessibility uiteindelijk getest zijn.

## 62. UX governance

Dit document definieert functionaliteit en canonical ownership, niet definitieve schermen.

Later wordt apart ontworpen:
- Training home;
- Programma's;
- Mijn trainingen;
- Training maken/Builder;
- workout preview;
- execution per sport;
- exercise library/detail;
- program detail;
- history/activity detail.

Voor ieder scherm eerst concreet voorbeeld/mock-up -> Product Owner review -> aanpassen -> akkoord -> pas daarna bouwen.

## 63. Harde architectuurregels

`ONE EXECUTION CHAIN`  
Alle normale trainingsstarts convergeren naar dezelfde canonical execution/loggingketen.

`PROGRAM IS NOT A PLAYLIST`  
Een programma bevat doel, context, fasering, scheduling en governed progression/adaptation.

`PLANNED != ACTUAL`  
Voorschrift en uitvoering blijven afzonderlijk traceerbaar.

`AI MAY EXPLAIN OR ASSIST — IT MAY NOT INVENT TRAINING LOGIC`  
Berekening, progression en adaptation blijven geregistreerde Calculation/Decision-functionaliteit.