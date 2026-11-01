# Geconsolideerd herstel — 1 november 2026

Product Owner: eerst ALLE eerdere functionele meldingen herstellen, daarna gezamenlijke UX-ronde, PAS DAARNA een nieuwe APK. Richtdatum dinsdag 3 november 2026. Geen automatische datumvrijgave. APK buildjobs zijn op deze branch expliciet geblokkeerd; de regressie controleert deze hold.

Basis: main 160fefc. Integratie van #578 (a5edf672) en #585 (c906136b), met behoud van beide ouders en zonder de gestapelde security-PR's te mergen. Bestaande versie 4.70.27 blijft bronidentiteit; geen nieuwe binaire release.

| Bron / ID | Werkstatus in deze integratie |
|---|---|
| 24-001 instellingenheader | Bestaande #578-code behouden; gezamenlijke fysieke acceptatie open |
| 24-002 vervangen | Bestaande pickerfix + behoud oorspronkelijke actuals uit #585 geïntegreerd; cross-type nog te toetsen |
| 24-003 previewkaarten | #578 responsieve layout behouden |
| 24-004/005 PM5-identiteit/type | #578 officiële UUID-/identiteitsfix behouden; fysieke acceptatie open |
| 24-006 / 25-005 PM5-intervallen | #579 open; app-only is geen apparaatprogrammeringsfix |
| 24-007 spierbelasting | Exact-ID catalogusfallback behouden + inputprovenance; oorspronkelijke waarneming niet opnieuw fysiek gereproduceerd |
| 24-008 decimale opwarmsets | #578-code en regressies behouden |
| 24-009 eerdere prestatie | #578-selectie behouden; voorgeschreven prefill wordt verder gecorrigeerd |
| 24-010 picker/toetsenbord | #578-code behouden; fysieke acceptatie open |
| 25-002 Samen-shortcut | Nog uit te voeren geregistreerde plaatsingswens |
| 25-003 Jouw ritme | Nog uit te voeren geregistreerde plaatsingswens |
| 25-004 extra oefening Preview | Code toegevoegd: session-only add, immutable definitie, unieke ID, modifications; gerichte regressie groen |
| 25-006 PM5-resultaatvelden | Frozen eindmeting via bestaande converter zichtbaar in resultaatvelden; RPE blijft gebruikersinvoer en gaat expliciet mee in dezelfde sessierij (nooit target-RPE); direct draft opslaan. Synthetische regressie groen, fysieke PM5-acceptatie open |
| 25-007 exacte splits | Geschatte verdeling expliciet gelabeld; PM5-totaal levert geen gefabriceerde afzonderlijke splits. Ontvangen 0x37-splitpakketten nu gedecodeerd, per eigenaar/device/generation gekoppeld, in bestaande intervals_detail bewaard en uit opgeslagen actuals getoond; synthetische ongelijke-splitproef groen. Fysieke PM5-acceptatie blijft OPEN |
| 25-008 apparaatinstelling | Code: direct bij invoer bewaren, eigenaar en apparaatvariant scheiden; gerichte regressie groen; oorspronkelijke melding niet fysiek gereproduceerd |
| 25-009/012 voorschrift/advies | Code: target-RPE en target-sets winnen van historische actuals; gewicht alleen uit bestaande resolver, geen hergebruik 1-rep-load voor hoger reps-doel zonder berekeningsbasis; identiek gewicht wordt niet lichter genoemd; regressie groen. Verdere integratieproef open |
| 25-010 smalle werksetvelden | e1RM eigen gridrij; 320/360/390/430px bij 100% en 130% tekstzoom: 8 browserproeven groen. Samsung-acceptatie open; bredere vormgeving later samen |
| 25-011/013 hervatten/extra set | #585-behoud opgenomen; gecombineerde regressies groen |
| 01-11 oorspronkelijke logging/historie | #585-code en tests opgenomen |

De latere losse squat/bench/OHP-records zijn door Maurice handmatig opnieuw ingevoerd. Zij zijn geen teruggevonden oorspronkelijke registraties en blijven ongewijzigd. Geen historische DB-write of reconstructie.

Status is CODE / TEST / DEVICE expliciet gescheiden. Deze tabel sluit geen bronmelding of securitygate. De bredere UX en volgende APK vereisen nog de afgesproken gezamenlijke ronde. PCC-registratie alleen geauthenticeerd.

Aanvullend: equipment-memory behoudt verwijderen van lege presets; oude regressietest gebruikt nu de echte eigenaar-/variantsleutel. 23 bestaande gevallen groen. Volledige Linux Quality Gate wordt opnieuw uitgevoerd; lokale Windows-suite meldt ook platformgebonden CRLF/npm/ESM-beperkingen. Geen vrijgave op basis van alleen gerichte tests.

## Aanvullende code en review

- Officiële protocolbron: [Concept2 PM CSAFE Communication Definition](https://cms.concept2.com/sites/default/files/2026-03/Concept2%20PM%20CSAFE%20Communication%20Definition.pdf), multiplexed 0x0037, gedrukte pagina 37; 18 databytes. Dit is geen bewijs van fysieke werking.
- Splitproef gaat via echte native transportdecoder en notify-router: vier ongelijke 250m-splits 58/57/59/58 seconden blijven 232 seconden. Geen verdeling van een totaal. Kort pakket, rusttype, accountwissel, oude generation, herhaalde notificatie, eindmetinggrens en oud callback na reconnect worden geweigerd/gededupliceerd. De bestaande live totals veranderen niet door een splitpakket.
- Bestaande JSON-kolom intervals_detail en dezelfde writeSessionRow worden hergebruikt voor programma en losse oefening. App-intervalblokken blijven behouden naast pm5_splits. Geen migratie, historisch herstel of tweede writer.
- Vormulierbewerkingen behouden herkomstmetadata; opnieuw berekenen maakt een ontbrekende apparaatmeting niet alsnog tot exacte split. Ook na heropenen blijft de gemeten splitlijst beschikbaar uit opgeslagen JSON.
- Tweede eigen reviewpass vond en herstelde ontbrekende gebruikers-RPE in PM5-opslag. De apparaatconverter blijft rpe:null leveren; alleen expliciete actualRpe uit het formulier wordt door de adapter toegevoegd. Geen voorgeschreven waarde als actual. Dit is geen onafhankelijke externe revieweracceptatie.
- Lokale Windows brede suite: 427 suites groen; overige meldingen bevatten platformgebonden CRLF/npm/ESM en inmiddels aangepaste bronextracties. Linux Quality Gate is leidend; groen op fe386659, opnieuw verplicht na iedere codewijziging.
- Bekende beperking: zonder ontvangen splitpakketten kan de software geen exacte splits reconstrueren. Voor een ontbrekend PM5-pakket wordt niets ingevuld. Voor standalone app-herstart is geen nieuwe resumefunctie geïntroduceerd.

Reproduceerbaar: node core/fPm5MeasuredSplits.test.js; node core/fPm5CompletionForm.test.js; node core/fAllFindingsRepair.test.js; node core/fTk584ProgramLogging.test.js; node native/nativeConcept2BleTransport.test.js. Volledige suite: bestaande .github/workflows/quality-gate.yml. Browser-layoutproef: scripts/tk-all-browser-acceptance.cjs (Playwright Chromium/Chrome).
