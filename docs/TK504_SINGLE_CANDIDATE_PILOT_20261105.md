# TK504 — Eerste van 356: privépilot TK-000227

Datum: 5 november 2026. Canonieke oefening: TK-000227 (MoveKit, `90-90-hip-switches`).

## Bevinding op basis van de daadwerkelijke bestanden

- De originele leveranciersnaam is `90/90 Hip Switches`. Het bronpatroon luidt `Mobility`, primaire leveranciersspier `Glutes`, materiaal `Bodyweight`, moeilijkheid `beginner`.
- De Nederlandse naam `90/90 heupwissels`, beschrijving, zes uitvoeringstappen en vier foutsignalen zijn **draftvertalingen** uit de private, bestaande 582-vertalingenverzameling. Geen publicatie of copy/paste van gelicentieerde detailinhoud in Git.
- De eerdere AI-inhoudscontrole vermeldt `NO_OBVIOUS_ISSUE`. De oorspronkelijke classificatielog vermeldde `NO_BASELINE_MATCH`, `PENDING` en `NOT_PUBLISHED`. **Update 5 november 2026:** de eigenaar heeft de getoonde Nederlandse inhoud, mobiliteitsclassificatie en proef-UX expliciet goedgekeurd in de chat. Dit is apart vastgelegd en geldt niet als vrijgave van mediarechten of productie.
- De technische proef stelt `mobility` als aanvankelijk voorgestelde en **inmiddels door de eigenaar voor deze ene oefening goedgekeurde taxonomie** in, alleen binnen een tijdelijk gegenereerd lokaal HTML-exemplaar. De actuele productiecatalogus blijft 226 oefeningen bevatten; de andere 355 zijn niet aangeraakt.
- V2 video: 3.592.023 bytes, lokale SHA-256 `5609ac513f9ad7576ba3730bdfd47c5a294beb164909a7ff0b9de643b6202b12`. De WebP-poster heeft 17.578 bytes, lokale SHA-256 `cc006e005c3916ce2d475253f6586f25fc2501096e01ab33e05e08a8422016aa`.

## Technische uitvoering

- `tools/tk504_single_candidate_private_pilot.py` bouwt een **privé-kopie van de werkelijke Trainingskompas index.html**, voegt één `_review.status=NOT_PUBLISHED`-record toe **aan de bestaande `EX_CATALOG`** en werkt vervolgens met de bestaande `ExerciseCatalogService` en `ExerciseAssetProvider`. De media-provider leest een extra, tijdelijk toegevoegde manifestregel; er is geen tweede oefenengine.
- De localhost-server is uitsluitend gebonden aan `127.0.0.1:18777`. Hij leest één originele MP4 en één WebP rechtstreeks uit de geautoriseerde private mappen. Er worden geen gelicentieerde mediabytes naar de repository, Netlify of productie-Supabase gekopieerd.
- Het lokale proefscherm laat alleen zoeken, videoweergave, Nederlandse uitleg en technisch bewijs toe; een modal bedekt de onderliggende app en heeft geen sluitknop of bediening om een niet-gepubliceerde training te loggen. De originele 226-record catalogus en alle bestaande trainingshistorie blijven onaangetast.
- De server weigert elk ander video-/posterpad en `/sw.js` met 404. Geen cache of download-vrijgave naar het netwerk; de server luistert niet op LAN/WAN.

## Reproduceerbare tests

- Lokale echte browser (`Microsoft Edge/Chromium`): ECS `catalog_count=227`, zoekresultaat `90/90 heupwissels`, `TK-000227` via beide bestaande centrale services, `PILOT_RESULT.ok=true`.
- Lokale HTTP Range met `bytes=1024-2047`: **HTTP 206**, 1.024 bytes, `Content-Range: bytes 1024-2047/3592023`. Andersoortig videoverzoek: **HTTP 404**; onnodige SW: **HTTP 404**; poster: **HTTP 200**.
- Echte browserautomatisering via CDP (`tools/tk504_pilot_cdp_qa.mjs`): `video.loaded=true`, `seeked=true`, `played=true`, lengte 6,33 s, seekpositie 3,42 s, daarna +0,71 s actieve afspeeltijd; resolutie 1936×1072, `readyState=4`, errorcode null.
- Visuele schermafbeelding op de private PC bekeken: video, poster-in-speler, Nederlandstalige beschrijving, stappen en fouten zichtbaar. Daarna dubbele poster en dubbele stapnummering hersteld; visuele hertest geslaagd.
- `tools/test_movekit_tk504_single_candidate_private_pilot.py`: 10 synthetische controles PASS, onder andere foute sha, verkeerde identiteit, goedkeuringclaims, publieksrelease en onveilige bestandslocatie.
- De bestaande automatisering `core/tk504GoldenCrosswalk.test.js` bewijst 226 bestaande + 356 ongepubliceerde identities; PR #602 blijft Draft.

## Bewijs en gebruik

- Op de geautoriseerde ontwikkel-pc, zolang de lokale testserver actief is: `http://127.0.0.1:18777/`. Op telefoon of een andere pc is deze loopback-URL bewust **niet** bereikbaar.
- Private schermafbeeldingen en de gegenereerde 227-record app blijven uitsluitend onder de PC-map `.tk-private-review/TK504-PILOT-227-LOCAL/`; dit is geen publiek artifact.
- Als de lokale server is gestopt, kan hij met de in de tool gedocumenteerde parameters opnieuw worden gestart. Er zijn geen testaccountgegevens of persoonlijke geheimen in het code-artefact.

## Nog niet klaar voor live uitvoering

Technisch is de eerste video **geschikt als lokale Trainingskompas-proef** en de eigenaar heeft op **5 november 2026** de zichtbare Nederlandse teksten, de voorgestelde mobiliteitsindeling en de lokale proefweergave goedgekeurd. Deze beslissing staat in `docs/generated/MOVEKIT_V2_OWNER_CONTENT_APPROVAL_TK_000227_20261105.json`. Voor productie blijven vereist: beoordeling van nog niet getoonde velden; formele enkele-item release-autoriteit; licentie-/mediarechten en echte server-side gebruikersgrant; gecontroleerde Netlify/Supabase private signed-video-delivery; Android/WebView en echte accountacceptatie; gecontroleerde verwijdering van oude openbare videopaden. Er is nu **geen oefening gepubliceerd, geen database veranderd, geen nieuwe APK gemaakt**.
