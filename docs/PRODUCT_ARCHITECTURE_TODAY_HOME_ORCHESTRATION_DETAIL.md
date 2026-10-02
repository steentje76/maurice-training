# Trainingskompas Target Product Architecture — Vandaag / Home Orchestration

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor de dagelijkse ingang van Trainingskompas. Geen definitief schermontwerp en geen claim dat alle beschreven runtimefunctionaliteit al bestaat.

## 1. Productdoel

`Vandaag` beantwoordt primair één vraag:

> Wat is voor mij vandaag relevant en wat is mijn volgende logische actie?

Vandaag is geen los dashboard met zoveel mogelijk kaarten. Het is de orchestrator bovenop Planning, Training, Recovery, Context, Decision, Coach, Team, Nutrition, Devices en relevante account/system-signalen.

## 2. Harde scheiding

Vandaag:
- verzamelt bestaande canonical outputs;
- prioriteert;
- dedupliceert;
- presenteert;
- biedt veilige vervolgstappen.

Vandaag:
- rekent geen eigen trainingsmetrics;
- verzint geen readiness;
- maakt geen nieuwe trainingsregels;
- herschrijft geen programma zelfstandig;
- laat AI niet beslissen welke onderliggende waarheid geldt.

De bronketen blijft:

RAW DATA -> Calculation Engine -> Context Engine -> Decision/Rules Engine -> Evidence/Confidence -> Today Orchestrator -> AI explanation/presentation.

## 3. Inputdomeinen

Vandaag mag context ontvangen uit minimaal:
- canonical planning/calendar;
- planned workouts/programs;
- team/gym events;
- competitions/events;
- completed activities;
- recovery/readiness outputs;
- training load outputs;
- goals/program phase;
- approved Women's Performance context;
- nutrition/fueling context;
- weather/outdoor context waar beschikbaar;
- device/sync state;
- human coach assignments/messages;
- AI Coach eligible context;
- notifications/action items;
- account/security-critical signals.

Niet ieder inputdomein hoeft iedere dag aanwezig te zijn.

## 4. Daily Context Snapshot

Introduceer conceptueel een versioned `DAILY_CONTEXT_SNAPSHOT` of equivalente read model/composition layer.

Minimale velden:
- athlete_id;
- local_date;
- timezone;
- generated_at;
- relevant planned items;
- completed-today items;
- current recovery/readiness outputs;
- active program/goal context;
- team/event obligations;
- relevant nutrition context;
- relevant device/sync state;
- unresolved action items;
- source freshness;
- data quality/confidence;
- decision outputs;
- presentation eligibility/privacy flags.

Dit snapshot hoeft niet één permanente tabel te zijn; het is een architectuurcontract voor consistente dagelijkse compositie.

## 5. Prioriteitslagen

Vandaag gebruikt deterministische prioriteitscategorieën. Aanbevolen volgorde:

P0 — SAFETY / ACCOUNT CRITICAL
- account/security probleem;
- noodzakelijke consent/auth actie;
- kritieke sync/data-integriteitsfout die interpretatie ongeldig maakt.

P1 — TIME-BOUND COMMITMENTS
- training/wedstrijd/team-event vandaag;
- coach-assignment met deadline;
- event waarvoor availability/attendance actie nodig is.

P2 — DECISION-RELEVANT TRAINING CONTEXT
- expliciete Decision Engine-aanpassing/suggestie;
- recovery/readiness context die vandaag relevant is;
- program phase/context.

P3 — SUPPORTING ACTIONS
- pre/during/post-training nutrition context;
- device connect/sync actie;
- materiaal/teamtaak;
- praktische voorbereiding.

P4 — PROGRESS / INFORMATION
- recente PR;
- streak/consistency;
- nieuw inzicht;
- niet-urgente trend.

P5 — DISCOVERY / ENGAGEMENT
- challenge;
- groep;
- nieuw programma;
- educatieve tip.

Lagere categorieën mogen hogere niet verdringen.

## 6. Eén centrale Next Best Action

Vandaag mag conceptueel één primaire `NEXT_BEST_ACTION` hebben, plus beperkte secundaire acties.

Voorbeelden:
- Start geplande training;
- Bekijk aangepaste trainingssuggestie;
- Geef beschikbaarheid door;
- Verbind PM5 voor deze workout;
- Bekijk coachfeedback;
- Hervat onafgemaakte training.

De selectie is rule-based/product-defined. AI mag de actie uitleggen, maar niet zelfstandig een actie prioriteren buiten toegestane rules.

## 7. Conflict resolution

Tegenstrijdige signalen worden vóór presentatie opgelost of expliciet als onzeker conflict gemarkeerd.

Voorbeeld:
- Planning: zware intervaltraining;
- Recovery: lager dan baseline;
- Team: verplichte teamtraining;
- Coach: aangepaste opdracht.

Vandaag toont niet vier onafhankelijke instructies. Decision/Context bepaalt welke combinatie toegestaan is. Als geen regel een veilige resolutie ondersteunt, presenteert Trainingskompas het conflict transparant en vraagt waar passend een user/coach-beslissing.

AI mag niet zelf bepalen welke bron wint.

## 8. Deduplicatie

Eén gebeurtenis mag niet als meerdere losse boodschappen terugkomen.

Voorbeeld:
`Teamtraining 19:00`
kan tegelijk voorkomen in Calendar, Team, Coach assignment en Notification.

Today Orchestrator resolveert deze naar één canonical daily item met meerdere provenance/context references.

## 9. Source precedence

Bronprecedence is domeinspecifiek, niet één globale volgorde.

Voor planning kan bijvoorbeeld een expliciet gewijzigde canonical planned item leidend zijn boven oude notification cache.
Voor fysiologische waarden geldt canonical Calculation output boven AI-samenvatting.
Voor coachopdrachten geldt signed/authorized human coach assignment boven tekst die AI eerder heeft gegenereerd.

Precedence rules zijn expliciet/versioned.

## 10. Freshness

Vandaag moet weten hoe oud input is.

Voorbeelden:
- HRV van drie dagen geleden mag niet als `vandaag gemeten` worden gepresenteerd;
- weather forecast bevat timestamp/source;
- wearable sync toont laatste succesvolle sync;
- coach feedback toont verzendtijd;
- planning gebruikt lokale datum/timezone.

Stale data kan nog informatief zijn, maar krijgt passende status en mag niet stil als actueel worden behandeld.

## 11. Data quality en confidence

Daily items behouden:
- source;
- measured/imported/manual/derived;
- data quality;
- confidence;
- missingness;
- limitations waar relevant.

`Geen data` is niet hetzelfde als `alles goed`.

Voorbeeld: geen HRV vandaag mag niet automatisch een groene readiness opleveren.

## 12. Geen wearable vereist

Vandaag moet volledig bruikbaar zijn zonder wearable.

Zonder wearable kunnen nog steeds werken:
- planning;
- training;
- manual RPE/RIR/session feedback;
- programma;
- team/events;
- coach;
- nutrition logging;
- progress op beschikbare data.

Wearable-context verrijkt, maar is geen toegangspoort tot basisfunctionaliteit.

## 13. Training states op Vandaag

Voor een training van vandaag zijn minimaal states relevant:
- PLANNED;
- READY_TO_START;
- IN_PROGRESS;
- COMPLETED;
- SKIPPED;
- MISSED;
- RESCHEDULED;
- CANCELED.

Vandaag presenteert passende actie per state.

Een gemiste training wordt niet automatisch naar morgen geschoven zonder expliciete rule/user confirmation.

## 14. Meerdere trainingen op één dag

Ondersteun meerdere planned items:
- ochtend run;
- avond strength;
- teamtraining;
- brick/multisport segmenten.

Today Orchestrator bewaart volgorde, timing, afhankelijkheden en completion per item. Eén primary action kan veranderen na voltooiing van het eerste item.

## 15. Multisport

Bij multisport is Vandaag sport-neutraal op orchestratorniveau. Sport-specific logic blijft in capability/Calculation/Decision layers.

Voorbeeld triathlon:
- swim gepland;
- bike/run brick gepland;
- fueling context gekoppeld aan relevante sessie;
- devices per block;
- completion per onderdeel.

Geen hardcoded `strength-first` homearchitectuur.

## 16. Team-context

Vandaag kan tonen:
- teamtraining/wedstrijd;
- verzameltijd;
- locatie;
- availability actie;
- taak/materiaal;
- team announcement;
- relevante coach assignment.

Team membership geeft geen toegang tot private recovery/healthdata van andere athletes.

## 17. Human Coach-context

Coach/PT kan via toegestane relatie:
- training assignen;
- programma assignen;
- feedback sturen;
- planningcontext toevoegen;
- actie vragen.

Vandaag maakt altijd zichtbaar dat een item van een menselijke coach komt. AI Coach en Human Coach mogen visueel/semantisch niet door elkaar lopen.

## 18. AI Coach op Vandaag

AI Coach kan:
- dagelijkse context samenvatten;
- uitleg geven over reeds berekende/decision outputs;
- verbanden benoemen binnen toegestane evidence;
- onzekerheid communiceren;
- gebruiker naar relevante actie leiden.

AI Coach mag niet:
- metrics herberekenen;
- readiness verzinnen;
- geplande training zelfstandig verwijderen/verplaatsen;
- human coach assignment overschrijven;
- ontbrekende data invullen;
- medische diagnose geven;
- nieuwe Decision Rules creëren.

## 19. Recovery-context

Recovery op Vandaag is compact en actiegericht. Diepgaande analyse hoort in Inzicht.

Vandaag toont alleen wat relevant is voor vandaag, bijvoorbeeld:
- readiness/recovery status;
- belangrijkste onderliggende signalen indien betrouwbaar;
- relevante Decision output;
- link naar detail.

Geen lange HRV/sleep analytics op Home.

## 20. Nutrition-context

Nutrition verschijnt wanneer functioneel relevant, niet als permanente caloriekaart.

Voorbeelden:
- geplande lange duurtraining -> geregistreerde fueling rule/context;
- training net afgerond -> post-training logging/recovery context;
- event vandaag -> planned race nutrition reference.

AI mag geen macro-/caloriedoelen verzinnen.

## 21. Device-context

Devices verschijnen contextueel wanneer een actie nodig is.

Voorbeelden:
- Concept2 workout -> `PM5 verbinden`;
- wearable sync mislukt -> sync status/repair action;
- run kan zonder device -> `Start zonder wearable` blijft beschikbaar.

Geen permanente lijst van alle gekoppelde apparaten op Vandaag; beheer blijft onder Devices & Connections.

## 22. Weather/outdoor-context

Weather mag worden gebruikt voor outdoor context indien bron/freshness bekend zijn.

Mogelijke toepassingen:
- temperatuur;
- neerslag;
- wind;
- hittecontext;
- praktische waarschuwing.

Weather verandert training alleen via expliciete Decision Rules; AI mag niet zelfstandig training aanpassen omdat het `slecht weer` noemt.

## 23. Progress/PR-context

Na completion kan Vandaag relevante feedback tonen:
- PR;
- target behaald;
- program milestone;
- consistency milestone.

PR moet uit canonical sport-specific PR engine komen, niet uit AI-comparison.

Niet iedere training hoeft gamification te produceren.

## 24. Quick Actions

Quick Actions zijn shortcuts, geen bron van waarheid.

Target:
- 4–6 zichtbare acties;
- user-configurable reorder/add/remove;
- sport/context-aware suggestions;
- veilige defaults.

Voorbeelden:
- Vrij trainen;
- Hardlopen;
- Fietsen;
- Training maken;
- Voeding loggen;
- Meting toevoegen;
- Planning openen.

Kritieke geplande acties/waarschuwingen mogen niet verdwijnen omdat gebruiker een quick action verwijdert.

## 25. Personalization

Personalisatie mag bepalen:
- welke niet-kritieke modules vaker zichtbaar zijn;
- quick actions;
- sportrelevante shortcuts;
- informatie-dichtheid later.

Personalisatie mag niet:
- safety/critical items verbergen;
- evidence veranderen;
- Decision Rules veranderen;
- privacy omzeilen;
- sponsored/commercial content als trainingsadvies vermommen.

## 26. Notification versus Today item

Notification = delivery mechanism.
Today item = current product state/action.

Een push kan verdwijnen/geopend zijn terwijl het Today item nog relevant blijft. Omgekeerd hoeft ieder Today item geen push te genereren.

Beide verwijzen waar mogelijk naar hetzelfde canonical action/object.

## 27. Action Center concept

Voor niet-direct-prioritaire maar nog open acties kan Today een `Action Center`/takenlaag voeden.

Voorbeelden:
- coach invite accepteren;
- team availability invullen;
- device reconnect;
- privacy consent review;
- incomplete product scan;
- account/security actie.

Hiermee hoeft Home niet alle openstaande zaken tegelijk te tonen.

## 28. Dismiss / Snooze / Complete

Niet ieder item heeft dezelfde interaction semantics.

Per itemtype expliciet bepalen:
- dismissible?
- snoozable?
- completable?
- auto-resolved?
- expires_at?
- requires acknowledgement?

Safety/security/required consent mag niet stil permanent dismissible zijn.

## 29. Timezone en daggrens

Vandaag gebruikt athlete-local timezone plus event timezone waar nodig.

Vereisten:
- reizen/timezone change;
- events in andere timezone;
- midnight crossing workout;
- late-night completion;
- DST;
- team events met vaste lokale locatie-tijd.

Geen simpele UTC-date als productdag.

## 30. Offline

Vandaag moet een veilige cached state kunnen tonen.

Offline:
- laatst bekende planning;
- lokaal beschikbare workout;
- cached context met duidelijke freshness;
- start/execute training waar capability dit ondersteunt;
- queue logging.

Niet offline doen alsof nieuwe server-side coach/team/privacy/billing state bevestigd is.

## 31. Refresh/reconciliation

Bij reconnect:
- server state ophalen;
- lokale queued executions/actions reconciliëren;
- dedupe;
- conflict detecteren;
- Today opnieuw deterministisch samenstellen.

Geen dubbele completed workout of dubbel team-event door retry.

## 32. Privacy

Today Orchestrator mag alleen data composeren waarvoor athlete/context authorization bestaat.

Shared device/team/gym context mag geen data van andere athletes in persoonlijke Today payload lekken.

Sensitive Women's Performance/nutrition/recovery context wordt alleen getoond/gebruikt volgens user settings/consent/product policy.

## 33. Sensitive presentation

Lockscreen/push en Home zijn verschillende surfaces.

Home kan na authenticatie meer context tonen dan push preview. Push gebruikt minimale neutrale tekst voor gevoelige categorieën.

## 34. Error states

Voorbeelden:
- planning unavailable;
- recovery calculation unavailable;
- wearable sync stale;
- weather unavailable;
- coach assignment cannot load;
- local execution pending sync.

Eén subsystem failure mag Home niet volledig onbruikbaar maken. De orchestrator degradeert per capability.

## 35. Empty states

Nieuwe gebruiker zonder planning/wearable/data krijgt geen leeg dashboard.

Functionele empty-state acties:
- plan eerste training;
- kies programma;
- vrij trainen;
- doelen/sportprofiel afronden;
- optioneel device koppelen;
- join team/gym via invite.

Geen wearable koppelen als verplichte eerste CTA.

## 36. Home lifecycle gedurende dag

Vandaag verandert logisch mee:

OCHTEND
-> planning + context + voorbereiding

VOOR TRAINING
-> start + relevante preparation/device/nutrition

TIJDENS TRAINING
-> resume/in-progress primary

NA TRAINING
-> completion + logging + recovery/nutrition context

AVOND
-> resterende events/actions + compacte day completion

Dit is state-driven, niet een vaste tijdgebonden marketingfeed.

## 37. Morgen/vooruitblik

Vandaag mag beperkte vooruitblik tonen wanneer vandaag geen actie vereist of morgen voorbereiding nodig heeft.

Volledige week/maandplanning blijft in Planning/Calendar. Home wordt geen tweede kalender.

## 38. Commercial content

Subscription/upgrade kan zichtbaar zijn waar relevant, maar:
- nooit boven safety/time-bound training;
- niet vermommen als AI Coach advies;
- geen fear-based recovery upsell;
- duidelijke commerciële herkomst.

## 39. Observability

Meet functioneel:
- composition errors;
- stale source frequency;
- duplicate item suppression;
- action completion;
- failed deep links;
- offline reconciliation;
- rule version;
- latency.

Geen raw sensitive health payloads in telemetry.

## 40. Deterministische explainability

Voor iedere belangrijke Today-aanbeveling moet intern te herleiden zijn:
- welke source data;
- welke Calculation output;
- welke Context;
- welke Decision Rule/version;
- confidence/quality;
- waarom item prioriteit kreeg;
- welke AI-presentatielaag is gebruikt.

AI-tekst alleen is nooit de audittrail.

## 41. Voorbeeld — normale trainingsdag

Inputs:
- strength workout 18:00;
- recovery voldoende;
- PM5 niet relevant;
- geen coachwijziging.

Outputconcept:
- primary: Start training wanneer relevant;
- compact recovery context;
- eventuele voorbereiding;
- secundair recente progress;
- quick actions.

## 42. Voorbeeld — teamdag met lagere recovery

Inputs:
- teamtraining 19:00;
- availability confirmed;
- recovery lager dan persoonlijke baseline;
- geen Decision Rule die cancellation voorschrijft.

Outputconcept:
- primary: teamtraining 19:00;
- recovery context als signaal, niet als diagnose;
- alleen toegestane Decision guidance;
- teamtaak/materialen indien open;
- link naar Recovery detail.

Niet: `Je bent overtraind, sla training over` zonder onderbouwde rule/evidence.

## 43. Voorbeeld — geen wearable

Inputs:
- run gepland;
- geen HRV/sleep/device data;
- manual context beschikbaar.

Outputconcept:
- run blijft startbaar;
- recovery zegt niet `groen` op basis van ontbrekende data;
- gebruiker kan manual feedback/context gebruiken;
- optioneel device koppelen is secundair.

## 44. Voorbeeld — Concept2 workout

Inputs:
- RowErg workout gepland;
- PM5 eerder gebruikt maar nu disconnected.

Outputconcept:
- primary workout;
- contextual `PM5 verbinden`;
- fallback `handmatig / zonder verbinding`;
- device failure blokkeert training niet.

## 45. Voorbeeld — conflict coach/planning

Inputs:
- programma plant interval;
- human coach heeft later replacement workout assigned.

Canonical assignment/planning rules bepalen welke versie actief is. Vandaag toont één actieve training en provenance `Aangepast door coach`, niet beide als concurrerende opdrachten.

## 46. Functioneel >=9 closure criteria

Vandaag/Home is pas functioneel >=9 wanneer minimaal bewezen is:
- canonical daily composition werkt;
- prioriteit deterministisch is;
- Next Best Action rule-based is;
- duplicates worden samengevoegd;
- conflicts veilig worden opgelost/geëscaleerd;
- source precedence versioned is;
- freshness zichtbaar/gerespecteerd is;
- missing != good/zero;
- data quality/confidence behouden blijft;
- wearable niet vereist is;
- multiple workouts/multisport werkt;
- team/human coach context correct werkt;
- AI geen shadow decisions maakt;
- nutrition/device/weather context alleen via toegestane rules invloed heeft;
- quick actions veilig configureerbaar zijn;
- notification en Today state gescheiden zijn;
- timezone/DST getest is;
- offline cached state/reconciliation getest is;
- privacy/RLS geen cross-user leak toestaat;
- subsystem failures graceful degraderen;
- new-user empty state bruikbaar is;
- audit/explainability beschikbaar is;
- telemetry geen sensitive leakage bevat;
- accessibility voor uiteindelijke UX getest is.

## 47. UX governance

Dit document bepaalt **wat Vandaag functioneel moet doen**, niet hoe het uiteindelijke scherm eruitziet.

Later:
1. functionele architectuur >=9;
2. informatiehiërarchie;
3. concreet Home mock-up;
4. Product Owner review;
5. aanpassen;
6. expliciet akkoord;
7. pas daarna implementeren.

## 48. Harde architectuurregel

`TODAY ORCHESTRATES — IT DOES NOT CALCULATE OR INVENT.`

Vandaag is de dagelijkse compositielaag bovenop canonical product-, Calculation-, Context-, Decision- en Evidence-output. Het maakt Trainingskompas coherent, maar wordt nooit een tweede Decision Engine of een verborgen AI-beslissingslaag.