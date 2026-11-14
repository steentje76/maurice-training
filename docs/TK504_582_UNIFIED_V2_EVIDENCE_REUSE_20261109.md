# TK504 — Eén V2-mediaroute voor 582 MoveKit-oefeningen; hergebruik van testbewijs
Datum: 2026-11-09. Status: **DRAFT / NIET PRODUCTIEVRIJGEGEVEN**. PR #628; issue #504 en #614.

## Besluit
De oorspronkelijke TK-000001..TK-000226 worden uitsluitend naar **de bestaande beschermde V2-route van TK-000227..TK-000582** omgezet: ExerciseAssetProvider → TK504ProtectedPlayback → exercise-media-v2-url → private Supabase Storage. Geen tweede broker/catalogus/videospeler/sessieschrijver, geen publieke MP4 fallback. Canonieke IDs en trainingshistorie blijven intact.

De PR #628 zorgt alleen dat alle 582 IDs in de client dezelfde V2-route kiezen. **De live server weigert TK-000001..226 nog steeds expliciet met 404 MEDIA_NOT_APPROVED.** Een merge zonder serverautorisatie zou de bestaande 226-videoafspeelroute onderbreken: dus GEEN merge/deploy/APK.

## Bestaand bewijs — NIET opnieuw testen zonder relevante codewijziging
| Bewijs | Reeds vastgelegd | Hergebruik |
|---|---|---|
| #595 (3 nov) | 16 provider-compatibiliteit, 29 V1-resolver, 17 identiteit en 29 bridge-assertions; 226 behoud, scope-guards | Opnieuw uitvoeren alleen als provider-/broncontract verandert |
| #602 (5–6 nov) | 582/582 video+posterobjecten en broker/client-/signed-url-/UI-regressies op staged code; 356 batchinhoud geaccordeerd, mediarechten niet | Geen nieuwe full-suite van dezelfde cases |
| #604 (6 nov) | Catalogus/persoonlijke TK-ID botsing en echte pickerprovenance gericht gecontroleerd | Geen nieuwe FK-shadow-tests zonder wijziging in picker/logging |
| #607 (7 nov) | 380 lokale echte auth/DB/RLS-scenario's, 171 broker- en 188 ECS/runtime-assertions; volledige suite 500 tests gerapporteerd | Niet herhalen voor ongewijzigde modules |
| #623–#626 (9 nov) | Successieve gates 519, 520, 521 en 522; #626 545 checks bewijzen dat de bestaande broker ook originele 226 kan tekenen wanneer de ENIGE hardblock in een test-VM wordt weggelaten. De productiehandler is ongewijzigd en weigert ze. | Dit technische haalbaarheidsbewijs is afgesloten; geen tweede proof-of-concept |
| #504 commentaren (9 nov) | Alle 226 V2-MP4 en 226 WebP lokaal in echte Chrome gedecodeerd/seek; 452/452 bron-SHA, cloudmetadata/size/MIME + ETag-pariteit; A70 mobiel web/legacy MP4 getest, NIET private V2 of Capacitor | Reeds bewezen lokale decode en objectmetadata niet opnieuw meten |
| #628 (9 nov) | 12 gerichte checks voor uniforme V2-clientroute, 0 nieuwe production releases | Alleen regressie bij wijziging van clientrouting of servervrijgave |

Dit zijn **historische resultaten op vermelde PR's/commits**, geen vrijgavebewijs van een toekomstige gecombineerde release. Bron: GitHub PR's en issue #504.

## Nieuwe live read-only feiten (Supabase, 9 nov 2026)
- Private buckets `exercise-media` en `exercise-posters`: elk 582 objecten; beide `public=false`. Dit is GEEN full-body SHA-verificatie.
- `movekit_catalog_fk_bindings`: originele 226 aanwezig maar 0 actief; nieuwe 356 aanwezig en 356 actief.
- `movekit_v2_catalog_publications`: 356 records met status `published`; geen originele 226-records.
- `movekit_media_grants`: 5 actieve records in scope `movekit_v2` volgens de huidige activiteits-/vervalfilter. De telling bewijst niet dat originele 226 voor deze accounts zijn vrijgegeven; geen identiteitgegevens opgevraagd.
- Geen SQL-write of wijziging in credentials, storage, gebruikerdata of deployment uitgevoerd.

## Alleen nog openstaande, werkelijk nieuwe verificatie en besluiten
1. **452 live cloudobject-body SHA256** (226 MP4 + 226 WebP) met bestaande `tools/tk504_private_storage_byte_sha_verify.cjs --live`, een passend beveiligd read-only credential, schriftelijk autorisatiemoment en aggregaatrapport. Eerdere lokale bron-SHA/ETag is sterk bewijs maar niet gelijk aan live body-SHA. Deze eenmalige byte-integriteitsmeting is géén herhaling van de synthetische tests. Nog **NIET uitgevoerd**.
2. Afzonderlijk, cryptografisch **owner-signed MEDIA-releasebesluit en cloudbyte-attest** voor de originele 226; een FK-goedkeuring of de 356-batchgoedkeuring is niet voldoende.
3. Serverzijdige original-226-publicaties, getypeerde FK B_ACTIVATE en aantoonbaar passende account/mediagrants, inclusief eigendom en rollback. Live huidige stand: 226 inactive / 0 originele publicaties. Geen massale data-/migratiewrites zonder review.
4. Alleen na geautoriseerde servervrijgave: beperkte echte **signed private** web- en Samsung Android/Capacitor-proef (auth, 206 Range/seek, TTL, logout/revoke, poster). De reeds uitgevoerde A70-test betrof alleen web en één openbare legacy-video.
5. Gecoördineerde afsluiting van openbare Netlify `/videos/*`, V1-serviceworker-cache en open Git-geschiedenis/zichtbaarheid. De oude 226 staan nog publiek; niet voortijdig verwijderen en geen onveilige URL-omweg gebruiken.

## Voorkom nieuwe testloop
- **NO DUPLICATE RUNS**: hergebruik PR #595/#602/#604/#607/#623–#628 + issue #504 met exact commit-/omgevinglabel.
- Test alleen nieuw gedrag of daadwerkelijk gewijzigde modules; maximaal een kleine, gemotiveerde smoke-set per change. Geen honderden synthetische assertions opnieuw genereren.
- Voor definitieve productie-merge geldt een gerichte onafhankelijke beveiligingsreview en releasegates van de feitelijke geïntegreerde SHA. Dit vervangt geen noodzakelijke echte autorisatie- en apparaatacceptatie.
- Publiceren, grants, 226-serverhardblock verwijderen, raw-media verwijderen, main-merge en APK blijven **HOLD** totdat alle bovenstaande echte releasevoorwaarden zijn voldaan.
