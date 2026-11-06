# TK504 — Eigenaar keurt Movekit batch 01 t/m 15 inhoudelijk goed

**Datum eigenaarbesluit:** 5 november 2026
**Bron:** expliciete ChatGPT-gebruikersinstructie: `ik keur batch 1 tm 15 goed`
**Besluit-ID:** `TK504-20261105-OWNER-BATCHES-01-15`
**Register:** `docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json`
**GitHub:** issue #504, draft-PR #602.

## Exacte reikwijdte

De eigenaar heeft alle **15 aangeboden lokale Movekit-reviewbatches** in één besluit **inhoudelijk goedgekeurd**. Het betreft **14 batches van 25 en één laatste van 6**: canonieke nummers `TK-000227`–`TK-000582`, totaal **356** nieuwe oefeningen. Dit vervangt niet het oudere, afzonderlijk vastgelegde besluit om eerst alleen TK-000227 goed te keuren.

Het besluit betreft uitsluitend de **in de reviewinterface getoonde inhoud**: Nederlandse naam, korte beschrijving, uitvoering, veelgemaakte fouten, zichtbare (AI-voorgestelde) categorie, moeilijkheid en de lokale UX. Dit is een **gezamenlijk inhoudelijk fiat**, **geen bewijs dat ieder van de 356 items afzonderlijk is gelezen, gecontroleerd of ondertekend**. Het vormt geen zelfstandige wetenschappelijke validatie van de categorieën of trainingsclaims. Niet in de review getoonde langbeschrijvingen, benefits, useCases en tags blijven buiten dit besluit.

De approval-sidecar bevat per batch de exacte ID-grenzen en een SHA-256-vingerafdruk van de in de review getoonde velden en provideridentiteit, inclusief één SHA-256-vingerafdruk van alle 356 bij elkaar. **De oorspronkelijke gelicentieerde bronteksten, video's en posters zijn niet in Git opgeslagen.** De Python-validator controleert dat de goedkeuring alleen geldig blijft voor die concrete bron- en vertalingsversies; veranderingen vereisen een nieuwe beoordeling.

## Implementatie in Trainingskompas-review

De bestaande offline importgenerator `tools/tk504_private_review_batch.py` en reviewserver `tools/tk504_private_review_all_batches.py` accepteren optioneel de expliciete `--bulk-approval`-registratie en verifiëren deze eerst. Daarna tonen alle batches de status **Goedgekeurd**.

In elke tijdelijke cataloguskopie blijven de 356 nieuwe oefeningen:
- `_review.status=NOT_PUBLISHED`
- `_review.trainable=false` en `_review.selectable=false`
- `_review.owner_approval_scope=BULK_VISIBLE_CONTENT_ONLY`

De bestaande **226** productiecategorie-items en de trainingshistorie veranderen niet. Het zichtbare lokale overzicht draait op `http://127.0.0.1:18777/` op de geautoriseerde ontwikkel-pc, met navigatie Batch 01–15.

**Verificatie:** 15/15 lokaal bereikbare batchpagina's tonen samen **356/356** goedgekeurde inhoudsrecords en **0** nog ter beoordeling; de generator controleerde opnieuw **712/712** video- en posterbestanden aan de hand van Golden V2 SHA-256 en bytegroottes. De tests controleren positieve en negatieve autorisatiepaden zonder persoonsgegevens te benaderen.

## Uitdrukkelijk niet vrijgegeven

Dit eigenaarbesluit **activeert niet**:

- publicatie van de 356 oefeningen in de live `exercise-catalog.json`;
- het aanmaken van Supabase media-grants of gebruikersrechten;
- het omzetten van `TK504_PRIVATE_MEDIA_RELEASE=false` of de service-worker-cutover;
- de Netlify/Supabase productie-release van signed video-/poster-URL's;
- het opheffen van de historische publieke media of offline caches zonder bewezen cutover;
- Android/WebView-acceptatie, live gebruikerslogging of het genereren van een nieuwe APK;
- acceptatie van onopgeloste projectgateproblemen.

De centrale `MOVEKIT_V2_RELEASE_GATES.json` blijft **`BLOCKED_NOT_REVIEWED` met nul entries** totdat de afzonderlijke technische, media-, licentie- en beveiligingsgates zijn geverifieerd. Inhoudelijke toestemming alleen is **geen** opdracht om te mergen of productie te wijzigen.

## Volgende uitvoeringsstap

Nu de **inhoudelijke gebruikersbeslissing voor de 356 zichtbaar getoonde oefeningen** aanwezig is, verschuift het werk naar de oorspronkelijke technische keten: eerst private mediatoegang voor de 226 bestaande oefeningen, daarna expliciete versieerbare release-manifesten en gebruikersgrants voor goedgekeurde nieuwkomers, afspelen en doorspoelen met een echt account op web én Android, regresstests, rollback en het veilig uitfaseren van openbare assets. De gebruiker hoeft de 15 batches niet opnieuw goed te keuren zolang de broninhoud niet wezenlijk verandert.
