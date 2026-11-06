# Trainingskompas — integratieacceptatie V1-beta-kandidaat

**Datum:** 18 oktober 2026
**Status:** DRAFT / STAGING / GEEN MERGE- OF RELEASEAKKOORD
**Integratiebranch:** `integration/tk-rec-android-20261018`

## Bronvaststelling

- Productie-/main-baseline bij aanvang: `160fefc2e1dabc424922e907f7dc360e4f84543f` (v4.70.25).
- Android-tak: PR #547, HEAD `470fca70214b41fee107473f27edd166e9a4c739`; bevat de gestapelde werkstroom #540 → #541 → #542 → #543 → #544 → #545 → #547.
- Readiness-tak: PR #549, HEAD `131ab2af592b44db16f07608bf7e8f97853642d3`, met DEC-REC-001-A/B uit issue #546.
- De integratie is gemaakt op een **afzonderlijke worktree**. Geen wijziging van `main`, bestaande PR-branches, Android-signing of gebruikersdata.

## Mergeanalyse

`git merge-tree --write-tree` en een daadwerkelijke staging-merge vonden één bronconflict:
`docs/00_Project_Management/DECISION_LOG.md`. De besluitsecties uit **beide** takken zijn ongewijzigd in inhoud behouden: DEC-LOG, DEC-EXEC, DEC-LIB, DEC-UPDATE en DEC-REC. Er waren geen Git-inhoudsconflicten in de productcode.

Een conflictvrije merge bewijst geen functionele compatibiliteit; daarom zijn regressies op de samengevoegde boom uitgevoerd.

## Testbewijs op gecombineerde boom

- 17 gerichte Node-/VM-regressiesuites: **17 geslaagd, 0 mislukte suites**.
- Inclusief `fCoachDecisionScope`, `fDecisionRecoveryPlanScope`, `fRecoveryContextFreshness`, `fRecoveryReadinessQualityWiring`, `fUpdateReadiness`, `fAndroidUninstallInstructionsSafety`, `fHomeDagfactorBasisSafety`, `fStaleHealthPresentation` en `sw-guard`.
- Nieuwe negatieve tegenproeven op bronbranches bewezen vooraf: geplande training met incomplete spierdata gaf te gunstige Coach-tekst; herstelpercentages buiten [0,100] werden als evidence geaccepteerd. Beide paden zijn fail-closed gecorrigeerd in PR #549.
- GitHub Quality Gate op exacte integratie-HEAD: **nog afzonderlijk te verifiëren na commit en push**.
- Volledige mobiele Chromium-uitvoering: **NIET bewezen in deze acceptatie**. Playwright-installatie op de aangesloten Windows-pc liep vast door onvoldoende virtueel geheugen; niet als groene test meetellen.

## Open releasepoorten (alle HARD GATE)

1. Onafhankelijke code-/browseracceptatie op de uiteindelijke volledige integratie-HEAD, inclusief mobiele breedtes en interaction flows.
2. Afzonderlijke review en expliciet PO-mergebesluit; de integratie-PR blijft Draft.
3. Android ondertekeningsbesluiten D1–D4 (PR #532), bewezen serverregistratie/herstel uitsluitend lokale gegevens, fysieke toestelacceptatie.
4. Geen de-installatie van de bestaande Android-app, geen productiedeployment, geen signing-/secretwijzigingen of databasemigraties.

**Verdict:** stagingkandidaat voor vervolgacceptatie; **GEEN vrijgave**.
