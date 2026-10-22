# TK-SEC-UX-INT-01 — Gecontroleerde beveiliging + UX-integratiekandidaat

**Datum:** 19 oktober 2026
**Status:** DRAFT / NO MERGE / NO DEPLOY / NO ANDROID-(HER)INSTALLATIE.
**Repository:** `steentje76/maurice-training`
**Werkbranch:** `integration/tk-sec-ux-20261019`
**Target-PR:** gestapeld op `review/tk-consolidated-20261019` (#552), niet op main.

## 1. Bronidentiteit en scope

- `main`: `160fefc2e1dabc424922e907f7dc360e4f84543f` (ongewijzigd tijdens de startcontrole).
- PR #552: `146bb4b5469024c3539b3b67b2a1216778872c47` — geconsolideerde trainings-, Android- en readiness-basis.
- PR #555: `8f1b8ca3df64222f2f668c4227953d9d02c5c180` — eerste wachtrijhardening, zonder #556 onvoldoende veilig.
- PR #556: `142e710914954467815efb9bf962c0999ec5955f` — accountisolatie-, retry-, wachtrij-UI- en abort-herstel.
- PR #554: `6d9bcf6152fe9fcfb3f5bfd80821d189da79a955` — toegankelijke werksetknop en UX-audit.

De nieuwe branch is gemaakt op exact #556 en integreert **beide commits** van #554 via een niet-fast-forward Git-merge. De merge was conflictvrij. Oorspronkelijke branches en `main` zijn niet gewijzigd. Deze PR heeft #552 als **reviewbase**, zodat het gehele aanvullende beveiligings- en UX-verschil in één kandidaat kan worden beoordeeld; #555/#556/#554 zijn daarna niet zelfstandig te mergen.

## 2. Ongewijzigde beveiligingsprincipes

- Geen nieuwe identiteit aannemen voor trainingsdata van een andere gebruiker; eigenaarsgrenzen ook bij tokenvernieuwing, offline replay, wachtrijweergave en verwijdering.
- IndexedDB-transacties falen gesloten wanneer de wachtrij onleesbaar is of commit wordt afgebroken.
- UX: native set-afvinkknop met 44×44px aanraakdoel, zichtbare focus en `aria-pressed`; bestaande setregistratie, 1RM, RPE, resttimer, autosave en trainingshistorie ongewijzigd.
- Geen wijziging van Calculation-, Context-, Decision- of Evidence-regels door deze integratie. Geen databaseschema, signing, secrets of productiedata aangepast.

## 3. Lokale compositietests

Getest op de gecombineerde werkboom, **vóór** het vastleggen van de integratiecommit:

| Test | Resultaat |
|---|---|
| `fUxSetCompletionAccessibility` | PASS; echte Chromium, zes schermbreedtes 320/360/375/390/412/430 |
| `fAuthSwitchRetryIsolation` | 26/26 PASS |
| `fQueueUiOwnerIsolation` | 10/10 PASS |
| `fQueueTxAbortSettles` | 5/5 PASS |
| `fOfflineQueueCrossAccountLeakage` | 3/3 PASS |
| `fSetLoggingUx` | 131/131 PASS; echte Chromium |
| `fExecutionIntegrity` | 34/34 PASS |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS; oorspronkelijke gemengde CRLF/LF behouden |

De Chromium-stagingworkflow krijgt de nieuwe toegankelijkheidstest expliciet als **zevende** suite. Hiermee wordt niet uitsluitend op lokaal browserbewijs vertrouwd. GitHub CI op de definitieve kandidaat-HEAD is een aparte verplichte gate.

## 4. Resterende NO-GO-poorten

1. Onafhankelijke security-, code- en integratieherreview op de nieuwe exacte HEAD, inclusief nieuw CI-resultaat en regressie bij accountwissels.
2. Geen read-after-write-serverbevestiging voor uitsluitend lokaal opgeslagen trainingsgegevens: `veilig:true`, een HTTP 2xx of een lege queue autoriseren **nooit** een de-installatie.
3. Onopgeloste eigenaarloze wachtrij-items, risico op dubbele `activities` / `activity_laps`, ontbreken tab-overstijgende flush-lock en directe fetch-paden (zie rapport #556).
4. Android-signing PR #532 heeft conflict/hardening nodig; PO-besluiten D1–D4 zijn niet verleend.
5. Fysieke Android-/OAuth-/wearable- en screenreaderacceptatie ontbreken, net als formeel PO-mergebesluit.

**Oordeel vóór definitieve CI en onafhankelijke review:** samenstelling succesvol; CODE REVIEW REQUIRED; **MERGE / RELEASE NO-GO**. PCC is niet via een onbevoegde schrijfroute gemuteerd.
