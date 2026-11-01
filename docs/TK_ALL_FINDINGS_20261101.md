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
| 25-006 PM5-resultaatvelden | Nog uit te voeren |
| 25-007 exacte splits | Nog uit te voeren; geschatte verdeling nooit als gemeten presenteren |
| 25-008 apparaatinstelling | Code: direct bij invoer bewaren, eigenaar en apparaatvariant scheiden; gerichte regressie groen; oorspronkelijke melding niet fysiek gereproduceerd |
| 25-009/012 voorschrift/advies | Code: target-RPE en target-sets winnen van historische actuals; gewicht alleen uit bestaande resolver, geen hergebruik 1-rep-load voor hoger reps-doel zonder berekeningsbasis; identiek gewicht wordt niet lichter genoemd; regressie groen. Verdere integratieproef open |
| 25-010 smalle werksetvelden | Nog uit te voeren functionele layoutcorrectie, bredere vormgeving later samen |
| 25-011/013 hervatten/extra set | #585-behoud opgenomen; gecombineerde regressies groen |
| 01-11 oorspronkelijke logging/historie | #585-code en tests opgenomen |

De latere losse squat/bench/OHP-records zijn door Maurice handmatig opnieuw ingevoerd. Zij zijn geen teruggevonden oorspronkelijke registraties en blijven ongewijzigd. Geen historische DB-write of reconstructie.

Status is CODE / TEST / DEVICE expliciet gescheiden. Deze tabel sluit geen bronmelding of securitygate. De bredere UX en volgende APK vereisen nog de afgesproken gezamenlijke ronde. PCC-registratie alleen geauthenticeerd.
