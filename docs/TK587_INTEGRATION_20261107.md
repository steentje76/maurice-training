# TK #587 × main (MoveKit 582) — integratie en Android-testkandidaat, 7 november 2026

Branch `integration/tk587-main-20261107`, gebaseerd op `main` `492bf3db` (MoveKit #608–#611 gepubliceerd) en #587-HEAD `131b1298`.
De oorspronkelijke Windows-integratiewerkruimte (`C:\Steensoft\tk587-integrate-main-20261107` op DESKTOP-DP6BUNC) was niet bereikbaar en nooit gepusht; de merge is daarom opnieuw en traceerbaar uitgevoerd vanaf GitHub. Dezelfde acht conflicten traden op.

Productie blijft `main`. Deze branch levert één geïsoleerde test-APK (`com.trainingskompas.app.tk587test20261107`, label **TK Test 7 november**), geen productie-update.

## A. Conflictresolutie

Vijf testbestanden hadden uitsluitend regeleinde-conflicten (#587 zette LF → CRLF). Ze zijn inhoudelijk drieweg gemerged op genormaliseerde inhoud; regeleinden volgen `main`. Geen volledige `ours`/`theirs`-keuze.

| Bestand | Oplossing |
|---|---|
| `core/fDetrainingPrescriptionPaths.test.js`, `fExerciseSwapPrescriptionWeight.test.js`, `fReplacementPrescription.test.js` | Alleen regeleinden; inhoud van beide kanten behouden. |
| `core/fExerciseSubstitutionCanonicalSource.test.js` | Assertie combineert TK584 (uitgevoerde A-sets blijven onder A) met #603 (`tk504_catalog_ref:sourceRef`). |
| `core/fHardening.test.js` | `completeAppFunction('finishSession')` van main (robuuste extractie). |
| `core/fStructuredIntervalsB3Erg.test.js` | Unie: #504-catalogusfuncties + `tkErgResolveIntervalPrescription` (#579). |
| `sw.js` | Cachebump naar `v470281` (core gewijzigd t.o.v. beide ouders). |
| `index.html` (13 hunks) | Zie hieronder. |

`index.html`:
1. Preview vervangen: #587 centrale picker, duplicaat- en trainingstypebewaking, asynchrone eigen historie; #603 bronclaim alleen uit aangeboden alternatief of het werkelijk getikte catalogusobject, nooit uit een kaal ID.
2. Picker: #587 `cleanupExPickerKeyboard` + #603 `selectExPickerItem(id, source)`.
3–5. Hervatten/draft: #603 eigenaarsbinding (`owner_uid`, `tk603DraftOwnerMatches`) + #587 uitvoeringsdraft (overgeslagen oefeningen, focus, onveranderlijke programmasnapshot).
6–7. Vervangen tijdens uitvoering: het werkelijk gekozen object (#603), duplicaatbewaking en behoud van uitgevoerde sets onder de oorspronkelijke ID (TK584, geen `delete sessionLog`), bronclaim op beide spiegels.
8–10. Afronden: `context.instanceId` + `isCurrent()` (#603), gebruikers-RPE bij PM5 (#587), stabiele rij-ID's in beide modi, direct draftcheckpoint na elke write.
11. Instance-afronding: alleen de bevestigde afronding van #587 (geen tweede best-effort aanroep).
12. Wisselmodaal: #603 bronclaim + TK584 behoud.
13. Herstel (`v43OverallRecovery`): #603 eigenaar-gescopte reads; zonder bewezen eigenaar of na accountwissel `overall:null` (onbekend), nooit een verzonnen 100%.

Aanvullende integratiefouten gevonden en hersteld:
- **Programma-instance**: #587 maakt de instance lui aan ná het vastleggen van de #603-finishcontext. Zonder correctie kregen alle sessierijen `training_instance_id = null`. Nu bindt een late create alleen bij `isCurrent()` en zet `context.instanceId`; de bevestigde afronding gebruikt dezelfde context. Mutatietest bewijst de regressie.
- **Preview toevoegen**: een via de bibliotheek toegevoegde catalogusoefening kreeg geen MoveKit-herkomst. Nu `tk603CatalogRefFromPickerSelection(ex)`.
- **Android-buildtype**: het #587-blok `gebruikerstest` stond in `signingConfigs` (ongeldig, buildjob stond op hold) en is als buildType hersteld; nieuwe buildType `tk587test`.

Testharnassen van #587 laden nu ook de echte #603-helpers die de productiefuncties aanroepen. Geen asserties verwijderd; twee zijn aangescherpt (instancebinding, `overall:null`).

Browsertests van main (`fGuidedPreviewAthleteConstraints`, `fHomeDagfactorBasisSafety`, `fInzichtHerstelBelasting`, `fGuidedIntegrationAvoidSave`) draaiden in main-CI zonder Chromium (SKIP) en faalden met Chromium al op main zelf: hun fixtures hadden geen aangemelde eigenaar terwijl #603 drafts en reads aan een eigenaar bindt. Ze krijgen nu een synthetische eigenaar. `fGuidedIntegrationAvoidSave` C1–C5 blijft identiek aan main rood (25/40): de gesimuleerde server kent de #603-bindings-RPC niet, waardoor Guided-opslag van catalogusoefeningen terecht fail-closed weigert. Dat is een bestaande harnasbeperking van main, geen regressie van deze merge. `fHomeDagfactorBasisSafety` R4 (regelafbreking op 360 px) faalt lokaal ook op #587 zelf; lettertype-afhankelijk.

## B. Gebruikersbevindingen

Status: CODE = in code hersteld, TEST = geautomatiseerd bewezen, DEVICE = fysiek Samsung/PM5 bevestigd.

| Bevinding | Status |
|---|---|
| Decimale setinvoer 67,5 kg (24-008) | CODE+TEST (unit, Chromium 4 breedtes, emulator). DEVICE open. |
| Oefening vervangen/toevoegen/verwijderen, origineel onaangetast (24-002, 25-004) | CODE+TEST. Cross-type vervangen bewust geweigerd. DEVICE open. |
| Programma-uitvoering origineel + gewijzigd (01-11) | CODE+TEST (acceptatieproef 8 oefeningen). DEVICE open. |
| Set toevoegen (25-013) | CODE+TEST, blijft na hervatten. DEVICE open. |
| Hervatten exact aangepaste uitvoering (25-011) | CODE+TEST, incl. procesherstart in emulator. DEVICE open. |
| Training afsluiten, offline/retries | CODE+TEST: gedeeltelijke fout behoudt draft, retry zonder dubbele rijen, alle rijen aan één instance. MoveKit-catalogusoefeningen worden offline niet gequeued maar fail-closed bewaard tot online (bestaand #603-gedrag van main). DEVICE open. |
| Trainingshistorie gepland/aangepast/uitgevoerd | CODE+TEST. |
| Spierbelasting alleen uit opgeslagen sets (24-007) | CODE+TEST, eigenaar-gescopt. Oorspronkelijke waarneming niet fysiek gereproduceerd. |
| Trainingsadvies gewicht/reps/RPE (25-009/012) | CODE+TEST: bestaande resolver, target-RPE wint, geen verzonnen gewicht. Verdere integratieproef open. |
| Mobiele setvelden (25-010) | CODE+TEST: 320/360/390/430 px bij 100% en 130%. DEVICE open. |
| Apparaatinstellingen (25-008) | CODE+TEST per eigenaar/apparaatvariant. DEVICE open. |
| PM5-resultaat en gemeten splits (25-006/007) | CODE+TEST synthetisch. DEVICE open. |
| PM5-intervalprogrammering (24-006/25-005, #579) | OPEN. Experimenteel en gemarkeerd (`TRANSFERRED_UNVERIFIED` ≠ `PROGRAMMED`). |
| Samen-shortcut, Jouw ritme (25-002/003) | OPEN, plaatsingswensen voor de UX-ronde. |

Historische uitzondering: de door Maurice op 1 november opnieuw ingevoerde Bench Press-, Back Squat- en Overhead Press-records zijn niet aangeraakt. Geen databasewrite, migratie of reconstructie.

## C. MoveKit

- `main`-functionaliteit (#608–#611) behouden: canonieke `ExerciseCatalogService`, getypeerde FK, owner-gescopte signed posters en video, dynamisch aantal.
- 582 = 226 gebundeld + 356 die pas na aanmelding via `exercise-catalog-v2` worden gemount. Emulatorproef: zonder aanmelding blijft het aantal onder 582 en weigert de server anoniem verzoek.
- Catalogus- en persoonlijke ID's met gelijke vorm blijven gescheiden (acceptatieproef A4).
- Geen licentiebestanden, bronvideo's, tokens of service-role-gegevens in repository of APK (CI-controle).

**Risicobeoordeling 226 legacy-media.** Niet naar de beveiligde route overgezet; ongewijzigd ten opzichte van productie. Voor een test-APK op één toestel geen nieuw risico. Geen vrijgave voor volledige productie-mediacutover; dit blijft aparte licentie-/securityschuld.

## D. Bestaand eigen account

Technisch:
- Aparte applicationId: eigen WebView-opslag, eigen draft en offlinewachtrij. Geen gedeelde lokale staat met de productie-app.
- Zelfde productie-backend (Supabase `mhfxhzkdmgkaplicdszg`, Netlify `maurice-art`). Geen nieuwe migraties. Alleen-lezen vastgesteld: `training_instances.snapshot` (jsonb) mag door de eigenaar worden bijgewerkt (RLS `auth.uid() = user_id`, geen blokkerende trigger); `sessions.intervals_detail`, `protocol_*`, `training_instance_id`, `sets_detail`, `edit_revision` bestaan.
- Writes zijn eigenaar-gebonden en idempotent.

Niet aangetoond: read-after-write met een echt account in de APK (CI heeft geen account) en fysiek Samsung-gedrag. Daarom **geen formele vrijgave voor persoonlijk gebruik**. Advies: eerst de acceptatiestappen hieronder; train nooit tegelijk in beide apps; koppel geen wearables in de testapp (OAuth-terugkeer is bewust uitgeschakeld).

## E. Samsung-acceptatie (Android 16)

1. Installeer de APK naast de bestaande app; controleer label **TK Test 7 november** en Profiel → App-instellingen → v4.70.27.
2. Log in; Trainen toont 582 oefeningen; zoek een nieuwe MoveKit-oefening en controleer poster en video.
3. Start een programmatraining. Log oefening 1 met 67,5 kg; voeg een set toe.
4. Vervang een nog niet uitgevoerde oefening via de bibliotheek; vervang een half uitgevoerde oefening en controleer dat de gedane sets zichtbaar blijven.
5. Sluit de app geforceerd; open en hervat: dezelfde aangepaste lijst, sets en extra set.
6. Zet vliegtuigmodus aan, rond af. Eigen/legacy-oefeningen worden gequeued (synchronisatiemelding, geen "Training opgeslagen"). MoveKit-catalogusoefeningen worden offline bewust niet bevestigd (#603 fail-closed: herkomst moet online worden geverifieerd): melding "mislukt — probeer opnieuw", de training blijft bewaard. Vliegtuigmodus uit, opnieuw afronden: exact één rij per uitgevoerde oefening, geen dubbele.
7. Controleer Logboek/Programma-historie: gepland, aangepast en uitgevoerd afzonderlijk; volumes kloppen.
8. Afmelden; ander account aanmelden: geen posters, draft of trainingen van het eerste account zichtbaar.
9. PM5: verbind, roei een vaste afstand; resultaatvelden gevuld, RPE zelf invullen, gemeten splits niet gelijk verdeeld. Intervalprogrammering alleen als experiment; noteer wat de PM5 toont.
10. Controleer in de productie-app dat dezelfde training één keer zichtbaar is.

## Reproduceerbaar

`npm test`; `node core/fTk587IntegrationAcceptance.test.js`; `node scripts/tk577-browser-acceptance.cjs`; `node scripts/tk584-browser-acceptance.cjs`; `node scripts/tk-all-browser-acceptance.cjs`; workflow `.github/workflows/tk587-integration-test-apk.yml` (regressie → APK → emulator API 30/34 → prerelease).
