# SCREEN_IMPLEMENTATION_STANDARD_v1.md

**Bron:** de finaal goedgekeurde, gemergde Trainen v0.2-runtime (main `6dd6470`), forensisch gemeten via echte, computed styles in een headless Chromium-browser — geen schatting vanaf screenshot. Vergeleken met `docs/ux/baseline/v1/trainen-v0.2.png` en DS-01 t/m DS-05.

**Status: geen runtime-wijziging in deze sprint.** Dit document beschrijft uitsluitend wat al bestaat en werkt.

## CLASSIFICATIE-LEGENDA (geldt voor elke regel/patroon in dit document)

- **GLOBAL TOKEN** -- een enkele, herbruikbare waarde (kleur/maat/radius) die overal hetzelfde betekent, ongeacht component (bv. `--color-primary`, `--radius-card`).
- **REUSABLE COMPONENT** -- een samengestelde, herbruikbare UI-bouwsteen die tokens combineert (bv. Icon Container, Icon Row Pattern, Standard Card).
- **COMPONENT VARIANT** -- een gedocumenteerde afwijking van een Reusable Component voor een specifiek, herhaalbaar doel (bv. Featured Card t.o.v. Standard Card, `.tk-icon-box-sm` t.o.v. `.tk-icon-box`, `.v43-tmt-inset` t.o.v. `.v43-tmt`).
- **SCREEN-SPECIFIC COMPOSITION** -- de manier waarop Reusable Components op één scherm worden samengesteld; niet zelf herbruikbaar (bv. de exacte 5-sectie-volgorde van Trainen).
- **DATA-DEPENDENT** -- content die uit een echte databron komt en per gebruiker/moment verschilt (bv. "Training A", "7 oefeningen").
- **DEFERRED** -- bewust nog niet aangepakt, met een bekende, geplande vervolgstap (bv. bottom navigation).

Elke sectie hieronder markeert zijn onderdelen met één van deze zes labels.

## CLASSIFICATIE-OVERZICHT (secties A-Q)

| Sectie | Classificatie |
|---|---|
| A. Page Shell | SCREEN-SPECIFIC COMPOSITION (spacing-waarden zelf: GLOBAL TOKEN waar DS-01 dekt, zie Spacing Contract voor 2 uitzonderingen) |
| B. Header | REUSABLE COMPONENT (gedeeld app-breed, niet Trainen-specifiek) |
| C. Section Header | REUSABLE COMPONENT |
| D. Standard/Featured Card | REUSABLE COMPONENT + COMPONENT VARIANT (Featured t.o.v. Standard) |
| E. Icon Container | REUSABLE COMPONENT + COMPONENT VARIANT (`-sm`) |
| F. Icon Row Pattern | REUSABLE COMPONENT + COMPONENT VARIANT (`-inset`) |
| G. Destination Tile | REUSABLE COMPONENT |
| H. Action Tile | REUSABLE COMPONENT |
| I/J. Primary/Secondary Button | REUSABLE COMPONENT |
| K. Dividers | GLOBAL TOKEN (kleur/dikte) |
| L. Spacing System | GLOBAL TOKEN, met 2 gedocumenteerde uitzonderingen (zie Spacing Contract) |
| M. Typography | GLOBAL TOKEN |
| N. Responsive | REUSABLE COMPONENT-gedrag (Action Tile Grid), geen apart token |
| O. Accessibility | REUSABLE COMPONENT-gedrag, geldt voor alle componenten |
| P. Browser-Runtime Gate | DEFERRED-bewakingsmechanisme (proces, geen visueel component) |
| Q. Visual Review Gate | DEFERRED-bewakingsmechanisme (proces, geen visueel component) |
| "Training A", "7 oefeningen", programma-chip-inhoud | DATA-DEPENDENT |
| Bottom navigation | DEFERRED |

## A. PAGE SHELL
- Horizontal page inset (content): `18px` (`.hdr`-padding-left/right, hergebruikt door `.scroll`'s children impliciet).
- Top spacing: `52px` (`.hdr`-padding-top, bevat al `max(52px, safe-area-inset-top+12px)` — safe-area-bewust).
- Section-top spacing binnen `.scroll`: `8px`.
- Section-tot-section spacing: `20px` (margin-top op elke nieuwe `.v43-lbl`).

## B. HEADER
- Titel: `28px`/`800`/`-0.5px letter-spacing`/kleur `#0B1D2A`.
- Subtitel: `13px`/kleur `#888`/`2px` margin-top t.o.v. titel.
- Profiel-trigger: `36x36px` (`.ibtn`), rechtsboven, `aria-label="Profiel openen"`.

## C. SECTION HEADER
- `11px`/`800`/`1.4px letter-spacing`/uppercase/kleur `#888` (`.v43-lbl`).

## D. STANDARD CARD + FEATURED / PRIMARY ACTION CARD (formeel onderscheiden, Product Owner Review Follow-up)

Bevestigd, na onderzoek van zowel de goedgekeurde Trainen-runtime als alle zes canonical mock-ups: **dit is GEEN inconsistentie maar een bewuste, herkenbare compositie-tweedeling die al in elke mockup zichtbaar is** (de donkere "Training A"/"Volgende actie"-kaart is in zowel Vandaag als Trainen zichtbaar visueel dominanter en groter afgerond dan de witte content-kaarten eromheen).

### STANDARD CARD
- Gebruik: normale navigatie-/functie-/data-bestemmingen (Jouw training, Start een activiteit, Maken & ontdekken, Terugkijken, en de DS-05 Levels 2-5 in het algemeen).
- Radius: `16px` (`--radius-card`, canoniek DS-01-token).
- Achtergrond: wit (`--color-surface`).
- Elevation: subtiel (`--elevation-card`).

### FEATURED / PRIMARY ACTION CARD
- Gebruik: de enkelvoudige, dominante "volgende actie" per scherm (Eerstvolgende training in Trainen, "Volgende actie"/Training A in Vandaag) -- DS-05 Level 1, zoals al benoemd.
- Radius: `22px` -- **GOEDGEKEURD ALS LEGITIEME VARIANT, NIET ALS FOUT.** Zowel de gemergde runtime als de canonical Vandaag- én Trainen-mockup tonen deze grotere afronding consistent voor dit ene, specifieke kaarttype.
- Achtergrond: marine (`--color-primary-surface`).
- Elevation: sterker dan Standard Card (`0 14px 30px rgba(0,0,0,.30)` gemeten, duidelijk zwaarder dan Standard Card se `0 10px 26px rgba(11,29,42,.1)`) -- ook dit is consistent met de bedoelde, visuele dominantie van een Featured Card.
- Gedeeld tussen Vandaag en Trainen via dezelfde, canonieke `v43RenderPlan()`-functie -- reeds bewezen herbruikbaar.

**RADIUS DECISION (Final Closure, definitief): 22px is de canonieke, formeel vastgelegde FEATURED CARD-radius, gescheiden van en naast de 16px STANDARD CARD-radius.** Geen wijziging aan de runtime nodig. Toekomstige schermen (Vandaag bij migratie) gebruiken FEATURED CARD voor hun eigen, enkelvoudige hoofdactie-kaart; STANDARD CARD voor al het overige.

**HARD RULE (Final Closure): gebruik Featured Card uitsluitend wanneer er werkelijk sprake is van een dominante/uitgelichte primaire actie of context. Niet elke donkere kaart wordt automatisch Featured Card** -- de classificatie volgt uit de functie (enkelvoudige, dominante volgende-actie per scherm), niet uit de kleur alleen.

## E. ICON CONTAINER (canonical, `.tk-icon-box`)
- Standaard: `40x40px`, radius `12px`, achtergrond `rgba(0,184,148,.12)` (`--color-primary-soft`), icoon `20x20px`, kleur `#00B894` (`--color-primary`).
- Compact (`.tk-icon-box-sm`, gebruikt in Jouw training-tegels): `36x36px`, radius `10px`.
- Quick-act-tile-icoon (Start een activiteit): `36x36px` container.

## F. ICON + TEXT + CHEVRON ROW (canonical `.row` binnen `.v43-tmt`/`.v43-tmt-inset`)
**Dit is het canonieke, herbruikbare patroon uit Fase 4, exact gemeten:**
```
CARD EDGE
→ INNER PADDING     16px (links, .v43-tmt-inset) / 0px (standaard .v43-tmt, screen-afhankelijk, zie N)
→ ICON CONTAINER     40x40px, radius 12px, achtergrond --color-primary-soft
→ GAP                13px
→ TEXT BLOCK         titel 14.5px/800, subtitel 12px/#888
→ FLEX SPACE         (auto, flex-grow)
→ CHEVRON            22px, kleur volgt tekstkleur
→ INNER PADDING      16px (rechts, .v43-tmt-inset)
CARD EDGE
```
- Minimum row-hoogte: `71px` (gemeten, geen expliciete `min-height`-declaratie — volgt uit padding `15px` boven/onder + content).
- Divider: `1px solid #E5E5E5`, `border-bottom` op elke rij behalve de laatste.
- Multiline: subtitel wrapt vrij, geen `max-lines`/`text-overflow` geforceerd.

## G. DESTINATION TILE (Jouw training-stijl: verticale tegel, titel+chevron+subtitel)
Gebruikt binnen een horizontale flex-rij van gelijke breedte (`flex:1`), interne padding `12px 10px`, `.tk-icon-box-sm` bovenaan, titel+chevron op één regel, subtitel eronder.

## H. ACTION TILE (`.quick-act`, Start een activiteit)
`flex`/CSS-Grid-kolom (zie N), radius `14px`, padding `12px 6px`, `.tk-icon-box-sm` gecentreerd, label `10.5px` eronder, shadow `0 10px 26px rgba(11,29,42,.1)`.

## I. PRIMARY BUTTON
Hoogte `51px`, radius `14px`, padding `14px`, tekst `14.5px/800`, achtergrond `--color-primary` (teal). Gebruikt voor "Start training".

## J. SECONDARY BUTTON
Hoogte `51px` (gelijk aan primary in deze context), radius `14px`, padding `14px 18px`, tekst `14px/700`, transparante achtergrond, `1px solid rgba(255,255,255,.3)`-border (op marine surface). Gebruikt voor "Bekijk details".

## K. DIVIDERS
`1px solid #E5E5E5` tussen rijen binnen dezelfde kaart (bv. Training maken / Oefeningen). Geen divider tussen aparte kaarten (gebruiken card-gap i.p.v. divider).

## L. SPACING SYSTEM
Zie sectie "Spacing Contract" onderaan — bestaande DS-01-tokens (`--space-xs/-sm/-md/-lg/-xl` = 4/8/12/16/20px) dekken de meeste, maar niet alle, gemeten waarden. Mismatches expliciet gerapporteerd, niet stilzwijgend opgelost.

## M. TYPOGRAPHY HIERARCHY (gemeten, canoniek)
| Rol | Waarde |
|---|---|
| Page title | 28px / 800 |
| Page subtitle | 13px / 400 |
| Section label | 11px / 800 / uppercase / 1.4px letter-spacing |
| Card/row title | 14.5px / 800 |
| Card/row subtitle | 12px / 400 |
| Button label (primary) | 14.5px / 800 |
| Button label (secondary) | 14px / 700 |
| Action-tile label | 10.5px / 400 |

## N. RESPONSIVE RULES
Getest en bevestigd zonder horizontale overflow op 320/360/375/390/412/430px. Action-tiles (`.quick-act`) gebruiken CSS Grid (`grid-template-columns:repeat(5,1fr)`) i.p.v. flex-wrap — bewezen robuuster tegen marginale breedteverschillen (zie DECISION_LOG voor de root-cause-analyse van de eerdere flex-wrap-bug).

## O. ACCESSIBILITY RULES
- Icon-only controls (profiel-trigger, "Meer") hebben `aria-label`.
- Decoratieve iconen (met zichtbaar tekstlabel ernaast) zijn `aria-hidden="true"`.
- Interactieve kaarten gebruiken `role="button"` + `tabindex="0"` + `onkeydown`-Enter/Space-afhandeling (Eerstvolgende training-kaart) of native `<button>` (rijen/tegels) — geen onclick-div.
- Touch targets: rijen ≥71px hoog (ruim boven 44px-minimum), knoppen 51px hoog.

## P. BROWSER-RUNTIME GATE (verplicht, zie Fase 9 hieronder)
Elke toekomstige hoofdschermmigratie moet `core/fTrainenBrowserRuntime.test.js`-achtige dekking hebben: echte Chromium-render, DOM-assertions, 0 zichtbare `${...}`, console-error-check, responsive-viewporttest.

## Q. VISUAL REVIEW GATE
Canonical PNG-vergelijking + een echte, live Product Owner-mobiele-review vóór merge (bewezen noodzakelijk: source-tests alleen waren onvoldoende, zie Trainen v0.2-herstelsprints).

---

## SPACING CONTRACT (Fase 6) -- Product Owner Review Follow-up: beide afwijkingen volledig expliciet gemaakt

### DEVIATION 1

**VALUE:** `18px` (page horizontal inset, `.hdr{padding:...18px 12px}`)
**TOKEN:** geen exacte match. `--space-lg` (16px) komt het dichtst in de buurt maar is niet identiek.
**LOCATIONS:** `.hdr`-class, gedeeld door minimaal Vandaag/Trainen/Lichaam/Coach/Voortgang (alle schermen die de gedeelde header-component gebruiken) -- niet uniek aan Trainen.
**WAAROM DIT AFWIJKT:** `.hdr` is een pre-existing, app-brede component van vóór het Design System v1-tokenwerk; de 18px-waarde is nooit gemigreerd naar een DS-01-token omdat dat een repo-brede, meerdere-schermen-rakende wijziging zou zijn -- expliciet buiten de scope van elke Trainen-sprint tot nu toe.
**VISUEEL/FUNCTIONEEL EFFECT:** geen zichtbaar probleem -- de waarde is consistent overal waar `.hdr` wordt gebruikt. Het "afwijken" is uitsluitend ten opzichte van de DS-01-tokenschaal, niet ten opzichte van zichzelf.
**TOEKOMSTIGE SCHERMEN GERAAKT:** alle vijf resterende schermen (Vandaag, Inzicht, Coach, Samen, Profiel) gebruiken dezelfde, gedeelde `.hdr`-class -- een eventuele tokenmigratie zou ze allemaal tegelijk raken, nooit één scherm geïsoleerd.
**CLASSIFICATIE: C. Screen-specific** -- nee, preciezer: dit is een **APP-WIDE, PRE-EXISTING SHARED VALUE**, geen screen-specific afwijking en geen componentvariant. Het is ook geen "echte inconsistentie" in de zin van een fout -- de waarde is overal consistent. Het is een **legitieme, bestaande waarde die nog niet als DS-01-token is vastgelegd.**
**DECISION (Final Closure, definitief):** 18px is een **APPROVED RUNTIME VALUE + DOCUMENTED IMPLEMENTATION VALUE** -- geen automatisch nieuw globaal spacing-token. Geen runtime aanpassen. Een eventuele toekomstige token-normalisatie is een aparte, cross-screen Design System-beslissing, niet gekoppeld aan enige schermmigratie.

### DEVIATION 2

**VALUE:** `13px` (icon-naar-tekst gap in de Icon Row Pattern, `.v43-tmt .row{gap:13px}`)
**TOKEN:** geen exacte match. Geen DS-01-spacing-token van 13px bestaat; `--space-sm` (8px) en `--space-md` (12px) zijn de dichtstbijzijnde, geen van beide exact.
**LOCATIONS:** de gedeelde `.v43-tmt .row`-class, gebruikt in Trainen (Training maken/Oefeningen/Trainingshistorie) EN in Running/Cycling (`running-vormen-lijst`, `running-hist-lijst`, `cycling-vormen-lijst`, `cycling-hist-lijst`).
**WAAROM DIT AFWIJKT:** `.v43-tmt` is een pre-existing, gedeeld patroon van vóór DS-01; de 13px-gap is nooit heroverwogen tijdens de Trainen-migratie omdat wijziging aan deze gedeelde class Running/Cycling zou raken -- expliciet buiten scope gehouden (zie eerdere Trainen-sprints, "geen ander scherm").
**VISUEEL/FUNCTIONEEL EFFECT:** geen zichtbaar probleem, consistent gebruik binnen alle drie de schermen die de class delen.
**TOEKOMSTIGE SCHERMEN GERAAKT:** Profiel (dat zeer waarschijnlijk hetzelfde Icon Row Pattern hergebruikt, zie Future Screen Reuse Map) zou deze 13px-gap overnemen tenzij expliciet anders besloten.
**CLASSIFICATIE: C. Screen-specific** -- nee, preciezer: net als Deviation 1, een **APP-WIDE, PRE-EXISTING SHARED VALUE** binnen een reeds bestaand, gedeeld component-patroon. Geen inconsistentie (consistent binnen zijn eigen gebruik), geen bewust ontworpen componentvariant (nooit expliciet als zodanig vastgelegd totdat deze sprint het meette en documenteerde).
**DECISION (Final Closure, definitief):** 13px is een **APPROVED RUNTIME VALUE + DOCUMENTED IMPLEMENTATION VALUE** -- geen automatisch nieuw globaal spacing-token. Geen runtime aanpassen. Een eventuele toekomstige token-normalisatie is een aparte, cross-screen Design System-beslissing.

**Samenvattend, herclassificatie t.o.v. het vorige rapport:** beide afwijkingen zijn bij nader onderzoek geen "A. echte inconsistentie" (er is geen enkel geval waar dezelfde waarde inconsistent wordt toegepast) en geen "D. nog Product Owner-besluit nodig voor Trainen zelf" (Trainen hoeft niet te wachten -- de waarden werken correct zoals ze zijn). Ze zijn correct geclassificeerd als **pre-existing, app-brede, gedeelde waarden die nog niet in de DS-01-tokenschaal zijn opgenomen** -- een documentatiegat, geen functioneel of visueel probleem. Het Product Owner-besluit dat eventueel nodig is (nieuw token toevoegen vs. normaliseren) is een DS-01-consolidatiebeslissing, geen Trainen-v0.2-goedkeuringsblokkade.

## COMPONENT INVENTORY (Fase 7)

| Pattern | Canonical component | Current class | Token dependencies | Used in Trainen | Expected future screens | Variants allowed | Variants forbidden |
|---|---|---|---|---|---|---|---|
| Icon container | Icon Container Standard | `.tk-icon-box` / `.tk-icon-box-sm` | `--color-primary-soft`, `--color-primary` | Ja (11x) | Vandaag, Inzicht, Coach, Samen, Profiel | compact/standard/feature-maten | willekeurige, per-scherm hardcoded maat/kleur |
| Icon+text+chevron row | Icon Row Pattern | `.row` binnen `.v43-tmt`/`.v43-tmt-inset` | `--space-lg` (16px inset), bestaande `.v43-tmt`-gap | Ja (3x) | Profiel/settings, Samen, Coach, Inzicht-destinations | inset-variant (`.v43-tmt-inset`) voor consistente 16px-padding | een vierde, lokale kopie-variant zonder gedocumenteerde reden |
| Standard card (Level 3) | Standard Card | `.tk-card.tk-card-l3` | `--radius-card` (16px), `--elevation-card` | Ja | alle | Level 1-5 zoals gedefinieerd in DS-05 | een zesde, ongedocumenteerd niveau |
| Primary action card (Level 1) | Primary Action Card | `.v43-plan` (marine-override) | `--color-primary-surface` (conceptueel), radius 22px (mismatch, zie hieronder) | Ja | Vandaag (gedeelde functie, `v43RenderPlan()`) | — | een tweede, aparte marine-kaart-implementatie naast de bestaande, gedeelde `v43RenderPlan()` |
| Action tile (grid) | Action Tile Grid | `.quick-act` binnen `display:grid;grid-template-columns:repeat(5,1fr)` | `--space-sm` (gap 8px) | Ja (5x) | overal waar een vaste, gelijke keuzerij nodig is | 3-6 kolommen | flex-wrap voor een vast aantal, gelijke kolommen (bewezen buggevoelig) |
| Primary button | Primary Button | `.v43-start` | `--color-primary` | Ja | Vandaag (gedeeld) | — | een nieuwe, lokale primary-button-stijl |
| Secondary button (op marine) | Secondary Button (inverse) | `.v43-details` | — (transparant + witte border, geen bestaand token voor "op-marine"-outline) | Ja (nieuw, deze sprint) | overal waar een secundaire actie op een marine/donkere surface nodig is | — | — |

**KNOWN MISMATCH, expliciet niet stilzwijgend opgelost (conform Fase 6):** de Level 1 "Eerstvolgende training"-kaart gebruikt radius `22px`, terwijl DS-05 `--radius-card` (16px) als canonieke standaard voor alle cardlevels vastlegt. Dit is een **pre-existing, gedeelde waarde** (ook gebruikt door Home's identieke kaart, via dezelfde `v43RenderPlan()`-functie) — niet in deze of enige Trainen-sprint gewijzigd, om Home niet te raken. Een toekomstige, aparte DS-05-consolidatiesprint moet expliciet beslissen of deze 22px een bewuste, goedgekeurde uitzondering wordt (Level-1-kaarten mogen groter radius hebben) of alsnog naar 16px genormaliseerd wordt — met Product Owner-review, niet autonoom door Claude.

## SEGMENTED CONTROLS -- ANALYSE VAN DE VIJF RESTERENDE CANONICAL MOCK-UPS (Product Owner Review Follow-up)

Alle vijf resterende mock-ups (Vandaag, Inzicht, Coach, Samen, Profiel) visueel, opnieuw geïnspecteerd op keuzecomponenten. **Geen automatisch één component toegepast** -- drie semantisch verschillende patronen gevonden, plus twee schermen zonder enig segmented-control-achtig element.

| Scherm | Element | Type | Aantal opties | Effect bij wisselen | Visuele vorm |
|---|---|---|---|---|---|
| Inzicht | "7 dagen / 4 weken / 3 maanden" | **Period selector** | 3 | filtert data binnen dezelfde view, geen contentwissel | compacte pills, één teal-actief |
| Inzicht | "Alle sporten ▾" | **Filter chip / dropdown** (GEEN segmented control) | open lijst | filtert data, opent een aparte lijst-keuze | enkele, klikbare pill met chevron |
| Coach | "AI Coach / Mijn coach" | **Mode switch (top-level content tab, met badge)** | 2 | wisselt volledig andere content-sectie binnen het scherm | 2 gelijke-breedte, volle-hoogte blokken, badge op inactief |
| Samen | "Overzicht / Feed / Vrienden / Groepen / Clubs" | **Top-level content tab bar** | 5 | wisselt volledig andere content-sectie binnen het scherm | tekstlabels, één gevulde pill-actief-staat, variabele breedte per label |
| Vandaag | -- | geen segmented-control-element gevonden | -- | -- | -- |
| Profiel | -- | geen segmented-control-element gevonden (uitsluitend Icon Row Pattern; nieuwe observatie: icon-container-kleur varieert per sectie -- groen/paars/blauw i.p.v. uitsluitend teal) | -- | -- | -- |

### SHARED VISUAL FOUNDATION + SEMANTIC VARIANTS

Bevestigd: de drie gevonden patronen delen een herkenbare, gemeenschappelijke basis (pill-vormige of blok-vormige opties, één teal/gevulde actieve staat, neutrale inactieve staat) -- genoeg om een gedeelde foundation te rechtvaardigen. Maar Coach (2 items) en Samen (5 items) verschillen zowel in itemaantal als in exacte visuele vorm (gelijke blokken vs. variabele-breedte tekstlabels) -- **geen abstractie geforceerd** waar de mock-ups zelf een verschil laten zien.

**Voorgestelde, niet-geïmplementeerde structuur (component-planning, geen code):**
```
tk-segmented-control (shared foundation: pill/blok-groep, actief/inactief-styling, teal-token)
  - .tk-segmented-control--period    (Inzicht-stijl: 2-4 compacte pills, filtert data)
  - .tk-segmented-control--mode      (Coach-stijl: 2 gelijke blokken, content-wissel, ondersteunt badge)
```
**PRODUCT OWNER FINAL DECISION (Screen Implementation Standard v1 Final Closure):** de eerdere open vraag is definitief beslist. **Samen's 5-item content-tab-bar is GEEN derde `tk-segmented-control`-variant.** Het is semantisch een fundamenteel ander component: **SECTION TABS / LOCAL NAVIGATION** — lokale navigatie tussen verschillende subsecties binnen één scherm, niet een dataweergave-filter (zoals Period Selector) en niet een wissel tussen twee contentmodi (zoals Content Mode Switch). **HARD RULE, geldt voortaan: semantiek bepaalt de componentkeuze, visuele gelijkenis alleen is onvoldoende.** Componenten mogen onderliggende Design System-tokens delen (kleur, pill-vorm) zonder dezelfde semantische component te zijn.

### DEFINITIEF, GOEDGEKEURD SEMANTISCH COMPONENTMODEL (vier, elk apart)

| # | Naam | Voorbeeld | Betekenis | Component |
|---|---|---|---|---|
| A | **Period Selector** | Inzicht: 7 dagen \| 4 weken \| 3 maanden | zelfde inhoud/dataset, ander tijdsvenster | `.tk-segmented-control--period` |
| B | **Content Mode Switch** | Coach: AI Coach \| Mijn coach | wisselt tussen twee fundamenteel verschillende contentmodi | `.tk-segmented-control--mode` |
| C | **Section Tabs / Local Navigation** | Samen: Overzicht \| Feed \| Vrienden \| Groepen \| Clubs | lokale navigatie tussen subsecties binnen één scherm — GEEN derde segmented-control-variant | eigen, apart component (nog te bouwen, niet deze sprint) |
| D | **Filter Chip / Dropdown** | Inzicht: Alle sporten ▾ | filtert de bestaande inhoud | apart component, geen segmented control |

Deze classificatie is nu **definitief en goedgekeurd** — geen open vraag meer.

**FUTURE SCREENS:** Inzicht en Coach zijn de eerste twee kandidaten om `tk-segmented-control` (Period Selector- en Content Mode Switch-varianten) daadwerkelijk te bouwen (bij hun eigen migratie, niet nu). Samen krijgt geen `tk-segmented-control`-variant, maar een eigen, apart Section Tabs-component (eveneens pas bij zijn eigen migratie te bouwen).

**Filter chip/dropdown (Inzicht "Alle sporten") is expliciet GEEN segmented control** -- apart component, geen overlap met bovenstaande.

## NO-DUPLICATION RULE (Fase 8, canoniek, geldt voortaan)

VÓÓR het schrijven van nieuwe UI-CSS voor een toekomstig scherm:
1. doorzoek `docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md`;
2. doorzoek dit document (`SCREEN_IMPLEMENTATION_STANDARD_v1.md`);
3. doorzoek bestaande, herbruikbare componenten in `index.html` (`.tk-icon-box`, `.tk-card-l*`, `.v43-tmt(-inset)`, `.quick-act`, `.tk-btn-*`);
4. hergebruik wanneer semantisch gelijkwaardig;
5. maak een variant uitsluitend met een gedocumenteerde reden (zoals `.v43-tmt-inset` t.o.v. `.v43-tmt`);
6. maak een volledig nieuwe component alleen wanneer die functioneel/visueel écht anders is.

Geen schermspecifieke kopieën van icon-containers, rijen, knoppen, kaarten, section-headings, chevrons of profile-triggers zonder aantoonbare noodzaak.

---

## FUTURE SCREEN REUSE MAP (Fase 11 — uitsluitend componentplanning, NIETS geïmplementeerd)

### VANDAAG (v0.11)
- page shell → reuse
- header/profile-trigger → reuse
- section heading → reuse
- Eerstvolgende training-kaart → reuse (reeds gedeeld via `v43RenderPlan()`)
- "Waarom vandaag?"-uitklap → NEW component (niet eerder gebouwd in Trainen)
- Timeline (Vandaag-tijdlijn) → NEW component
- SAMEN-activiteitenfeed-preview → reuse van toekomstig Samen-icon-row-patroon, indien Samen eerder gebouwd wordt
- Snel-tegels (Vrij trainen/Training maken/Planning/Metingen/Voeding loggen) → reuse Action Tile Grid

### INZICHT (v0.1)
- page shell / header → reuse
- periodefilter (7 dagen/4 weken/3 maanden) → NEW component (segmented control, nog niet in DS-04 gedefinieerd)
- "Snel overzicht"-metric-tegels → reuse Standard Card (Level 4, compact data/status) waar mogelijk, mogelijk variant nodig voor ring-grafieken
- Prestaties/Herstel/Belasting/Lichaam/Verbanden/Doelen-rijen → reuse Icon Row Pattern (exact het patroon uit Trainen)
- Sparkline-grafieken → NEW component
- "Belangrijkste inzichten"-kaarten → reuse Standard Card, variant met trend-icoon

### COACH (v0.2)
- page shell / header → reuse
- AI Coach/Mijn coach-tabs → NEW component (segmented control, zelfde nieuw-component-behoefte als Inzicht se periodefilter — kans op hergebruik tussen beide)
- AI-sparkle-kaart → reuse Primary Action Card-concept, andere kleur/inhoud
- "Actuele coach inzichten"-rijen → reuse Icon Row Pattern
- "Recente gesprekken"-rijen → reuse Icon Row Pattern, met avatar i.p.v. icon-box voor menselijke coach-berichten (NEW: avatar-in-row-variant)

### SAMEN (v0.1)
- page shell / header → reuse
- Overzicht/Feed/Vrienden/Groepen/Clubs-tabs → NEW component (zelfde segmented-control-behoefte als Inzicht/Coach)
- Vrienden/Groepen/Challenges/Berichten/Gym-Club-tegels → reuse Action Tile Grid-concept (5 tegels, gelijke breedte)
- Activiteit-in-je-netwerk-kaarten → NEW component (social feed card, met foto/like/comment — geen bestaand equivalent)
- Actieve challenges → reuse Standard Card, variant met voortgangsbalk
- Vrienden online (avatar-rij) → NEW component (horizontale avatar-scroll)

### PROFIEL (v0.1)
- page shell → reuse (maar GEEN bottom-nav, avatar-trigger is de ingang, niet de bestemming)
- profielkaart (avatar groot, naam, badge) → NEW component
- Mijn profiel / Voorkeuren & instellingen / Ondersteuning & account-secties → reuse Icon Row Pattern (vrijwel 1-op-1, dit is de meest directe hergebruikkans van alle vijf schermen)
- Canonical avatar-component (upload/replace/remove/initials-fallback) → NEW component (nog nergens gebouwd, zoals eerder vastgesteld in de Design System-sprints)

**Belangrijkste, terugkerende NEW-component-behoefte over alle vijf schermen: een segmented-control/tab-patroon** (Inzicht-periodefilter, Coach AI/Mijn-coach, Samen Overzicht/Feed/etc.) — een goede kandidaat om als eerste, gedeelde component te bouwen zodra de eerste van deze schermen wordt gemigreerd, in plaats van vijf keer apart.
