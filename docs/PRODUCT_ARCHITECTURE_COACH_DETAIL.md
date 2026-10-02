# Trainingskompas Target Product Architecture — Coach Detail

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** targetfunctionaliteit voor AI Coach en menselijke Coach/PT. Geen bewijs dat alle beschreven functionaliteit al gebouwd is.

## 1. Kernbeslissing

`Coach` is één primaire productbestemming met twee duidelijk verschillende rollen:

- AI Coach
- Menselijke Coach/PT

De gebruiker mag nooit hoeven raden of een advies door AI, een expliciete regel of een mens is gegeven. Afzender en bron zijn altijd zichtbaar.

## 2. Targetstructuur

COACH
- Overzicht
- AI Coach
- Mijn coach / coaches
- Programma's & opdrachten
- Feedback
- Berichten
- Delen & toestemming
- Coachhistorie

Als een gebruiker geen menselijke coach heeft, blijven de menselijke onderdelen rustig/inactief en domineert AI Coach. Bij een gekoppelde coach worden relevante onderdelen zichtbaar zonder een tweede app te creëren.

## 3. AI Coach

AI Coach is de communicatie- en interpretatielaag boven bestaande berekende en toegestane informatie.

AI Coach mag:
- berekende uitkomsten samenvatten;
- verbanden tussen reeds berekende metrics uitleggen;
- context uit sport, doel, programma, fase en recente historie gebruiken;
- onzekerheid/data quality/confidence communiceren;
- binnen expliciete Decision Rules toegestane opties uitleggen;
- gebruiker helpen informatie in Trainingskompas te vinden en begrijpen.

AI Coach mag niet:
- onderliggende numerieke waarden opnieuw berekenen;
- ontbrekende data verzinnen;
- nieuwe trainingsregels creëren;
- buiten de Decision Engine zelfstandig een programma herschrijven;
- medische diagnose stellen;
- correlatie als causaliteit presenteren;
- zichzelf voordoen als menselijke coach;
- zonder toestemming gevoelige data delen.

## 4. AI Coach context contract

De gewenste keten is:

RAW DATA -> Calculation -> Context -> Decision -> Evidence/Provenance/Confidence -> AI Coach -> Athlete

AI ontvangt waar mogelijk een gestructureerd contextpakket met:
- athlete context;
- actieve sporten;
- doelen;
- programma/fase;
- geplande training;
- relevante berekende performance metrics;
- herstel/readiness-uitkomsten;
- relevante Decision-uitkomsten en toegestane opties;
- evidence/provenance/confidence;
- expliciete missing-data-status;
- privacy/scopes.

AI krijgt niet automatisch onbeperkte toegang tot alle ruwe persoonsgegevens wanneer die niet nodig zijn voor de vraag.

## 5. AI Coach gesprekken

Targetfuncties:
- nieuwe chat;
- gesprekshistorie;
- contextueel gesprek vanaf training, activiteit, programma of insight;
- duidelijke broncontext zoals `Over deze training`;
- voorgestelde vervolgvragen;
- verwijzing naar relevante appfunctie;
- feedback op antwoord;
- verwijderen van gesprek waar product/privacybeleid dat vereist.

Een chat vanuit een specifieke activiteit krijgt een expliciete contextreferentie, zodat de AI niet hoeft te gokken over welke activiteit de gebruiker praat.

## 6. Explainability

Bij adviezen moet de gebruiker kunnen begrijpen waarop een antwoord rust. Waar relevant kan een uitklapbare sectie tonen:
- gebruikte signalen;
- Decision Rule/regelcategorie;
- confidence;
- ontbrekende data;
- evidence status;
- relevante brondata/provenance op gebruikersniveau.

De normale interface blijft begrijpelijk; technische IDs hoeven niet standaard zichtbaar te zijn.

## 7. Menselijke Coach/PT

Menselijke Coach/PT is een afzonderlijke rol boven dezelfde athlete-, training-, program- en analytics-objecten. Geen aparte kopie van trainingsdata.

Target athlete-side:
- coachprofiel;
- coachrelatie/status;
- toegewezen programma's;
- toegewezen workouts;
- feedback van coach;
- berichten;
- aankomende coachafspraken waar van toepassing;
- gedeelde data/scopes;
- relatie beëindigen/intrekken.

Target coach-side:
- athlete roster;
- athlete summary;
- planning;
- programma's/templates;
- workouts toewijzen;
- uitvoering/adherence bekijken;
- feedback/notities;
- berichten;
- alerts/signalen uitsluitend binnen toegestane scopes;
- consent/scope-status;
- eigen coachprofiel.

## 8. Coachrelatie

Een coachrelatie is expliciet en statusgedreven, bijvoorbeeld:
- INVITED
- REQUESTED
- ACTIVE
- PAUSED
- ENDED
- REVOKED

De relatie moet owner/athlete-safe zijn en mag geen impliciete toegang creëren door alleen dezelfde gym/team/org te delen.

## 9. Consent en datascopes

Menselijke coach krijgt alleen gegevens waarvoor de sporter expliciete toegang heeft verleend of waarvoor een strikt legitiem productrecht bestaat.

Scopes kunnen minimaal onderscheiden:
- profiel/sportdoelen;
- trainingsplanning;
- workoutresultaten;
- activity/performance;
- herstel/readiness;
- HRV/slaap;
- lichaamsmetingen;
- voeding;
- Women's Performance;
- routes/locatie;
- notities.

Gevoelige scopes zoals HRV/slaap, Women's Performance, lichaamsdata, voeding en precieze route/locatie staan niet automatisch aan.

De athlete moet kunnen zien: `Mijn coach kan momenteel zien: ...` en scopes kunnen intrekken. Intrekken beïnvloedt toekomstige toegang; audit-/juridische bewaarplichten moeten afzonderlijk worden ontworpen.

## 10. Programma's en assignments

Coach kan een bestaand template gebruiken of een athlete-specifiek programma toewijzen.

Assignment bevat minimaal:
- coach;
- athlete;
- program/workout;
- start/einddatum;
- planning;
- wijzigingsrechten;
- status;
- versie;
- feedbackcontext.

Athlete-side moet duidelijk zijn dat iets `Toegewezen door [coach]` is.

Rechten kunnen omvatten:
- athlete_can_move;
- athlete_can_skip;
- athlete_can_edit_workout;
- coach_approval_required_for_change.

De uiteindelijke rechten worden productbeslissingen en moeten server-side worden afgedwongen, niet alleen via verborgen knoppen.

## 11. Feedback versus coachnotities

Twee concepten strikt scheiden:

**Feedback aan athlete**
- zichtbaar voor athlete;
- gekoppeld aan workout/activity/program/periode;
- kan tekst en later gestructureerde feedback bevatten.

**Private coach note**
- alleen als expliciet productonderdeel goedgekeurd;
- niet automatisch zichtbaar voor athlete;
- eigen privacy/retentie/exportbeleid vereist;
- nooit gebruiken als verborgen beslisbron voor athlete-facing AI zonder expliciete governance.

Coach feedback/notes zijn in de huidige targetarchitectuur nog productfunctionaliteit die expliciet gebouwd moet worden; backendrelatie alleen betekent niet dat dit bestaat.

## 12. Berichten

Human coach messaging is conceptueel verschillend van AI-chat.

Berichten kunnen gekoppeld worden aan:
- algemeen gesprek;
- workout;
- activiteit;
- programma;
- planning/event.

Afzender is altijd ondubbelzinnig `AI Coach` of de naam/avatar van de menselijke coach.

Voor v1 kan messaging eenvoudiger starten dan een volledige WhatsApp-achtige chat; attachments, voice, video en realtime presence zijn geen noodzakelijke baseline tenzij later besloten.

## 13. Coach feedbackloop rond training

Targetketen:

Coach assigns workout/program
-> athlete sees planning
-> athlete executes
-> result logged once in canonical history
-> calculations/insights update
-> coach sees allowed result
-> coach gives feedback
-> athlete receives notification
-> feedback remains attached to canonical object

Geen dubbele coach-database met kopieën van resultaten.

## 14. AI + menselijke coach samen

AI mag een menselijke coach ondersteunen maar niet vervangen of woorden aan de coach toeschrijven.

Voorbeelden van veilige samenwerking:
- AI vat athlete-data samen voor coach binnen scopes;
- AI helpt coach een concepttekst formuleren;
- AI legt athlete uit wat een coach-assignment inhoudt;
- AI kan feitelijke verschillen tussen gepland en uitgevoerd samenvatten.

Niet toegestaan zonder expliciete menselijke actie:
- AI verzendt bericht alsof het van coach komt;
- AI wijzigt coachprogramma namens coach;
- AI keurt athlete-wijziging namens coach goed;
- AI claimt dat coach iets adviseert wat coach niet heeft gezegd.

AI-generated concepten worden als concept gemarkeerd totdat de menselijke coach ze verzendt/bevestigt.

## 15. Notifications

Voorbeelden:
- nieuw programma toegewezen;
- workout aangepast;
- feedback ontvangen;
- coachbericht;
- coachrelatieverzoek;
- toestemming/scope gewijzigd;
- afspraak gewijzigd.

Notificaties tonen geen gevoelige inhoud op lockscreen/push wanneer privacy-instellingen dit niet toestaan.

## 16. Coachprofiel

Menselijke coach kan een profiel hebben met:
- profielfoto/avatar;
- naam;
- bio;
- specialisaties;
- sporten;
- kwalificaties alleen als verificatiemodel bestaat;
- organisatie/gym indien relevant;
- beschikbaarheid/contactopties volgens productkeuze.

Geen ongeverifieerde kwalificaties als `geverifieerd` presenteren.

## 17. Coach dashboard / roster

Coach ziet niet alle athlete-data tegelijk. Target roster-card bevat compacte, toegestane informatie zoals:
- athlete naam/avatar;
- actieve programma/status;
- eerstvolgende geplande sessie;
- recente adherence;
- relevante alerts uitsluitend als regels/scopes dat toestaan;
- laatste feedback/berichtstatus.

Doorklikken opent athlete detail met tabbladen voor Planning, Programma, Resultaten, Inzicht, Feedback en Delen/Consent afhankelijk van rechten.

## 18. Multi-coach

Architectuur moet meerdere coaches per athlete niet blokkeren. Bijvoorbeeld strength coach + running coach. Scopes en assignments zijn per relatie, niet globaal `coach=true`.

Er kan later een primary coach-concept komen, maar dit mag andere relaties niet automatisch dezelfde rechten geven.

## 19. Coach versus Team Coach versus Gym Staff

Rollen niet gelijkstellen:
- persoonlijke Coach/PT: individuele athlete-relatie;
- Team Coach: teamrol en team-events/roster;
- Gym Staff: organisatie-/locatierol;

Eén persoon kan meerdere rollen hebben, maar autorisatie komt uit de actieve relatie/context. Teamlidmaatschap geeft niet automatisch toegang tot privé-hersteldata.

## 20. Entitlements

Coach Pro/paid coachfunctionaliteit blijft een afzonderlijke commerciële productbeslissing. Autorisatie en entitlement zijn verschillende dingen:
- authorization: mag deze coach deze athlete-data zien?
- entitlement: bevat het abonnement deze feature?

Beide moeten slagen. Een betaald plan mag nooit privacy/RLS omzeilen.

## 21. Auditability

Gevoelige coachacties moeten waar passend auditbaar zijn:
- relatie gestart/beëindigd;
- scope verleend/ingetrokken;
- programma toegewezen/aangepast;
- feedback geplaatst;
- gevoelige gegevens geraadpleegd indien auditbeleid dat vereist.

Auditlog is geen gebruikersfeed en mag niet stil door AI worden herschreven.

## 22. Offline en conflicts

Athlete moet een reeds lokaal beschikbare toegewezen workout kunnen uitvoeren wanneer offline-support dit toelaat. Bij sync:
- canonical IDs behouden;
- geen dubbele execution;
- wijzigingen/conflicten expliciet afhandelen;
- coachwijziging tijdens offline uitvoering mag een reeds uitgevoerde sessie niet retroactief herschrijven.

## 23. Coach Home versus primaire Coach-tab

`Vandaag` mag relevante coachitems samenvatten, bijvoorbeeld nieuwe feedback of toegewezen training. De primaire `Coach`-bestemming blijft de volledige werkplek. Geen dubbele onafhankelijke logica op Home.

## 24. Minimum target voor functionele volwassenheid >=9

Voor Coach/PT is `backend bestaat` onvoldoende. Minimaal vereist vóór volwassenheidsclaim:
- athlete kan coachrelatie normaal beheren;
- coach kan roster normaal gebruiken;
- assignments/program flow end-to-end;
- athlete uitvoering komt correct terug;
- feedbackflow;
- messaging of expliciet gekozen alternatief;
- consent/scopes zichtbaar en server-side enforced;
- notifications;
- privacy/RLS adversarial tests;
- delete/export/retention gedrag;
- error/empty/offline states waar relevant;
- auditability;
- AI/human sender separation;
- entitlementgedrag zodra commerciële scope is besloten.

## 25. UX-regel voor latere schermfase

Nog geen definitieve schermen bouwen vanuit dit document. Eerst targetfunctionaliteit afronden. Daarna per scherm een concreet voorbeeld/mock-up aan product owner tonen en pas na expliciete goedkeuring implementeren.
