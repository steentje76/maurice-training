# Trainingskompas Target Product Architecture — Samen Detail

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** targetfunctionaliteit voor Social, messaging, vrienden/connections, groepen, challenges, Team en Gym/Club. Geen bewijs dat alle beschreven functionaliteit al gebouwd is.

## 1. Kernbeslissing

`Samen` is de sociale en organisatorische productbestemming van Trainingskompas. Het is meer dan een activity feed: het omvat ook een volwaardig communicatieplatform vergelijkbaar met moderne messaging-apps, maar sport-, training-, team- en privacybewust.

Targetstructuur:

SAMEN
- Overzicht
- Berichten
- Activiteiten/feed
- Vrienden & connecties
- Groepen
- Challenges
- Mijn team(s)
- Mijn Gym/Club
- Uitnodigingen

Niet ieder onderdeel hoeft voor iedere gebruiker zichtbaar of even prominent te zijn. Rollen, lidmaatschappen, sportcontext en entitlements bepalen relevante toegang.

## 2. Centrale sociale identiteit

Iedere gebruiker gebruikt dezelfde centrale athlete identity:
- user/athlete id;
- naam;
- centrale avatar/profielfoto;
- bewust gedeelde sportprofielvelden;
- privacy-instellingen;
- block/report status.

Geen aparte profielen per feed, chat, team of challenge. Gym/Club branding verandert de context/skin, niet de identiteit van de sporter.

## 3. Social graph

Ondersteun expliciete relaties, niet alleen een globale `public` status.

Mogelijke relaties:
- connection/friend;
- follower/following indien product owner dit later kiest;
- group member;
- team member;
- coach relation;
- organization/gym membership.

Vriendschap, teamlidmaatschap en gym-lidmaatschap zijn verschillende autorisatiecontexten. Lid zijn van dezelfde gym betekent niet automatisch dat twee gebruikers elkaars privédata kunnen zien of elkaar privéberichten mogen sturen als privacyinstellingen dat blokkeren.

## 4. Berichtenplatform

Berichten is een eersteklas capability binnen Samen, niet slechts comments onder activiteiten.

Target:
- 1-op-1 chat;
- groepschat;
- teamchat;
- gym/club-kanalen;
- contextchat gekoppeld aan activiteit/training/event/challenge;
- unread state;
- push/in-app notificaties;
- reply;
- reactions;
- mentions;
- attachments later volgens privacy/securitybeleid;
- message search later;
- mute/archive;
- block/report.

De ervaring mag qua eenvoud lijken op WhatsApp/Signal/Teams, maar Trainingskompas bouwt sportcontext in plaats van een generieke messenger te kopiëren.

## 5. Conversation model

Een conversation heeft minimaal:
- id;
- type: DIRECT, GROUP, TEAM, ORGANIZATION_CHANNEL, CONTEXT_THREAD;
- participants/membership;
- role/context;
- created_at;
- last_activity;
- mute/archive state per gebruiker;
- permissions;
- retention/moderation policy.

Messages bevatten minimaal:
- sender;
- timestamp;
- content/type;
- reply_to optioneel;
- context reference optioneel;
- edit/delete status;
- moderation state;
- delivery/read state waar ondersteund.

## 6. Sportcontext in berichten

Gebruikers kunnen vanuit een object delen naar een gesprek zonder data te kopiëren.

Voorbeelden:
- `Deel deze training`;
- `Bespreek deze activiteit`;
- `Stuur route`;
- `Deel challenge`;
- `Bespreek teamwedstrijd`.

Het bericht bevat een veilige reference/card naar het canonical object. Toegang tot de kaart wordt bij openen opnieuw gecontroleerd. Een eerder gedeelde link mag privacy/RLS niet omzeilen nadat toestemming is ingetrokken.

## 7. Chat privacy

Minimaal:
- wie mag mij een bericht sturen;
- block;
- report;
- mute;
- groepsuitnodigingen beheren;
- read receipts als productkeuze;
- online/last-seen alleen als expliciet gewenst;
- gevoelige data nooit automatisch in chat preview/push.

Geen telefoonnummer hoeft het centrale adresseringsmechanisme te zijn; Trainingskompas identity kan leidend blijven.

End-to-end encryptie is een afzonderlijke security/productbeslissing en mag niet geclaimd worden zonder daadwerkelijke implementatie en verificatie.

## 8. Feed / activiteiten

Feed is gericht op bewust gedeelde sportactiviteit, niet automatisch alle training/health data.

De gebruiker kiest bij delen bijvoorbeeld:
- activiteit;
- kernprestatie;
- route of route zonder privacyzone;
- foto/media later;
- tekst;
- doelgroep.

Doelgroepen kunnen zijn:
- alleen ik;
- connections/vrienden;
- specifieke groep;
- team;
- openbaar alleen indien product owner dit bewust activeert.

HRV, slaap, Women's Performance, voeding, lichaamsmetingen en andere gevoelige context worden nooit automatisch onderdeel van een gedeelde activiteit.

## 9. Interactie op feed

Target:
- reacties/likes;
- comments;
- delen binnen toegestane privacy;
- report;
- block;
- notifications.

Geen engagementmechanisme mag privacyregels omzeilen. Verwijderen van originele share moet afhankelijkheden correct afhandelen.

## 10. Vrienden & connecties

Gebruiker kan:
- zoeken op toegestane profielinformatie;
- connectieverzoek sturen/ontvangen;
- accepteren/weigeren;
- verwijderen;
- blokkeren;
- privacy per relatie toepassen waar nodig.

Contact discovery via telefoonboek/e-mail is optioneel en vereist expliciete toestemming; geen noodzakelijke baseline.

## 11. Groepen

Groep is een lichtere sociale structuur dan Team of Gym/Club.

Voorbeelden:
- hardloopgroep;
- vriendenclub;
- trainingsgroep;
- challenge-community.

Groep kan hebben:
- naam/avatar/banner;
- beschrijving;
- owner/admin/moderator/member rollen;
- feed;
- chat;
- events optioneel;
- challenge links;
- invite/join regels.

Groep geeft niet automatisch toegang tot private training- of recoverydata.

## 12. Challenges

Challenge model kan bevatten:
- naam;
- doel/type;
- sport;
- start/einddatum;
- eligibility;
- meetregel;
- privacy;
- deelnemers;
- ranking/progress;
- evidence/calculation source.

Voorbeelden: trainingsfrequentie, afstand, duur of specifieke sportprestatie waar eerlijk en betrouwbaar meetbaar. Rankings mogen geen missing/manual/device verschillen verhullen. Fraud/abuse en datakwaliteit moeten worden meegenomen als publieke rankings later belangrijk worden.

## 13. Team

Team is operationeler dan groep.

TEAM
- Team Home
- Berichten / Teamchat
- Planning
- Trainingen
- Wedstrijden
- Beschikbaarheid
- Aanwezigheid
- Taken & materialen
- Teamleden
- Coaches/staff
- Teamresultaten
- Instellingen

Team gebruikt de centrale calendar/event engine.

## 14. Team events

Eventtypen:
- training;
- wedstrijd;
- toernooi;
- test;
- meeting;
- overig.

Velden kunnen bevatten:
- datum/tijd/timezone;
- locatie;
- verzameltijd;
- starttijd;
- coach/staff;
- beschikbaarheid;
- attendance;
- materialen;
- taken;
- opmerkingen;
- notificaties.

## 15. Beschikbaarheid en aanwezigheid

Speler kan bijvoorbeeld antwoorden:
- beschikbaar;
- niet beschikbaar;
- misschien/onbekend.

Coach/staff kan attendance registreren volgens rolrechten. Beschikbaarheid is niet hetzelfde als aanwezigheid.

## 16. Taken en materialen

Team-event kan taken bevatten zoals:
- ballen meenemen;
- hesjes;
- vervoer;
- water;
- materiaalbeheer;
- teamtaak.

Taak heeft owner, status en deadline/eventcontext. Dit sluit aan op eerder gewenste teamplanning zonder een aparte losse todo-app te maken.

## 17. Team performance en privacy

Teamcoach kan teamrelevante performance alleen zien als:
- capability bestaat;
- device/data beschikbaar is;
- rol dit toestaat;
- athlete privacy/consent dit toestaat waar vereist.

Teamlidmaatschap geeft nooit automatisch toegang tot HRV, slaap, Women's Performance, voeding of andere gevoelige individuele data.

## 18. Gym/Club als gescheiden branded layer

Gym/Club krijgt een expliciete organisatiecontext bovenop dezelfde Trainingskompas-engine. Een gym mag een eigen look & feel toevoegen binnen gecontroleerde grenzen, zonder een aparte fork/app te worden.

Architectuur:

TRAININGSKOMPAS PLATFORM
-> canonical training/intelligence/security engine
-> ORGANIZATION / GYM / CLUB CONTEXT
-> organization configuration + branding skin + modules
-> member/staff experience

Trainingskompas blijft herkenbaar als onderliggend product, tenzij later bewust een white-label commercieel product wordt besloten.

## 19. Gym/Club branding

Configureerbare branding kan omvatten:
- gym/club logo;
- display name;
- accentkleur(en) binnen accessibilityregels;
- cover/banner;
- locatieafbeeldingen;
- welkomsttekst;
- eigen links/contact;
- geselecteerde modules/home-cards;
- eventueel custom terminology binnen gecontroleerde velden.

Niet configureerbaar door gym:
- Calculation Engine logica;
- Decision Rules buiten toegestane configuratie;
- evidence claims;
- security/RLS;
- privacy/consentregels;
- verplichte juridische/Trainingskompas-identificatie;
- willekeurige CSS/JavaScript/code injectie.

Geen custom code injection: branding is data/configuratie, geen onbeperkte theme-code.

## 20. Wie mag Gym/Club look & feel aanpassen?

**Niet ieder gym-lid.** Branding en organisatieconfiguratie zijn privileged organization capabilities.

Target rollen bijvoorbeeld:
- ORG_OWNER;
- ORG_ADMIN;
- BRAND_MANAGER;
- LOCATION_MANAGER;
- COACH/TRAINER;
- STAFF;
- MEMBER.

Default bevoegdheden:
- ORG_OWNER: volledige organisatieconfiguratie inclusief branding;
- ORG_ADMIN: branding/config volgens verleende rechten;
- BRAND_MANAGER: alleen branding/contentvelden, geen leden-/securitybeheer;
- LOCATION_MANAGER: locatiegebonden beheer, branding alleen als expliciet verleend;
- COACH/TRAINER: trainings-/coachfuncties, geen branding standaard;
- STAFF: operationele beperkte rechten;
- MEMBER: consumer/member experience, **geen branding/configuratie**.

Alle privileged wijzigingen server-side autoriseren en auditloggen. UI-verbergen alleen is onvoldoende.

## 21. Branding inheritance

Ondersteun hiërarchie:

Organization
-> Location
-> Team/Group optioneel

Organisatiebranding is default. Een locatie kan alleen overrides krijgen als product/role dit toestaat. Hiermee kan een keten meerdere locaties beheren zonder duplicatie.

Voorbeeld:
- FitClub Nederland: hoofdlogo/kleuren;
- Locatie Utrecht: eigen banner/contactgegevens;
- Locatie Rotterdam: eigen banner/contactgegevens.

De Calculation/Decision/AI governance blijft identiek.

## 22. Gym/Club member experience

Wanneer een athlete lid is van een gym kan `Mijn Gym/Club` tonen:
- branded gym home;
- locaties;
- opening/informatie indien beheerd;
- gym announcements;
- groepslessen/events indien scope;
- trainingsprogramma's/templates van gym;
- coaches/trainers;
- teams/groepen;
- challenges;
- gym chat/kanalen;
- equipment/device capabilities later;
- membership context volgens commerciële scope.

De athlete blijft dezelfde Trainingskompas-account houden. Verlaten van gym verwijdert niet de persoonlijke Trainingskompas-historie die rechtmatig bij athlete hoort.

## 23. Gym/Club admin workspace

Nieuwe target adminlaag moet de canonical organization architecture gebruiken, niet legacy `users.gym_*` als bron van waarheid.

Target:
- Organisatieprofiel;
- Branding;
- Locaties;
- Rollen & staff;
- Leden;
- Teams/groepen;
- Coaches;
- Programma's/templates;
- Events/lessen;
- Communicatie/kanalen;
- Challenges;
- Equipment/devices later;
- Analytics volgens privacy;
- Subscription/billing later;
- Auditlog;
- Instellingen.

## 24. Gym announcements versus chat

Onderscheid:
- announcement: organisatie/staff -> doelgroep, beperkt replygedrag;
- channel: meerdere deelnemers volgens channel permissions;
- direct message: persoon -> persoon;
- team chat: teamcontext.

Zo hoeft belangrijke clubcommunicatie niet te verdwijnen in een drukke chat.

## 25. Organization channels

Voorbeelden:
- Algemeen;
- Hardlopen;
- Powerlifting;
- Team 1;
- Trainers;
- Locatie Utrecht.

Channel creation/moderation is rolgebaseerd. Member kan niet standaard organisatiebrede kanalen maken.

## 26. Moderation en safety

Omdat Samen een messaging/social platform wordt, zijn minimaal nodig:
- block;
- report;
- mute;
- content deletion rules;
- moderator/admin roles;
- abuse handling;
- auditability van privileged moderation;
- rate limiting/spam protection;
- veilige notificatiepreviews;
- account/deletion/exportgedrag.

Organisatie-admin mag niet automatisch privé 1-op-1 berichten tussen leden lezen. Eventuele moderation/access uitzonderingen moeten expliciet, juridisch en technisch worden ontworpen; geen verborgen superuser-inbox.

## 27. Notifications

Eén centrale notification engine voor:
- nieuw bericht;
- mention;
- comment/reaction;
- connection request;
- challenge update;
- team event;
- availability reminder;
- team task;
- gym announcement;
- group invite.

Gebruiker kan per categorie/gesprek/team/gym muten waar passend. Kritieke account/securitymeldingen blijven apart.

## 28. Search

Target search kan over toegestane objecten zoeken:
- mensen;
- groepen;
- teams;
- gyms/clubs;
- gesprekken;
- challenges.

Searchresultaten respecteren privacy en membership. Geen directory-lek van verborgen gebruikers of private organisaties.

## 29. Multi-organization / multi-team

Een athlete kan lid zijn van meerdere gyms, clubs, groepen en teams. Geen globale `gym_id`-aanname in target UX/data. Actieve organisatiecontext kan worden gekozen zonder persoonlijke Trainingskompas-context kwijt te raken.

## 30. Entitlements

Social basis, team en Gym/Club kunnen verschillende commerciële entitlements krijgen, maar entitlement omzeilt nooit authorization/privacy.

Voorbeeld:
- Free/Premium athlete;
- Team capability;
- Gym/Club organization plan.

Exacte paywall/prijzen blijven product-ownerbeslissing.

## 31. Data ownership en vertrek

Bij verlaten team/gym:
- persoonlijke athlete account blijft bestaan;
- persoonlijke trainingshistorie blijft volgens data ownership/consent;
- organisatie-private content blijft organisatiecontext;
- toegang tot team/gym chats/kanalen stopt volgens policy;
- gedeelde objecten volgen expliciete retention/deletionregels;
- scopes/roles worden ingetrokken.

Geen organisatie mag via membership persoonlijke athlete-data `overnemen`.

## 32. Auditability

Auditlog voor privileged acties zoals:
- branding gewijzigd;
- rol toegekend/ingetrokken;
- lid toegevoegd/verwijderd;
- channel aangemaakt/verwijderd;
- announcement gepubliceerd;
- team staff gewijzigd;
- organization settings gewijzigd.

Gewone privéchat is geen admin auditfeed.

## 33. Offline/realtime

Messaging is idealiter realtime wanneer online. Architectuur moet tijdelijke offline toestand aankunnen:
- pending/sent/failed;
- idempotente retry;
- geen dubbele berichten;
- volgorde/conflictstrategie;
- unread state synchronisatie.

Teamplanning en reeds beschikbare events moeten waar mogelijk leesbaar blijven volgens algemene offlinearchitectuur.

## 34. Samen versus Coach

Menselijke Coach/PT communicatie blijft functioneel onder Coach, maar gebruikt technisch dezelfde veilige messaging capability. De UI-context bepaalt waar gesprek verschijnt.

Dus:
- messaging engine = gedeeld;
- Coach conversation = Coach-context;
- friend/group/team/gym conversations = Samen-context.

Geen twee onafhankelijke chat-engines bouwen.

## 35. Samen versus Vandaag

Vandaag mag samenvatten:
- ongelezen belangrijk teambericht;
- event vandaag;
- teamtaak;
- belangrijke gym announcement;
- challenge status.

Samen blijft de volledige bestemming. Home/Vandaag bevat geen tweede social database/logica.

## 36. Minimum target voor functionele volwassenheid >=9

Voor Samen/Social:
- identity/profile/privacy;
- connections;
- direct/group messaging;
- feed/share controls;
- block/report/moderation;
- notifications;
- groups/challenges;
- search/privacy-safe discovery;
- deletion/export/retention;
- offline/retry/realtime gedrag waar relevant.

Voor Team:
- team membership/roles;
- teamchat;
- planning/events;
- availability;
- attendance;
- tasks/materials;
- notifications;
- privacy/RLS;
- end-to-end normal user UI.

Voor Gym/Club:
- canonical organization model;
- organization roles;
- privileged branding/config;
- branded member layer;
- locations;
- member/staff management;
- communication/announcements;
- team/group/program integration;
- auditlog;
- multi-tenant RLS;
- no member branding privilege by default;
- no arbitrary custom code injection;
- migration away from legacy gym UI/data assumptions.

## 37. UX-regel

Dit document definieert functionaliteit en architectuur, niet definitieve schermvormgeving. Na functionele targetarchitectuur volgt per scherm een concreet voorbeeld/mock-up ter goedkeuring door product owner vóór implementatie.
