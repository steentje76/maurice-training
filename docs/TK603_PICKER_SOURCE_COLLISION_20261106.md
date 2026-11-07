# TK504 / #603 — brongetypeerde oefeningkeuze bij gelijke IDs (6 november 2026)

**Status: DRAFT — GEEN PRODUCTIEVRIJGAVE.** Getest op de concrete PR #602 ontwikkelbasis; geen productie-SQL, geen accountmutaties, geen video-/posterpublicatie, geen APK.

## Reproduceerbare oorzaak
De originele `exPickerPool` deed deduplicatie uitsluitend op `id`, en `resolvePickerEx(id)` retourneerde eerst `exercises`. Een FK-shadowrecord met `{id:'TK-000038',scope:'personal'}` overschreef zo een bestaand catalogusrecord met dezelfde ID. Dit kan tevens gebeuren bij bestaande persoonlijke records met een TK-achtig ID. Namen of gelijksoortige metadata bewijzen geen Movekit-bron.

## Beperkte aanpassing
- Unified picker biedt een brongetypeerde keuze voor catalogus versus persoonlijke rij bij ID-botsingen. Bestaande persoonlijke rijen worden nooit hernoemd, geconverteerd, verwijderd, in een nieuwe scope geplaatst of op basis van de naam herkend als Movekit.
- `selectExPickerItem(id,source)` en `resolvePickerEx(id,source)` dragen de daadwerkelijk aangeraakte bron door. Een directe `resolvePickerEx(id)` blijft legacy-first. Onbekende bron is geen catalogusbewijs.
- Canonieke source-ref wordt uitsluitend uit daadwerkelijk geselecteerde `_catalog:true, catalog_id===id` pickerobjecten afgeleid en daarna opnieuw door bestaande ECS gecontroleerd. Die ref blijft behouden in bestaande add, replace, swap en superset-logroutes. Geen tweede bibliotheek, logger of training-engine.
- Losse oefeningen blijven met `TK504_TYPED_FK_SESSION_RELEASE=false` op het bestaande compatibiliteitspad. Als de beveiligde release na onafhankelijke vrijgave actief wordt, gebruiken expliciete cataloguskeuzes de geautoriseerde `tk504VerifySessionBinding` en één bestaande `writeSessionRow` in plaats van een persoonlijke FK-shadow te maken.
- De persoonlijke rij met TK-vormige ID krijgt geen MoveKit-poster door een ID-lookup in de picker. Delen van een ID impliceert geen mediarecht.

## RED → GREEN / validatie
`core/tk603PickerProvenanceCollision.test.js` gebruikte echte functies uit `index.html` en was vóór reparatie RED bij de eerste same-ID-botsing. Na reparatie PASS: de 226 actieve catalogusitems en 226 synthetische gelijk-ID persoonlijke items zijn afzonderlijk selecteerbaar en niet gemuteerd. Bestaande `f41Picker` 29/29, `f44Unified` 19/19, `f91ShadowRow` 17/17, `fExerciseSwapPrescriptionWeight` 34/34, `tk504TypedFkSessionWriteGate` 27/27, `tk504ExistingLibraryConnection` 13 embedded scripts syntax PASS en gerichte catalogus- en provenance-tests PASS. Dit zijn lokale, synthetische controles; géén live multi-account-acceptatie.

## Wat nadrukkelijk nog niet is opgelost
1. Echte getypeerde DB-bindings- en grantmigraties, RLS-tests voor twee accounts en gecontroleerde rollback op een geïsoleerde acceptatieomgeving.
2. Offline FIFO, herstart en source-ref in alle training-instance- en ad-hoc-sessiepaden over alle apparaten volledig end-to-end controleren, inclusief los geselecteerde oefeningen, alternatieven, favorieten en historie.
3. Signed media delivery voor de 226 bestaande en 356 nieuwe oefeningen volledig tegen echte Android/WebView, Range, verlopen tokens, offline vault en nieuwe accountwisselingen testen.
4. Oude raw Netlify MP4-/postercontent pas na bewezen beschermde cutover verwijderen; licentie- en entitlement-/content-gates blijven gelden.
5. #587/#586 functionele reparaties en gezamenlijke UX-acceptatie vóór de volgende APK.

De releaseflags blijven `false`. #603 mag niet als productie-gefixt worden gesloten voordat echte multi-account opslag/herstel is bewezen.
