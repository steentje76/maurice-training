# Trainingskompas Target Product Architecture — Activity-bound Groups

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Parent:** `PRODUCT_ARCHITECTURE_TOGETHER_DETAIL.md`

## Productbeslissing

Een groep kan in de gebruikerservaring zowel een permanente sociale verzameling mensen zijn als een tijdelijke/dynamische verzameling deelnemers rond een geplande training, workout of event.

Onderliggend blijven deze concepten gescheiden:

PERMANENT GROUP -> membership -> group feed/chat -> multiple events/workouts

PLANNED WORKOUT / EVENT -> PARTICIPATION -> PARTICIPANTS -> optional CONTEXT CONVERSATION

Inschrijving voor één workout maakt iemand dus niet automatisch permanent lid van de organiserende groep, gym, club of team.

## Permanente groep

Voorbeelden: hardloopgroep, vriendenclub, trainingsgroep, challenge-community. Een permanente groep kan meerdere geplande trainingen/events organiseren en heeft een algemene groepschat/feed.

## Activiteitsgroep / deelnemersgroep

Een geplande workout/event kan een tijdelijke deelnemerscontext vormen, bijvoorbeeld groepsles, hardlooptraining, fietstocht, krachttraining, HYROX-training, teamtraining, clinic, challenge-training of open workout/event.

De gebruikerservaring mag dit als groep deelnemers tonen, maar de canonical bron blijft het geplande workout/event plus participation records.

## Participation

Minimale statussen: INTERESTED optioneel, REGISTERED, WAITLISTED, CANCELLED, ATTENDED en eventueel NO_SHOW.

Een event kan optioneel minimum/maximum deelnemers, registratieperiode/deadline, wachtlijst, cancellation policy en eligibility/membership rules hebben. Automatisch doorschuiven vanaf wachtlijst mag alleen volgens expliciete productregels en met notificatie.

## Planning

Na succesvolle registratie kan het event aan de persoonlijke Trainingskompas-planning worden gekoppeld. Uitschrijven/annuleren synchroniseert de status zonder persoonlijke historie te wissen.

## Deelnemerschat

Een workout/event kan een eigen context conversation hebben. De tijdelijke chat is niet hetzelfde als de permanente groepschat. Een hardloopgroep kan dus één algemene chat hebben en daarnaast afzonderlijke chats voor dinsdag intervals, donderdag easy run en zondag lange duurloop.

## Organisatoren en rechten

Een workout/event kan worden georganiseerd door een individuele athlete, permanente groep, team, coach/PT, Gym/Club/Organization of bevoegde staff member. Publiceren, capaciteit wijzigen, deelnemers beheren en annuleren volgen server-side rollen/rechten. Een gewoon gym-lid krijgt geen organisatiebrede eventbeheerrechten.

## Gym/Club voorbeeld

Een gym kan een workout/groepsles publiceren met trainer, tijd, locatie en capaciteit. Leden kunnen inschrijven; registratie koppelt de activiteit aan hun planning en kan toegang geven tot de deelnemerschat. Gym branding/context wordt toegepast, terwijl dezelfde canonical Planning/Event en Messaging Engines worden gebruikt.

## Open/social workout

Een athlete kan, indien privacy/productinstellingen dit toestaan, een gezamenlijke duurloop of fietstocht plannen en connections/groep uitnodigen. Deelnemers kunnen registreren zonder automatisch een permanente sociale relatie te krijgen.

## Privacy

Deelnemerslijst heeft eigen visibility policy. Registratie deelt nooit automatisch HRV, slaap, Women's Performance, voeding, lichaamsmetingen of volledige trainingshistorie. Route/startlocatie volgt routeprivacy/privacyzones; voor openbare activiteiten kan later als productregel worden gekozen exacte locatie pas na registratie zichtbaar te maken.

## Lifecycle

Na afloop kan het event afgerond worden, attendance worden vastgelegd en individuele executions/results aan het event worden gekoppeld waar toegestaan. De contextchat kan volgens retention policy worden gearchiveerd/read-only. Tijdelijke deelname creëert geen permanent groepslidmaatschap.

## Analytics

Organisator/gym/team analytics mogen feitelijke deelname tonen zoals registrations, attendance, cancellations en capacity utilization binnen privacyregels. Individuele performance/recoverydata wordt niet automatisch organisatieanalytics.

## Canonical relatie

GROUP / TEAM / GYM / ATHLETE (organizer)
-> PLANNED WORKOUT / EVENT
-> PARTICIPATION
-> PARTICIPANTS
-> CONTEXT CONVERSATION
-> EXECUTIONS / ATTENDANCE

Bouw geen afzonderlijk temporary-social-group model dat workout/event/participation dupliceert. Gebruik dezelfde Calendar/Event Engine en Messaging Engine als de rest van Trainingskompas.
