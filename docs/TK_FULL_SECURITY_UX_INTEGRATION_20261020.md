# TK-INTEGRATION-20261020 — beveiliging, serververificatie, herstelvoorbereiding en UX

**Datum:** 20 oktober 2026
**Status:** DRAFT, NO MERGE / NO DEPLOY / NO ANDROID-(HER)INSTALLATIE.
**Repository:** `steentje76/maurice-training`
**Integratiebranch:** `integration/tk-full-security-ux-20261020`

## 1. Bronidentiteit en ancestry

- `main` bij aanvang: `160fefc2e1dabc424922e907f7dc360e4f84543f` (niet gewijzigd).
- Basis: PR #569, `adaf1e45f73b9ca2b87dc266f09ff71d683d3cfb`, een gestapelde keten op PR #563 via #564–#568.
- Tweede parent: PR #561, `cd413d3586861b85dcc735fcd1eddac7f7126eda`, met #559 (security/UX) en de PWA-cacheheracceptatie.
- Beide ketens stammen aantoonbaar af van #556 `142e710914954467815efb9bf962c0999ec5955f` en de geconsolideerde #552 `146bb4b5469024c3539b3b67b2a1216778872c47`.
- Integratie via eigen Git-worktree, Git merge met twee ouders, niet via cherry-pick van overlappende commits. Oorspronkelijke branches en `main` niet gewijzigd.

## 2. Conflictoplossing en exacte wijzigingen t.o.v. #569

1. `.github/workflows/tk-browser-acceptance-staging.yml`: alle bestaande base-branches behouden; nieuwe integratie- en reviewbase opgenomen. De reeds in #561 bestaande zevende Chromium-suite (`fUxSetCompletionAccessibility`) blijft behouden.
2. `sw.js`: conflicterende `v470269` (#569) en oudere `v470257` (#561) niet overgenomen; twee cacheconstanten synchroon naar **`v470270`**. `CORE_SIG` en losse `CACHE_VIDEOS` ongemoeid.
3. `index.html`: automatische, conflictvrije merge van 44×44px native setbutton, 34px visuele ring, `aria-pressed` bij togglen/hervatten. Geen andere bestaande schrijf- of beslislogica bewust gewijzigd.
4. Bijbehorende UX-, PWA- en integratietests en bestaande reviewdocumentatie uit #559/#561 behouden.

Geen Product Owner-besluit, databasemigratie, service role, credentials, ondertekening of update van Android-productie uitgevoerd.

## 3. Eerste onafhankelijke, lokale integratietests op de gecombineerde werkboom

**14/14 gerichte suites groen**, onder meer:
- `fIntegrationAppShellCache` 5/5 en `sw-guard` 5/5.
- `fUxSetCompletionAccessibility` PASS in echte Chromium op 320/360/375/390/412/430px.
- `fAuthSwitchRetryIsolation` 32/32, `fQueueUiOwnerIsolation` 10/10, `fQueueTxAbortSettles` 5/5, `fOfflineQueueCrossAccountLeakage` 3/3.
- `fSetLoggingUx` 131/131, `fExecutionIntegrity` 34/34.
- `fServerVerifyHardening` 31/31, `fVerifyRegister` 17/17, `fVerifyReadBack` 29/29.
- `fRestorePreviewCanon` 28/28, `fRestorePreview` 53/53.

De definitieve GitHub Quality Gate en de volledige echte Chromiumacceptatie moeten op de exacte nieuwe merge-HEAD onafhankelijk slagen. Geen oudere groene run als bewijs voor die HEAD hergebruiken.

## 4. Harde restbeperkingen (blijven NO-GO)

- `serververify` / read-after-write uit #564 is voor een beperkt domein gebouwd, maar de uninstallpoort blijft bewust gesloten wegens historie, onbekende/eigenaarloze bronnen en onverifieerbare data.
- Historische inventaris (#565) is niet gelijk aan volledige serverbevestiging.
- De versleutelde reddingskopie (#566/#567) en herstelpreview (#568/#569) vervangen geen bewezen, op Android geteste back-up en restore. Herstel uitvoeren blijft uitgeschakeld; Android-export niet gereed.
- PR #532 bevat signingbesluiten D1–D4 en heeft nog een mergeconflict.
- Er ontbreken fysieke Android-/OAuth-/wearable-acceptatie en een finale formele securityreview op de gezamenlijke HEAD.
- Geen productie, geen uninstall en **geen** automatische merge naar `main` zonder expliciet Product Owner-besluit.

## 5. Aanbevolen reviewbesluit

Deze geïntegreerde **Draft-kandidaat** is gereed voor GitHub-CI en een aanvullende onafhankelijke eindheracceptatie. Oude gestapelde PR's **niet dubbel mergen**; volg na expliciete goedkeuring één bewezen ancestryketen, inclusief de nieuw geïntegreerde UX.
