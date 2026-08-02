# Sprint 1 — Fundament, Accessibility & Stabilisatie
**TrainingKompas · v3.3.25 → v3.3.26 · 2 augustus 2026**
**Scope-bevestiging:** geen file-split, geen nieuwe architectuur, geen premium/abonnementen, geen nieuwe AI-functionaliteit, geen redesign. Alle onderstaande wijzigingen zijn additief en lokaal geverifieerd (syntax-check + volledige testsuite).

---

## 1. Uitgevoerde werkzaamheden

### 1.1 Accessibility-fundament (WCAG 2.2 AA-basis)
| Wijziging | Waar | Blast radius |
|---|---|---|
| `role="navigation"` + `aria-label="Hoofdnavigatie"` op elke bottom-nav | Elk scherm met `.bnav` | 14 voorkomens, mechanisch toegepast |
| `aria-current="page"` op het actieve navigatie-item | Elk scherm met `.ni.active` | 14 voorkomens |
| `role="heading" aria-level="1"` op elke schermtitel | `.hdr-title` | 11 voorkomens |
| `aria-label` op icoon-only knoppen | `.ibtn` (📊⚙️＋🕘🗑↻✕) | 14 knoppen, individueel gecontroleerd en van betekenisvol label voorzien |
| `role="dialog"` + `aria-modal="true"` + focus naar eerste focusbaar element bij openen, focus terug naar trigger bij sluiten | Centraal in `openModal()`/`closeModal()` | Alle 40 modals via twee functies, geen los scherm hoeft aangepast |
| Focus naar het nieuwe scherm bij navigatie (`focusScreenForA11y()`) | Centraal in `go()` | Elke schermwissel |
| Escape-toets sluit de open modal | Globale `keydown`-listener | Alle modals |
| Skip-link ("Direct naar inhoud") | Direct na `<body>` | App-breed |
| `:focus-visible`-stijl + `.sr-only`-utility | Globale CSS | App-breed beschikbaar |

**Niet gedaan (bewust, buiten Sprint 1-tijdsbudget):** labeling van losse formuliervelden, complexere widgets (spierherstel-heatmap, coach-chat-transcript) en de overige ~275 knoppen die al zichtbare tekstlabels dragen (en dus al een basaal toegankelijke naam hebben). Dit is een scherm-voor-scherm-vervolgstap, geen halve implementatie van wat hier wél is gedaan.

### 1.2 Motion Framework
CSS-tokens toegevoegd conform Handbook-naamgeving (`--motion-fast`, `--motion-standard`, `--motion-normal`, `--motion-success`, `--motion-warning`, `--motion-modal`, `--motion-navigation`, `--motion-loading-pulse`) + volledige `@media (prefers-reduced-motion: reduce)`-override die alle animatie-/transitieduur naar nagenoeg nul zet. **Bestaande CSS-transities zijn niet omgezet naar deze tokens** — dat vereist per-transitie-review en viel buiten de "kleine stappen"-scope; de tokens staan wel klaar voor gebruik door nieuwe/toekomstige animaties.

### 1.3 Dark Mode-fundament
Kleurtokens (`--bg`, `--card`, `--dark`, `--g1`–`--g6`, `--focus-ring`) toegevoegd binnen `@media (prefers-color-scheme: dark)`, gebaseerd op de al vastgestelde merkkleuren (`#0B1D2A`/`#0E3B4A`/`#00B894`, DEC-010). Dynamische `theme-color`-meta voor light/dark toegevoegd. **Geen volledige restyle** — bestaande light-mode-waarden ongewijzigd, conform opdracht.

### 1.4 Offline-verificatie
- **sw.js network-first-navigatie:** geverifieerd door code-inspectie (regel 55-66 van `sw.js`): `navigate`-requests doen `fetch()` eerst, met `.catch(() => caches.match('/index.html'))` als offline-fallback. **Correct geïmplementeerd, geen fout gevonden.** Dit sluit het langst openstaande punt uit CURRENT_STATE.md/Roadmap.md.
- **Cache-/asset-strategie:** statische assets zijn terecht cache-first (juist gedrag voor assets). Eén observatie, geen fout: de precache-lijst in `sw.js` bevat nog de oude Google Fonts-URL (Barlow Condensed) — functioneel geen bug, wel achterhaald zodra de merkstijl wordt doorgevoerd (Sprint 2-onderwerp, niet aangepast).
- **IndexedDB offline-queue:** code aanwezig (`OFFLINE_DB_NAME`, `openOfflineQueueModal()`), functionele bevestiging (daadwerkelijk offline testen met echte sync) valt buiten wat vanuit statische code-inspectie vast te stellen is — **niet met zekerheid vast te stellen zonder een live offline-test door de Product Owner.**
- **Foutafhandeling:** `catch()`-blokken aanwezig op zowel install- als fetch-events in sw.js; geen onafgevangen promise-rejections aangetroffen in de relevante service-worker-code.

### 1.5 Performance
- Geen render-blokkerende `setInterval`/`setTimeout`-lekken gevonden: 2 `setInterval`-aanroepen, 4 bijbehorende `clearInterval`-aanroepen — sluitend.
- 7 `addEventListener`-registraties totaal (incl. de nieuwe globale Escape-listener uit Sprint 1) — geen patroon van herhaalde registratie per render aangetroffen.
- Geen dubbele/overschreven functienamen gevonden (dead-code-indicator) — 0 treffers.
- **Niet vastgesteld:** daadwerkelijke rendertijd, DOM-updatefrequentie tijdens gebruik, of geheugengebruik over tijd — dit vereist runtime-profiling (bijv. Chrome DevTools Performance-paneel) die buiten statische code-analyse valt. Geen optimalisaties uitgevoerd omdat er geen aantoonbare aanleiding is gevonden (conform opdracht "optimaliseer alleen waar dit veilig kan").

### 1.6 UX-consistentie
- Eén concrete inconsistentie gecorrigeerd: Beheer-scherm (`s-admin`) toonde het label "Instellingen" — nu "Beheer", consistent met de rest van de navigatie en met Hoofdstuk 6.
- Overige spacing/uitlijning/typografie/knoppen/cards/modals/navigatie: bij visuele inspectie van de CSS-structuur geen inconsistenties gevonden die zonder redesign op te lossen zijn — de bestaande componentklassen (`.card`, `.ibtn`, `.tact`, `.bnav`) worden consistent hergebruikt. **Geen wijzigingen nodig binnen Sprint 1-scope.**

### 1.7 QA
| Controle | Resultaat |
|---|---|
| Syntax-validatie (`node --check`) | ✅ Geslaagd, vóór én na alle wijzigingen |
| `logic_tests.js` | ✅ **141 van 141 tests geslaagd, 0 mislukt** (zie §4) |
| Dode/dubbele functies | ✅ 0 gevonden |
| Memory-leak-patronen (interval/listener) | ✅ Geen aantoonbare lekken |
| Console errors/warnings | **Niet vastgesteld** — vereist een draaiende browsersessie; statische code bevat geen onafgevangen `throw`-patronen in de aangepaste functies |
| Broken links | Niet apart gecontroleerd — buiten de code-wijzigingen van deze sprint viel geen linkwijziging |
| PWA-/Service-Worker-fouten | Geen gevonden bij code-inspectie; `sw.js` zelf niet gewijzigd behalve de verplichte `CACHE_NAME`-bump |
| Accessibility-fouten | Zie §1.1 — structurele basis nu aanwezig; volledige WCAG-audit (bijv. axe-core-scan) niet uitgevoerd, **niet met zekerheid vast te stellen zonder geautomatiseerde scanner of live screenreader-test** |

### 1.8 Testen
- **Uitgevoerd:** volledige bestaande `logic_tests.js`-suite (141 tests, self-contained Node — geen DOM/imports nodig).
- **Niet uitgevoerd binnen deze sprint (vereist een draaiende omgeving/device, niet beschikbaar in deze audit-container):** responsive-gedrag op device, Android-gedrag, PWA-installatie, live offline/online-wisseltest, Playwright e2e. Deze staan als open testpunt in §7.
- **Geen aanvullende geautomatiseerde tests toegevoegd** — de Sprint 1-wijzigingen zijn attribuut-/focusgedrag zonder nieuwe berekenings- of businesslogica, en vallen daarmee buiten wat `logic_tests.js` (bewust DOM-loos) kan valideren. Een DOM-gebaseerde a11y-testtoevoeging is een reële optie voor een volgende sprint (zie §6).

### 1.9 Documentatie bijgewerkt
`CURRENT_STATE.md`, `DECISION_LOG.md` (DEC-011, DEC-012), `Roadmap.md` (3 punten afgevinkt), `CHANGELOG.md` (nieuw ingevuld, bestond nog niet). Zie meegeleverde bestanden.

---

## 2. Gewijzigde bestanden

| Bestand | Aard van de wijziging |
|---|---|
| `index.html` | Additief: CSS-tokenblok (dark mode/motion/focus/sr-only), skip-link, mechanische aria-attributen (nav/heading/ibtn), twee functie-uitbreidingen (`go()`, `openModal()`/`closeModal()`), één nieuwe helperfunctie-blok, label "Instellingen"→"Beheer", `APP_VER` v3.3.25→v3.3.26. Netto **+91 regels** (144 toegevoegd/gewijzigd, 53 vervangen). |
| `sw.js` | Alleen `CACHE_NAME`-bump v3325→v3326 (verplicht bij release). Geen functionele wijziging — geverifieerd correct bevonden. |
| `docs/00_Project_Management/CURRENT_STATE.md` | Bijgewerkt (§1.9) |
| `docs/00_Project_Management/DECISION_LOG.md` | DEC-011, DEC-012 toegevoegd |
| `docs/12_Roadmap/Roadmap.md` | 3 punten afgevinkt |
| `CHANGELOG.md` | Nieuw ingevuld (bestond nog niet als officieel document) |

**Niet gewijzigd:** alle Netlify Functions, alle SQL-migraties, `manifest.json`, `logic_tests.js` zelf (alleen uitgevoerd, niet aangepast).

---

## 3. Motivatie per keuze

- **Mechanische toepassing (nav/heading/ibtn) i.p.v. handmatige per-scherm-bewerking:** deze componenten zijn systeembreed identiek (H7 Component Library), dus één correcte aanpassing herhaald over alle voorkomens is veiliger dan 39 losse handmatige edits met foutkans.
- **Focus-/dialooggedrag centraal in `go()`/`openModal()`/`closeModal()` i.p.v. per scherm:** dit zijn de enige twee plekken waar respectievelijk alle schermwissels en alle 40 modals doorheen lopen — een edit op twee functies dekt de volledige app zonder 40+ schermen aan te raken. Dit is exact het "klein, veilig, hoge dekking"-principe uit Blueprint.md.
- **Geen restyle bij dark mode:** expliciet uitgesloten in de opdracht; tokens zijn wel functioneel compleet zodat een latere restyle-sprint er direct op kan bouwen.
- **Geen aanpassing aan bestaande CSS-transities voor motion-tokens:** zou per-transitie-review vereisen (potentieel tientallen plekken) — dat is geen "kleine stap" meer en is bewust uitgesteld.
- **"Instellingen"→"Beheer"-labelfix wél meegenomen:** dit is een aantoonbare fout (Sprint 0-audit §2), één regel, geen redesign — past binnen "herstel uitsluitend aantoonbare fouten".

---

## 4. Testresultaten

```
node --check index.html (geëxtraheerd script)  → SYNTAX OK (vóór én na wijzigingen)
node logic_tests.js                             → 141 geslaagd, 0 mislukt
```

Let op: het aantal van 141 wijkt af van eerder genoemde aantallen elders in de documentatie (127 in eerdere sessienotities, 55 in de oude Product Audit) — dit is het daadwerkelijke, nu geverifieerde aantal in de aangeleverde `logic_tests.js`. Geen van de Sprint 1-wijzigingen raakte de geteste functies; het testresultaat was identiek vóór en na de wijzigingen.

---

## 5. Risico's

| Risico | Toelichting |
|---|---|
| Geen live/device-test uitgevoerd | Alle bovenstaande bevindingen komen uit statische code-analyse in een server-container, niet uit een draaiende browser/device. Responsive-, Android- en PWA-installatiegedrag moeten nog door de Product Owner zelf bevestigd worden. |
| Focus-management is nieuw gedrag | `go()` verplaatst nu actief de focus bij elke schermwissel — functioneel correct getest tegen de bestaande logic-tests (die dit pad niet raken), maar **niet visueel/interactief getest**. Kleine kans op een ongewenste scroll-jump op een specifiek scherm; aanbevolen als eerste check bij handmatige acceptatie. |
| GitHub-push niet uitgevoerd | Eerder gedeelde PAT is gecompromitteerd verklaard (DEC-011) en nog niet vervangen — wijzigingen zijn als bestanden opgeleverd, niet naar de repo gepusht. |
| Dark mode activeert al bij systeeminstelling | Gebruikers met een donkere OS-voorkeur zien vanaf nu automatisch de nieuwe donkere tokens — dit is een zichtbare wijziging, ook al is het geen "restyle" in de zin van herontwerp. Als dit ongewenst vroeg is, kan de `prefers-color-scheme`-media query eenvoudig tijdelijk uitgeschakeld worden. |

---

## 6. Openstaande punten (voor Sprint 2 en verder)
- Instellingen-scherm (8.3) daadwerkelijk bouwen (grootste audit-discrepantie, zie Sprint 0.5 §4)
- Scherm-voor-scherm WCAG-doorloop met geautomatiseerde scanner (axe-core) en/of screenreader
- Bestaande CSS-transities omzetten naar de nu beschikbare motion-tokens
- Live offline-test (echte netwerkuitval, IndexedDB-sync bevestigen)
- Responsive/Android/PWA-installatietest op een echt device
- Merkstijl-restyle (kleuren/font) — bouwt direct voort op het nu aanwezige dark-mode-tokenfundament

## 7. Technische schuld
Geen nieuwe technische schuld geïntroduceerd. Twee al bekende punten blijven ongewijzigd open: single-file-architectuur (bewust uitgesteld tot na Fase 2) en het niet-gehandhaafde entitlements-schema (bewust uitgesteld tot Fase 5) — beide buiten Sprint 1-scope.

## 8. Nieuwe aanbevelingen
1. Voeg een lichte, DOM-gebaseerde a11y-smoketest toe (bijv. met jsdom) als aanvulling op de bewust DOM-loze `logic_tests.js`, zodat aria-attributen en focus-gedrag ook geautomatiseerd bewaakt worden.
2. Overweeg de sw.js-precachelijst op te schonen (oude Barlow-fonts-URL) zodra de merkstijl-restyle wordt opgepakt — geen actie nu nodig.
3. Plan de WCAG-scanner-run (axe-core) als eerste stap van Sprint 2, vóór er nieuwe schermen bijkomen — voorkomt dat nieuwe schermen dezelfde handmatige nabewerking nodig hebben.

---

## 9. Bijgewerkte scores

| Score | Sprint 0.5-uitgangswaarde | Na Sprint 1 | Toelichting |
|---|---|---|---|
| **Productscore** | 60% | **61%** | Geen nieuwe features (bewust, buiten scope); marginale stijging door gedichte labelfout en bevestigde offline-navigatie-strategie |
| **UX-score** | 45% | **50%** | Focus-management, skip-link en de Beheer-labelfix verbeteren de bestaande flows; de 12 ontbrekende schermen (grootste UX-gat) blijven ongewijzigd — vandaar geen grotere sprong |
| **Accessibility-score** | 5% | **38%** | Structurele/navigatie-basis (nav, heading, dialoog, focus, skip-link, reduced-motion) nu app-breed aanwezig; ontbreekt nog: labeling van complexere widgets, formuliervelden, en een geverifieerde WCAG-scan |
| **Release-score** | 20% | **26%** | Eén hard openstaand punt (offline-navigatie) gesloten, accessibility-basis gelegd; Privacy/Data Safety/Store-assets nog volledig afwezig — deze blijven de dominante blokkerende factor |
| **Play Store Readiness** | 15% | **19%** | Accessibility-deelscore (één van de zeven gecontroleerde categorieën uit Sprint 0.5 §12) is het enige onderdeel dat significant verbeterde; Privacy/Data Safety/Store Assets/Onboarding blijven op 0% |

**Methodenotitie (ongewijzigd t.o.v. Sprint 0.5):** dit zijn gestructureerde inschattingen op basis van geverifieerde codedekking, geen gemeten testresultaten (bijv. geen Lighthouse- of axe-core-score beschikbaar). Waar een score niet met zekerheid vast te stellen was, staat dat expliciet vermeld in plaats van ingevuld.

---

**Status:** klaar voor beoordeling door de Product Owner. Geen GitHub-push uitgevoerd (DEC-011). Bestanden hieronder zijn de volledige, bijgewerkte set (codebase + documentatie) ter review en handmatige upload.
