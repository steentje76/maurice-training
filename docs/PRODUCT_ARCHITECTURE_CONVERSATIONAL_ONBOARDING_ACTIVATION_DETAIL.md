# Trainingskompas Target Product Architecture — Conversational Onboarding & Activation

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor intake, onboarding, uitleg, toestemming, activatie en latere contextverrijking. Geen definitief schermontwerp en geen claim dat alle beschreven runtimefunctionaliteit al bestaat.

## 1. Product Owner kernbesluit

Trainingskompas optimaliseert onboarding **niet primair op zo weinig mogelijk stappen**.

Het doel is:
1. voldoende relevante informatie verzamelen om Training, Context, Decision en Coach kwalitatief te laten functioneren;
2. de gebruiker begrijpelijk informeren over wat Trainingskompas doet;
3. transparant uitleggen waarom bepaalde informatie wordt gevraagd en hoe die wordt gebruikt;
4. een natuurlijk, adaptief gesprek gebruiken als primaire intakevorm in plaats van een lange reeks domme invulformulieren;
5. gevoelige toestemming en juridisch relevante keuzes expliciet en controleerbaar behandelen.

Harde regel:

`CONVERSATIONAL != UNSTRUCTURED`.

De gebruiker mag natuurlijk praten; de productarchitectuur slaat alleen gecontroleerde, gestructureerde feiten/context op.

## 2. Hoofdmodel

```text
Natural conversation
      ↓
AI conversation layer
      ↓
Candidate fact extraction
      ↓
Schema + validation + provenance
      ↓
Confirm / clarify where required
      ↓
Canonical athlete/context records
      ↓
Context Engine / Planning / Decision eligibility
```

AI is gesprekspartner en extractor, niet de bron van waarheid.

## 3. Wat AI wel mag doen

AI mag:
- open vragen stellen;
- antwoorden samenvatten;
- relevante kandidaat-feiten herkennen;
- ontbrekende informatie detecteren;
- contextafhankelijk doorvragen;
- jargon uitleggen;
- uitleggen waarom een vraag relevant is;
- gebruiker helpen een doel concreter te formuleren;
- bevestiging vragen bij onzekere interpretatie;
- naar de juiste consent/device/team/gym flow leiden.

## 4. Wat AI niet mag doen

AI mag niet:
- ontbrekende persoonsgegevens of sportdata verzinnen;
- een vage uitspraak stil als exact feit opslaan;
- medische diagnose afleiden;
- blessuregeschiedenis interpreteren als medisch advies;
- trainingswaarden zelfstandig berekenen buiten Calculation Engine;
- nieuwe Decision Rules creëren;
- toestemming impliceren uit een gesprek;
- sensitive scopes activeren zonder expliciete consent;
- een gebruiker dwingen gevoelige informatie te geven;
- AI-inferentie gelijkstellen aan user-confirmed data.

## 5. Intake Information Registry

Alle gewenste intake-informatie hoort in een versioned `INTAKE INFORMATION REGISTRY` of equivalent contract.

Per informatie-item minimaal:
- canonical field/capability;
- vraagdoel;
- waarom relevant;
- required / recommended / optional / sensitive optional;
- applicable sports/roles;
- valid data type/units;
- validation rules;
- confirmation requirement;
- allowed provenance;
- Context Engine use;
- Decision Engine eligibility;
- AI use permission;
- privacy class;
- retention/update policy;
- user-facing explanation;
- fallback when unknown/not provided.

Zo bepaalt AI niet zelf wat het allemaal wil weten.

## 6. Informatiegebieden

Afhankelijk van gebruiker/context kan onboarding informatie verzamelen over:
- identiteit/basisprofiel;
- taal, timezone en eenheden;
- sport(en);
- primaire/secundaire sport;
- ervaringsniveau;
- trainingshistorie;
- actuele trainingsfrequentie;
- doelen;
- wedstrijden/events/deadlines;
- beschikbare trainingsdagen/tijden;
- voorkeuren;
- trainingsomgeving/faciliteiten;
- beschikbare apparatuur;
- huidige programma's;
- kracht-/endurancecontext waar relevant;
- manual baseline/context waar toegestaan;
- wearables/databronnen;
- recovery/slaapcontext waar gewenst;
- nutrition context waar gewenst;
- Women's Performance context optioneel;
- beperkingen/pijn/blessure-context uitsluitend binnen vastgestelde veilige scope;
- coach/PT relatie;
- team/gym/club relatie;
- social/privacy voorkeuren;
- notifications;
- research consent alleen als afzonderlijke flow;
- subscription/entitlement context.

Niet alles is voor iedere gebruiker relevant.

## 7. Adaptieve sportintake

Gesprek vertakt op sportcontext.

### Voorbeeld strength athlete
Relevante vervolgcontext kan zijn:
- krachttrainingservaring;
- trainingsfrequentie;
- huidige split/program;
- belangrijkste doelen;
- beschikbare equipment;
- relevante bekende prestaties;
- RPE/RIR familiarity;
- geplande events/competities indien van toepassing.

### Voorbeeld runner
- huidige loopfrequentie;
- typische weekomvang indien bekend;
- recente/gebruikelijke afstanden;
- doelafstand/event;
- ervaring;
- beschikbare dagen;
- outdoor/treadmill voorkeur;
- wearable/GPS optioneel.

### Voorbeeld multisport
AI detecteert dat één enkel sportprofiel onvoldoende is en verzamelt per discipline plus gezamenlijke planning/context.

### Voorbeeld team athlete
Team invite/role/event schedule kan een deel van context al leveren. Gesprek vraagt niet opnieuw wat betrouwbaar canonical bekend is.

## 8. Natuurlijk gesprek naar structured facts

Voorbeeld:

Gebruiker:
> Ik wil vooral sterker worden maar loop meestal twee keer per week. In oktober wil ik een halve marathon doen.

Candidate extraction:
- goal: strength improvement;
- sport: strength training;
- secondary sport: running;
- stated running frequency: approximately 2/week;
- target event type: half marathon;
- target month: October;
- exact event/date: UNKNOWN.

De AI mag niet stil `2026-10-15` invullen.

Vervolg:
> Weet je al welke halve marathon en op welke datum die is?

## 9. Confidence en bevestiging

Candidate facts krijgen status, bijvoorbeeld:
- EXPLICIT_USER_STATEMENT;
- AI_EXTRACTED_HIGH_CONFIDENCE;
- AI_EXTRACTED_NEEDS_CONFIRMATION;
- USER_CONFIRMED;
- IMPORTED_VERIFIED;
- UNKNOWN;
- DECLINED_TO_PROVIDE.

Belangrijke of ambigue velden worden bevestigd vóór ze Decision-relevant worden.

## 10. Samenvatting als controlepunt

Na een logisch gespreksonderdeel kan Trainingskompas teruggeven:

> Dit heb ik van je begrepen:
> - kracht is momenteel je hoofddoel;
> - je loopt meestal twee keer per week;
> - je wilt in oktober een halve marathon lopen;
> - exacte wedstrijddatum is nog niet bekend.

Gebruiker kan corrigeren zonder het hele gesprek opnieuw te doen.

Dit is informatievalidatie, niet noodzakelijk een klassiek formulier.

## 11. Explain-as-you-ask

Wanneer een vraag mogelijk niet vanzelfsprekend is, legt Trainingskompas uit waarom.

Voorbeeld recovery:
> Als je wilt, kan Trainingskompas slaap- en herstelgegevens meenemen als extra trainingscontext. Een lage HRV bepaalt nooit zelfstandig dat je niet mag trainen.

Voorbeeld GPS:
> GPS kan route, tempo en afstand vastleggen. Je kunt ook zonder GPS trainen. Gedeelde routes kunnen later een privacyzone gebruiken.

Voorbeeld voeding:
> Voedingsinformatie kan helpen om patronen rond training te analyseren. Niet gelogd eten wordt nooit als nul-inname behandeld.

Uitleg moet aansluiten op daadwerkelijke systeemwerking.

## 12. Permission just-in-time

OS/device permissions worden bij voorkeur gevraagd wanneer de gebruiker begrijpt waarvoor ze nodig zijn.

Voorbeelden:
- Bluetooth wanneer device connect relevant is;
- location/GPS wanneer outdoor route tracking wordt geactiveerd;
- notifications nadat notificationwaarde is uitgelegd;
- health platform scopes wanneer gebruiker data wil koppelen.

Geen permission wall aan begin zonder context.

## 13. Sensitive consent is geen chat-inferentie

Voor gevoelige categorieën geldt:

`conversation intent != legal/product consent`.

AI kan uitleg geven en vragen of gebruiker de functie wil instellen, maar daadwerkelijke consent wordt via expliciete structured consent action vastgelegd met:
- scope;
- purpose;
- recipient/context;
- timestamp;
- policy/version;
- revoke path.

## 14. Women's Performance

Women's Performance is optioneel.

Onboarding:
- introduceert alleen waar relevant/gekozen;
- legt doel uit als trainingscontext;
- maakt duidelijk dat het geen period tracker/diagnostisch systeem hoeft te zijn;
- causaliteit wordt niet gesuggereerd;
- gevoelige data niet verplicht;
- delen met coach/team/gym nooit automatisch;
- gebruiker kan later wijzigen/verwijderen.

Pregnancy/postpartum/menopause/contraception blijven afzonderlijk governed capabilities/productbesluiten waar nog niet volledig vastgesteld.

## 15. Pijn, blessure en medische grens

Onboarding mag alleen informatie verzamelen die binnen expliciet goedgekeurde product/safety scope valt.

Voorbeeld veilige productcontext kan zijn:
- gebruiker meldt dat bepaalde oefening momenteel niet gewenst/mogelijk is;
- gebruiker geeft een eigen trainingsbeperking aan.

AI mag daaruit niet zelfstandig een diagnose, behandelplan of medische clearance afleiden.

Bij signalen buiten scope wordt verwezen naar passende professionele beoordeling volgens later safety policy.

## 16. Doelen

Doelen worden gestructureerd vastgelegd.

AI mag helpen verduidelijken:
- prestatie;
- evenement;
- consistentie;
- kracht;
- endurance;
- sport-specific target.

AI mag geen onrealistisch of risicovol doel stil normaliseren naar trainingsvoorschrift. Decision/Program logic bepaalt wat systeemmatig kan worden gebruikt.

## 17. Event-first onboarding

Als gebruiker zegt:
> Ik train voor de marathon van Rotterdam.

kan event/competition het anker worden:
- event identity/date verifiëren waar bron beschikbaar;
- sport/doel afleiden als candidate;
- huidige training/context vragen;
- planning horizon bepalen via canonical event data.

Event is daarna hetzelfde canonical object dat Planning/Program/Today gebruikt.

## 18. Coach-invite onboarding

Gebruiker kan via human coach invite binnenkomen.

Flow:
- account/identity;
- uitleg relatie;
- welke gegevens coach vraagt te mogen zien;
- scopes afzonderlijk tonen;
- accepteren/weigeren per productpolicy;
- sport/context aanvullen;
- coach assignments zichtbaar maken.

Coach invite mag sensitive consent niet bundelen in één onduidelijke `alles toestaan` actie.

## 19. Team/Gym onboarding

Via team/gym invite:
- organisatie/team identity tonen;
- membership role/context;
- relevante planning/events;
- privacy-uitleg;
- persoonlijke athlete context aanvullen;
- eventueel organization-sponsored entitlement activeren.

Gym/team membership geeft geen automatische health/recovery/nutrition/Women access.

## 20. Wearable/device onboarding

Devices zijn optioneel.

Gesprek kan vragen:
> Gebruik je momenteel een sporthorloge, hartslagmeter of trainingsapparaat waarvan je gegevens wilt meenemen?

Vervolgens alleen relevante connectoropties.

Geen wearable:
- volledige basisapp blijft bruikbaar;
- manual data/context waar ondersteund;
- geen lagere productstatus alsof gebruiker setup niet heeft afgemaakt.

## 21. Bestaande data importeren

Waar beschikbaar kan onboarding aanbieden:
- Google Health/Health Connect;
- toekomstige Garmin/Polar/etc.;
- Concept2/device data;
- andere ondersteunde imports.

Import:
- bewaart provenance;
- dedupliceert;
- overschrijft manual corrections niet stil;
- maakt bron/freshness duidelijk;
- vraagt alleen noodzakelijke scopes.

## 22. Training history bootstrap

Voor goede personalisatie kan recente trainingshistorie waardevol zijn.

Bronnen:
- imported activities;
- existing program;
- manual conversational summary;
- later logged TK sessions.

Een uitspraak als `ik train al jaren` is context, geen vervanging voor exacte historische performance data.

## 23. Progressive enrichment

Onboarding eindigt niet definitief na dag één.

Introduceer `CONTEXT COMPLETENESS` per capability, niet één globale procent-score die gebruiker moet maximaliseren.

Voorbeelden:
- running context sufficient;
- strength context partial;
- recovery context unavailable;
- nutrition context intentionally disabled;
- coach relationship active.

Later kan contextueel worden gevraagd naar informatie die pas relevant wordt.

## 24. Waarom later doorvragen?

Niet om onboarding kunstmatig kort te houden, maar omdat informatie op het juiste moment:
- beter te begrijpen is;
- nauwkeuriger kan worden beantwoord;
- direct waarde oplevert;
- toestemming betekenisvoller maakt.

Voorbeeld: pas bij eerste Concept2-workout vragen naar PM5-connectie kan nuttiger zijn dan tijdens algemene intake.

## 25. User education

Onboarding moet de mentale modellen van Trainingskompas uitleggen.

Minimaal begrijpelijk maken:
- Planning = wat je van plan bent;
- Training/History = wat je daadwerkelijk deed;
- Inzicht = wat ontwikkeling betekent;
- Coach = advies/uitleg;
- AI Coach is geen Calculation Engine;
- recovery is context, geen absolute waarheid;
- wearables zijn optioneel;
- privacy/consent blijft onder controle van gebruiker;
- team/gym/coach hebben niet automatisch toegang tot gevoelige data;
- missing data wordt niet als nul geïnterpreteerd.

Niet alles hoeft in één tutorial; uitleg verschijnt wanneer relevant.

## 26. Teach-back voor belangrijke concepten

Voor hoog-impact privacy/consent kan UI kort controleren of keuze begrijpelijk is zonder examenachtig te worden.

Bijvoorbeeld duidelijk onderscheid:
- `Coach mag mijn trainingshistorie zien`
versus
- `Coach mag mijn recoverydetails zien`.

De gebruiker moet de gevolgen vóór bevestiging kunnen begrijpen.

## 27. Onboarding conversation memory

Gesprek moet eerdere bevestigde antwoorden gebruiken zodat dezelfde vraag niet opnieuw wordt gesteld.

Maar:
- conversational memory is niet canonical truth;
- structured profile/context records zijn leidend;
- wijziging in canonical data moet volgende gesprekken beïnvloeden;
- oude AI-samenvatting mag nieuwere user correction niet overschrijven.

## 28. Corrections

Gebruiker kan altijd zeggen:
> Dat klopt niet, ik loop drie keer per week.

Correctieflow:
- identify canonical field;
- show/resolve ambiguity;
- update with new provenance/timestamp;
- preserve audit/version waar relevant;
- invalidate/recompute afhankelijke outputs via normale engines.

AI herberekent zelf niets.

## 29. Contradictory answers

Bij conflict:
- niet stil laatste tekst kiezen als beide betekenisvol kunnen zijn;
- vraag verduidelijking;
- onderscheid historical/current indien mogelijk;
- bewaar timestamps/context.

Voorbeeld:
`Ik liep vroeger 5x/week, nu 2x.`
moet niet als current frequency 5 worden opgeslagen.

## 30. Unknown en skip

Gebruiker mag zeggen:
- weet ik niet;
- later;
- wil ik niet delen;
- niet van toepassing.

Deze states zijn verschillend:
- UNKNOWN;
- DEFERRED;
- DECLINED;
- NOT_APPLICABLE.

Geen ervan wordt `0` of `false` tenzij semantisch correct.

## 31. Requiredness

`Required` wordt spaarzaam gebruikt en betekent: capability kan zonder dit gegeven niet correct/veilig functioneren.

Niet: marketing wil graag meer profieldata.

Per sport/capability kunnen minimum inputs verschillen.

## 32. Conversation plan is deterministic-bounded

AI mag flexibel formuleren, maar het informatieplan wordt begrensd door registry/rules.

Conceptueel:

```text
Known canonical facts
+ desired capability set
+ missing required/recommended fields
+ applicability rules
+ consent state
= allowed next topics
```

AI kiest natuurlijke formulering/volgorde binnen die ruimte.

## 33. No shadow profile

Er mag geen verborgen rijk AI-profiel ontstaan dat meer persoonsgegevens/inferenties bevat dan canonical records toestaan.

Verboden:
- personality diagnosis uit chat;
- medische inferenties zonder productbasis;
- gevoelige labels omdat AI iets `denkt`;
- permanent opslaan van irrelevante conversational details.

Data minimization geldt ook bij rijke intake.

## 34. Raw conversation retention

Raw onboarding chat en structured facts zijn verschillende dataobjecten.

Product/legal decision moet expliciet bepalen:
- of raw chat wordt bewaard;
- hoe lang;
- waarvoor;
- export/delete;
- AI provider processing;
- telemetry exclusion.

Canonical productfunctionaliteit mag niet afhankelijk zijn van onbeperkte bewaring van raw gesprekken.

## 35. Privacy summary vóór activatie

Gebruiker krijgt begrijpelijk overzicht:
- welke profiel/contextcategorieën zijn ingesteld;
- welke devices/databronnen gekoppeld zijn;
- welke coach/team/gym relaties actief zijn;
- welke gevoelige modules aan/uit staan;
- wie welke scopes heeft;
- waar dit later gewijzigd kan worden.

## 36. Activation readiness

Geen globale `onboarding complete = true` als enige waarheid.

Gebruik capability readiness, bijvoorbeeld:
- ACCOUNT_READY;
- TRAINING_CORE_READY;
- SPORT_CONTEXT_READY;
- PLANNING_READY;
- RECOVERY_CONTEXT_READY/PARTIAL/DISABLED;
- DEVICE_OPTIONAL_CONNECTED/NONE;
- COACH_RELATION_NONE/READY;
- TEAM_ORG_NONE/READY.

Zo kan gebruiker trainen terwijl optionele context later wordt verrijkt.

## 37. First useful outcome

Onboarding moet uiteindelijk iets concreets opleveren, afhankelijk van intentie:
- eerste training kunnen starten;
- passend programma kiezen/maken;
- event in planning zetten;
- coach assignment ontvangen;
- teamplanning activeren;
- bestaande data importeren;
- persoonlijke Today-context bruikbaar maken.

Niet alleen `profiel 100% ingevuld`.

## 38. Subscription tijdens onboarding

Commerciële keuzes mogen relevante capabilities uitleggen, maar mogen inhoudelijke intake niet manipuleren.

Geen:
- angst rond recovery gebruiken voor upsell;
- suggereren dat wearable noodzakelijk is voor premium kwaliteit als basis zonder wearable werkt;
- privacykeuze koppelen aan commerciële druk.

Entitlement bepaalt toegang tot features, niet waarheid of datarechten.

## 39. Research consent

Wetenschappelijk/research gebruik is een aparte opt-in met eigen purpose, scope, governance en withdrawal. Niet verstoppen in algemene onboarding/privacytekst.

Geen research consent = normale app blijft volgens productmodel bruikbaar.

## 40. Minor/family accounts

Als minderjarigen later worden ondersteund, is dat een afzonderlijke product/legal architectuur met leeftijd/guardian/consent/safety requirements. Niet stil dezelfde adult onboarding gebruiken.

## 41. Accessibility

Conversational onboarding moet ook zonder spraak of snelle tekstinput bruikbaar zijn.

Vereisten later:
- screen reader;
- keyboard/web waar relevant;
- duidelijke tekstalternatieven;
- geen uitsluitend kleurgebaseerde status;
- mogelijkheid antwoorden te bekijken/corrigeren;
- eenvoudige taal waar mogelijk;
- geen verplichte voice biometrics.

Voice kan later interface zijn, maar niet de enige route.

## 42. Localization

AI-vragen en canonical values worden gescheiden.

Gebruiker kan Nederlands spreken terwijl canonical sport/goal/unit enums stabiel blijven. Units worden genormaliseerd door Calculation/Data layer, niet door losse AI-aannames.

## 43. Failure/degradation

Als AI tijdelijk niet beschikbaar is:
- account blijft toegankelijk;
- bestaande canonical data blijft bruikbaar;
- critical consent/settings blijven via deterministic UI bereikbaar;
- fallback structured intake kan bestaan;
- geen data verloren uit bevestigde stappen.

Conversational AI is primaire ervaring, maar geen single point of failure voor accountveiligheid.

## 44. Security

Nooit via onboarding-chat accepteren als bewijs voor:
- privilege elevation;
- organization admin role;
- coach authorization;
- billing ownership;
- security credential reset.

Die acties gebruiken dedicated authenticated flows.

## 45. Telemetry

Meet productkwaliteit zonder raw sensitive chatinhoud te loggen.

Mogelijk:
- topic completion;
- clarification frequency;
- extraction correction rate;
- deferred topics;
- permission acceptance/decline;
- activation outcome;
- errors/latency.

Geen volledige onboardingconversatie in analytics/crash logs.

## 46. Kwaliteitsmeting van AI-extractie

Voor functioneel >=9 moet extraction systematisch worden getest op:
- negation;
- historical versus current;
- approximate quantities;
- multiple sports;
- dates;
- units;
- corrections;
- uncertainty;
- Dutch colloquial language;
- spelling;
- contradictory statements;
- refusal/skip;
- sensitive data boundaries.

Geen benchmark alleen op `conversation sounds natural`.

## 47. Voorbeeld volledige natuurlijke start

```text
TK: Waarvoor wil je Trainingskompas vooral gebruiken?
User: Ik doe drie keer per week krachttraining en loop meestal twee keer. Ik wil sterker worden en in oktober een halve marathon lopen.

TK: Duidelijk. Kracht is dus je belangrijkste doel, en hardlopen blijft daarnaast belangrijk. Weet je al welke halve marathon je wilt lopen en wanneer die precies is?

User: Amsterdam, 18 oktober.

TK: Dan kan ik die wedstrijd als doelmoment in je planning gebruiken. Hoe ziet je krachttraining nu ongeveer uit?
...
```

Achter de schermen worden alleen registry-approved candidate facts opgebouwd en bevestigd.

## 48. Voorbeeld uitleg wearable

```text
TK: Gebruik je een sporthorloge of hartslagmeter waarvan je gegevens wilt meenemen?
User: Garmin.
TK: Die gegevens kunnen je activiteiten en herstelcontext aanvullen. Trainingskompas blijft ook zonder wearable volledig bruikbaar. Als je Garmin later koppelt, houden we per waarde bij waar die vandaan komt en hoe actueel die is.
```

Connector availability/real validation blijft afzonderlijke technische status.

## 49. Voorbeeld gevoelige context

```text
TK: Er is ook optionele Women's Performance-context. Als je die gebruikt, kan Trainingskompas door jou vastgelegde context meenemen bij trainingsinzichten. We behandelen dit als gevoelige informatie en delen dit niet automatisch met coach, team of gym. Wil je hier meer over weten?
```

Pas daarna eventueel dedicated consent/configuration.

## 50. Functioneel >=9 closure criteria

Conversational Onboarding & Activation is pas >=9 wanneer minimaal bewezen is:
- intake registry versioned bestaat;
- AI alleen toegestane topics/facts verwerkt;
- structured extraction gescheiden is van raw conversation;
- provenance per feit behouden blijft;
- ambiguous facts worden bevestigd;
- unknown/deferred/declined/not-applicable correct onderscheiden zijn;
- historical/current context correct wordt onderscheiden;
- corrections canonical state correct aanpassen;
- sportadaptieve intake werkt;
- multisport werkt;
- coach/team/gym invite flows werken;
- wearable optioneel blijft;
- explain-as-you-ask consistent is;
- sensitive consent nooit uit chat wordt geïmpliceerd;
- privacy summary correct is;
- capability readiness werkt zonder globale nep-completion;
- AI-outage fallback bestaat;
- geen shadow profile ontstaat;
- raw chat retention expliciet governed is;
- export/delete onboardingdata omvat;
- telemetry geen sensitive chat lekt;
- adversarial extraction tests groen zijn;
- accessibility/localization zijn getest;
- eerste concrete productuitkomst bereikbaar is;
- uitleg overeenkomt met daadwerkelijke Calculation/Decision/Privacy architectuur.

## 51. UX governance

Dit document bepaalt de functionele conversatie- en datalogica. Het bepaalt nog niet:
- exacte avatar/personality van onboarding coach;
- bubbles/layout;
- progress indicator;
- animaties;
- exacte tekst per scherm;
- voice UX.

Later wordt ook onboarding scherm voor scherm/conversatievoorbeeld voorgelegd aan Product Owner vóór implementatie.

## 52. Harde architectuurregels

`RICH INTAKE != MAXIMUM DATA COLLECTION`  
We verzamelen veel relevante informatie, niet zoveel mogelijk informatie.

`AI CONVERSATION != AI TRUTH`  
AI helpt vragen, begrijpen en structureren; canonical confirmed data blijft bron van waarheid.

`EXPLANATION IS PART OF ONBOARDING`  
De gebruiker moet niet alleen gegevens afstaan, maar begrijpen waarom Trainingskompas ze gebruikt.

`CONSENT MUST BE EXPLICIT`  
Gevoelige toestemming ontstaat nooit impliciet uit natuurlijke taal.

`ONBOARDING IS PROGRESSIVE`  
Informatie wordt verzameld wanneer relevant, zonder kwaliteit op te offeren om een korte funnel te krijgen.