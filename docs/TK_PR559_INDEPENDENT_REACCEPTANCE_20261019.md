# Onafhankelijke heracceptatie — Trainingskompas PR #559

**Datum:** 19 oktober 2026
**Kandidaat:** PR #559, HEAD `bbbb0ca56428ab19930c6f74a45bd320c443024a`, base `review/tk-consolidated-20261019` (#552, `146bb4b`).
**Reviewbron:** afzonderlijke Git-worktree op exact `bbbb0ca`; eigen reviewbranch `review/tk559-cache-reacceptance-20261019`.
**Status:** DRAFT, geen merge, deploy, signing, secrets, productiegegevens of databasemigraties.

## 1. Onafhankelijk gecontroleerde code-identiteit

- `main` `160fefc2e1dabc424922e907f7dc360e4f84543f`; #552, #554, #555 en #556 blijven Draft en onveranderd.
- #559 is de conflictvrije merge van #556 `142e710914954467815efb9bf962c0999ec5955f` en #554 `6d9bcf6152fe9fcfb3f5bfd80821d189da79a955`. Git bevestigt beide parent-SHA's.
- Ten opzichte van #556 is de productiecode-delta alleen de afzonderlijk geteste werksetmark-up/CSS en synchronisatie van de zichtbare ARIA-status in `index.html`; geen nieuwe queue-/auth-wijziging.
- De GitHub Quality Gate op #559 [run 39255055996](https://github.com/steentje76/maurice-training/actions/runs/39255055996) was groen. De Chromium-acceptatie [run 39255055956](https://github.com/steentje76/maurice-training/actions/runs/39255055956) was groen: 7/7 suites, 0 fail/0 skip, de oorspronkelijke 646 browserasserties plus zes geteste UX-schermbreedtes.

## 2. Onafhankelijke code- en risico-inspectie

**SEC-INT-01 — accountisolatie:** `sbFetch` legt `uid0` vast vóór de eerste fetch en weigert na een 401 een retry onder een gewijzigde gebruikersidentiteit. `sbPostQ` legt eigenaar vast bij de oorspronkelijke write-aanroep; queue/UI/delete hergebruiken `owner_uid`. De controles uit #556 raken niet de nieuwe UX-knop.

**SEC-INT-02 — fail-closed offline:** strikte IDB-queue-read na `oncomplete`, abort-afhandeling, eigenaarquarantaine en gescheiden queueweergave worden in #559 behouden. Geen claim dat 2xx of lege wachtrij bewijst dat data op de server staat.

**UX-INT-01 — setcompletion:** native `button type=button`, 44×44px aanraakgebied met visuele 34px ring, persistent `sessionLog.sets[].done`, herstelde `aria-pressed`, Space/Enter en 320–430px-browseracceptatie. De Calculation-/Decision-/Evidence-engines worden niet gewijzigd.

**SW-INT-01 — P2 cachecontinuïteit: hersteld in aparte reviewbranch.** Exacte verschilcontrole `142e710..bbbb0ca`: `index.html` veranderde, `sw.js` niet. De cacheversie bleef `v470256`. De worker precachet `/index.html` en ruimt oude caches op bij activatie; online navigatie is network-first, waardoor geen algemeen online updatefalen is aangetoond. Toch is byte-identieke `sw.js` geen gegarandeerde worker-upgrade voor reeds geïnstalleerde PWA's en blijft het oude precache mogelijk bestaan tot een succesvolle online navigatie. Kleine herstelpatch: bump `CACHE_NAME` en `CACHE_STATIC` samen naar `v470257`, ongewijzigde `CORE_SIG` en behoud van videocache.

## 3. Reproduceerbare RED/GREEN tegenproef

Nieuw `core/fIntegrationAppShellCache.test.js` checkt (1) beide cacheconstanten, (2) hun synchronisatie, (3) versieminimum `v470257`, (4) precache van `/index.html`, (5) network-first navigatie met offline fallback.

- **RED**: de ongewijzigde `sw.js` uit PR #559 (`git show bbbb0ca:sw.js`), met `TK_SW_INPUT` geladen: exit code **1**.
- **GREEN**: herstelversie: **5/5**, exit code **0**.
- Bestaande `node core/sw-guard.test.js`: **5/5**, `CORE_SIG` blijft `91e1bafce3d3ad2b`.
- Bestaande `node core/fHardening.test.js`: **349/349**.
- Nieuwe browserworkflow-base `integration/tk-sec-ux-20261019` maakt het mogelijk dat een Draft-PR gestapeld op #559 opnieuw **alle 7 Chromium-suites** uitvoert. Niets gewijzigd aan de individuele suite-inhoud.

## 4. Openstaande bevindingen uit #556 (niet verholpen)

- **RELEASE-BLOCKER:** server read-after-write op oorspronkelijke eigenaar en inhoud ontbreekt. Een lege queue of HTTP 2xx is geen uninstall-permissie.
- **HIGH/MEDIUM:** eigenaarloze items niet reconcilieerbaar; `activities`/`activity_laps` niet volledig idempotent; geen tab-overstijgende flush-lock; enkele directe fetch-writes buiten de queue-/identiteitsbescherming; onvolledige browser/security acceptatie buiten de 7 geselecteerde suites.
- **RELEASE-BLOCKER:** signing PR #532 heeft een mergeconflict en open PO-keuzes D1–D4; stabiele cert-route, serverbevestiging en toestel-Android/OAuth/wearables/screenreader-acceptatie nog niet bewezen.
- **GOVERNANCE:** #552/#555/#556/#554/#559 niet afzonderlijk dubbel mergen; eerst onafhankelijke totale review van definitieve samengestelde HEAD, daarna afzonderlijk expliciet PO-mergebesluit. Geen PCC-mutatie buiten de geautoriseerde route.

## 5. Eindoordeel

**PR #559 als integratiebasis:** inhoudelijk goed gestructureerd en eerder CI-groen, maar cachecontinuïteitscorrectie wenselijk vóór integratie. **Reviewbranch met fix:** CONDITIONAL GO voor volgende integratiereview na nieuwe GitHub CI. **Merge / Android-herinstallatie / productie:** **NO-GO** totdat onafhankelijke finale acceptatie en releasevoorwaarden zijn ingevuld. Geen Androiddata verwijderen.
