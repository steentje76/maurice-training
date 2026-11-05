# TK504 — Eerste herhaalbare MoveKit-importbatch (25 records)

**Datum:** 5 november 2026. **Repository:** `steentje76/maurice-training`. **Status:** lokale integratie en browseracceptatie geslaagd; geen productiepublicatie.

## Waarom

De gebruiker gaf aan na de één-op-één-proef nog geen vooruitgang in Trainingskompas te zien en verzocht om import in batches van 25, end-to-end. Daarom is de bestaande **echte** trainingsapp als 25-item lokale beoordelingsweergave opgebouwd, niet als een alternatieve exercise engine of nieuwe productie-oefenbibliotheek.

## Batch 01 — `TK-000227` t/m `TK-000251`

- Exact **25** opeenvolgende unieke canonieke IDs, gekoppeld via `source.provider_id` en Golden V2-inventaris.
- Originele MP4's: **25/25 SHA-256 + bytecount PASS** tegen de Golden V2-inventaris.
- Geoptimaliseerde WebP-posters: **25/25 SHA-256 + bytecount PASS** tegen de poster-inventaris.
- Dutch translation-zip: 25/25 tijdelijke, niet-gepubliceerde naam, omschrijving, stappen en foutnotities; bron- en vertaalteksten blijven in een afgeschermde lokale werkmap. Niet via Git gepubliceerd.
- `TK-000227` (90/90 heupwissels) heeft expliciete **eigenaar-contentgoedkeuring**, niet de server-signing/production release. De overige **24** staan op `NOT_PUBLISHED`, `trainable=false`, `selectable=false`, classificatie als AI-voorstel.
- De HTML-ontwikkelkopie voegt 25 records toe aan dezelfde `EX_CATALOG`-bron (lokale ECS-telling **251**). `ExerciseCatalogService` en `ExerciseAssetProvider` leveren de echte catalogus-/video-/poster-resolutie. De bestaande 226 records, training builder, execution en user logs worden niet gewijzigd.
- UI: één lokaal adres `http://127.0.0.1:18777/`, 25 zoekbare oefenkaarten met aparte posters, een detailspeler en uitvoerings- en foutnotities, plus goedkeuringsstatus.

## Uitvoering / verificatie

- Generiek programma: `tools/tk504_private_review_batch.py` met `--start 227 --count 25` en de bestaande private stage, Golden inventory, poster digests en NL translations. **Alleen 127.0.0.1**; geen productie-credentials, geen Netlify-deploy, geen Supabase-write, geen APK.
- In deze sessie het oude 1-item proefproces op poort 18777 gecontroleerd gestopt en vervangen door het nieuwe 25-item proces. HTTP **200** op hetzelfde adres als de reeds geopende browser.
- Eerste echte Edge/Chromium-controlerun: `BATCH25_AUDIT.ok=true`, **25/25** records via bestaande ECS en provider, precies **1 eigenaar-goedgekeurd / 24 concept**, catalogus **251**, en alle 25 Nederlandse namen vindbaar.
- Visueel gerenderde screenshot op de geautoriseerde ontwikkel-pc gecontroleerd: 25 onderscheiden kaarten/posters, goedkeuringsbadges, video, stappen en aandachtspunten daadwerkelijk zichtbaar. Private screenshot en gerenderde HTML worden niet in Git gecommit.
- Onafhankelijke CDP-browsertest (`tools/tk504_batch25_cdp_qa.mjs`): kaartwissel, zoeken, selectie en echte HTML5-video's **TK-000227, TK-000238 en TK-000251** loaded/seeked/played, respectievelijk circa +0,42 / +0,43 / +0,43 seconde voortgang na seek; alle drie 1936×1072, nul video-errors.
- HTTP-acceptatie: **25/25** video-endpoints `Range: bytes=128-255` gaven `206 Partial Content` met exact 128 bytes en correct Content-Range; **25/25** poster-HEAD-verzoeken gaven HTTP 200 `image/webp`; **5/5** niet-toegestane routes gaven HTTP 404.
- Synthetische regressies (`tools/test_movekit_tk504_batch25_import.py`): **15 tests**, plus eerdere MoveKit Python-tests **34/34 groen**. Tests eisen onder meer exacte provideridentiteit, geen publicatie, nul mediahash-afwijkingen, output uitsluitend onder `.tk-private-review`, en HTML/JS-escaping van onbetrouwbare omschrijving.

## Veiligheids- en releasegrenzen

Dit is **end-to-end voor lokale import, catalogusindex, afbeelden, zoeken, video, Range/seek en browserweergave**. Het is **niet** end-to-end voor een live account, gevalideerde Supabase-entitlement, Android-acceptatie of productieverwerking van trainingslogs. De oorspronkelijke productiecatalogus in Git blijft op 226; `MOVEKIT_V2_RELEASE_GATES.json` blijft geblokkeerd en `TK504_PRIVATE_MEDIA_RELEASE=false` in app. De overige 331 Movekit-kandidaten zijn ook nog niet gepubliceerd.

Het tijdelijke ontwikkelproces levert via loopback directe URL's uit de geautoriseerde privébron voor functionele QA. De URLs zijn **niet toegestaan als productie-deliverymechanisme** en zijn vanaf een andere machine niet bereikbaar. Bij een volgende fase moeten officiële signing-broker, licentie-, entitlement- en Android-controles voldaan zijn, en oude openbare media veilig worden verwijderd.

## Volgende stappen

1. Laat de gebruiker de 25 kaarten en video's via `http://127.0.0.1:18777/` beoordelen. Alleen de eerste heeft eigenaar-contentgoedkeuring; de 24 concepten moeten inhoudelijk per oefening worden afgevinkt.
2. Veralgemeniseer de batchgenerator voor batch 02 (`TK-000252..TK-000276`) en de verdere 25-groepen, met een laatste resterende groep van 6; behoud telkens de `NOT_PUBLISHED`-grens en broncontroles.
3. Voer parallel de oorspronkelijke private media-/226-cutovergates uit in draft PR #602 zonder premature productiepublicatie. Na security en Android-proef kunnen één voor één goedgekeurde oefeningen gecontroleerd live.
