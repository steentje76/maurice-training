# MS-F9-03_SHARING_MODERATION_NOTIFICATIONS.md — Trainingskompas

**Canonieke naam/acceptance:** "Sharing, Moderation & Notifications" -- "Safe interaction layer." P2, dependency MS-F9-01 (CLOSED).

## Sharing
SocialSharingCore: een gedeelde activiteit is uitsluitend een referentie naar training_instances + een expliciete presentatiewhitelist. Geen kopie van het volledige trainingsrecord, geen tweede waarheid.

Kritieke, live geverifieerde garantie: block wint altijd, ook over visibility='public'. Live bevestigd: een geblokkeerde gebruiker kreeg 0 rijen bij een poging een publieke gedeelde activiteit van de blocker te lezen.

Sharing is expliciet: geen automatische publicatie, de atleet kiest bewust per activiteit.

## Notifications
Minimaal model: recipient_id, event_type, actor_id, target_type/id, read_at -- geen sensitive content-snapshot.

Kritieke, live geverifieerde garantie: een gewone geauthenticeerde gebruiker kan geen notificatie forgeren. Expliciet geen insert-policy voor authenticated (uitsluitend service_role). Live bevestigd.

## Moderation
Hergebruikt social_reports uit MS-F9-01 (geen tweede reportmodel). Report-lifecycle-beheer blijft DEFERRED -- geen aparte moderator-rol/architectuur binnen deze sprint.

## Eerlijke scope-beperkingen
- Native push/e-mail-infrastructuur niet gebouwd -- uitsluitend in-app notificatie-architectuur is IMPLEMENTED.
- Reactions/comments niet gebouwd: de letterlijke acceptance gate vereist dit niet, extra UGC-oppervlak zou onnodige abuse-vectoren toevoegen.
- Moderatie-lifecycle-beheer blijft DEFERRED.

## Genuine bevinding en fix: valse-positief in core/fFase2.test.js
De bestaande test D2 scande het hele migratiebestand zodra het ergens "training_instances" bevatte, ongeacht welke tabel een specifieke status-regel betrof. migratie_v506.sql bevat zowel een training_instances-foreign-key als een onverwante social_connections.status-vergelijking -- de test sloeg ten onrechte alarm.

Fix (geen verzwakking): verfijnd naar statement-niveau matching. Sabotagebewijs: een echte ongeldige training_instances-status werd nog steeds correct gedetecteerd.

## Tests
core/fSocialSharingCore.test.js (23/23), core/fSocialSharingRls.test.js (8/8). Beide met sabotagebewijs. core/fFase2.test.js gerepareerd en herbevestigd (36/36).

## MS-F9-03 acceptance-gate-toetsing
Letterlijke acceptance gate: "Safe interaction layer."
Resultaat: CLOSED. Sharing, notificaties en moderatie vormen samen een veilige interactielaag. Geen onnodige UGC-scope-uitbreiding.
