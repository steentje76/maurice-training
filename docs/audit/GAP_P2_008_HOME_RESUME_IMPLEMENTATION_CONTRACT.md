# GAP-P2-008 — Home: training hervatten — implementatiecontract

**Status:** implementation preparation; no code or gap closure claimed.
**Baseline:** `570bf0455de1305e216db7f91c299c2a8ff7a942`.
**Scope:** proactieve hervatkaart op Home voor een geldige, data-bevattende onafgeronde trainingsdraft. Geen tweede execution- of loggingketen.

## Bestaande bronwaarheid

- `docs/MS-F2-07_HOME_DASHBOARD.md`: `restoreTrainingDraft()`/`draftHasData()` en `guardExistingDraft()` bestaan; `startT()`, `startCustomTraining()` en `launchProgramTrainScreen()` hebben bestaande resume-logica. De proactieve Home-kaart is uitdrukkelijk niet geïmplementeerd.
- `docs/AUDIT_GAP_REGISTER.json`: GAP-P2-008 OPEN, P2, `blocker=false`, V1-scope.
- `docs/architecture/TRAININGSKOMPAS_ROUTE_MAP.md`: programmatraining loopt via de bestaande preview/start- en instanceketen.
- `core/fProgramResume.test.js` en `core/fTrainingExecutionFinalClosure.test.js`: bestaande regressieankers; niet vervangen.

## Functioneel contract

1. Home toont een duidelijk herkenbare actie **Training hervatten** uitsluitend als de bestaande draft-parser een geldige draft met daadwerkelijke sessiedata retourneert.
2. Toon geen kaart voor een ontbrekende, corrupte, lege, afgeronde of niet-toepasselijke draft. Verwijder of overschrijf bestaande trainingsdata niet als een draft niet op Home kan worden weergegeven.
3. De actie leidt via de bestaande, type-specifieke start-/resume-route voor vaste, eigen/custom en programmatrainingen. Een eventueel ander ondersteund type wordt pas toegevoegd nadat de bestaande route expliciet is vastgesteld.
4. Hergebruik de bestaande `guardExistingDraft()`, `draftHasData()`, `sessionLog`/`sessionExtra` en `activeInstanceId`-semantiek. Geen nieuw sessieobject, geen dubbele `training_instances`-rij, geen parallelle opslag.
5. De kaart verdwijnt zodra de training daadwerkelijk is afgerond of de draft via de bestaande gecontroleerde route is verwijderd. Home-rendering mag nooit zelf een draft wissen.
6. Een concept met data van een andere training mag niet stilzwijgend worden vervangen; behoud de bestaande bevestigings- en guardlogica.
7. Bestaande schermnavigatie en Android/PWA-backgedrag blijven intact.

## Verplichte uitvoering vóór code

- Lees op de actuele branch de volledige implementaties van `refreshHome()`, `renderV43Home()`, `restoreTrainingDraft()`, `draftHasData()`, `guardExistingDraft()`, `startT()`, `startCustomTraining()` en `launchProgramTrainScreen()`.
- Leg voor elk ondersteund draft-type de exacte bestaande route en het sessie-ID-gedrag vast. Geen route afleiden uit een naam alleen.
- Controleer bestaande Home-DOM, renderfrequentie, HTML-escaping en eventbindingen. Kies één bestaand renderpad; geen dubbele kaart of dubbele listener.
- Verifieer of een latere commit het gebrek al oploste; stop bij een aantoonbare overlap.

## Acceptatie en regressie

- Geen draft / lege draft / corrupte draft: geen kaart, geen crash en geen dataverlies.
- Geldige draft per bewezen trainingstype: precies één kaart; actie hervat dezelfde sessie met alle eerder gelogde sets en metadata.
- Hervatten gevolgd door afronden: één voltooide instance, geen dubbele logging; kaart verdwijnt.
- Andere training starten met bestaande draft: bestaande guard beschermt de draft.
- App-herstart en opnieuw Home openen: draft blijft hervatbaar.
- Tests bewijzen de werkelijke Home→resume-call-chain; uitsluitend string- of DOM-aanwezigheid is onvoldoende.
- Bestaande resume-, training-execution- en documentconsistentietests blijven groen.
- Exact-head GitHub Quality Gate en post-merge Quality Gate moeten slagen; GAP-P2-008 blijft OPEN tot code, test en eventuele vereiste praktijkverificatie canoniek zijn vastgelegd.

## Governance

Wijzig geen andere gaps, scores of roadmapstatussen in deze implementatie. PCC-gapstatus en TK-auditstatus zijn gescheiden. Laat de implementatie als draft-PR reviewen vóór merge.
