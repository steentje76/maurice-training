# SCREEN_IMPLEMENTATION_STANDARD_v1.md

**Bron:** de finaal goedgekeurde, gemergde Trainen v0.2-runtime (main `6dd6470`), forensisch gemeten via echte, computed styles in een headless Chromium-browser — geen schatting vanaf screenshot. Vergeleken met `docs/ux/baseline/v1/trainen-v0.2.png` en DS-01 t/m DS-05.

**Status: geen runtime-wijziging in deze sprint.** Dit document beschrijft uitsluitend wat al bestaat en werkt.

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

## D. STANDARD CARD
**Twee, bewust verschillende varianten in gebruik — GEEN mismatch stilzwijgend opgelost, zie Fase 6-rapportage onderaan:**
- **Level 1 (Eerstvolgende training, marine):** radius `22px`, achtergrond `#0E3B4A`, shadow `0 14px 30px rgba(0,0,0,.30)`, padding `14px`.
- **Level 3 (Jouw training / Start een activiteit-tiles):** radius `16px` (kaart) / `14px` (individuele tile), achtergrond wit, shadow `0 10px 26px rgba(11,29,42,.1)`.

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

## SPACING CONTRACT (Fase 6)

| Relatie | Gemeten waarde | Bestaand DS-token? | Actie |
|---|---|---|---|
| Page edge → content | 18px | Nee (`--space-lg`=16px is dichtstbijzijnd, niet exact) | **MISMATCH gerapporteerd, niet opgelost.** 18px is een pre-existing, gedeelde `.hdr`-waarde, gebruikt op meerdere schermen — geen nieuw token toegevoegd zonder brede impact-analyse. |
| Section → card | 8-10px (`.v43-lbl`-margin) | Deels (`--space-sm`=8px komt dicht in de buurt) | Aanvaardbaar, geen actie |
| Card edge → content (icon-row) | 16px | JA (`--space-lg`=16px, exact) | Reeds correct |
| Icon → text (icon-row) | 13px | Nee | **MISMATCH gerapporteerd.** Pre-existing `.v43-tmt .row{gap:13px}`, gedeeld met Running/Cycling — niet gewijzigd. |
| Text → chevron | flex-auto (geen vaste waarde) | N.v.t. | Geen mismatch, dit is bewust flexibel |
| Row → row | 0px + 1px divider | JA (divider-patroon, geen spacing-token nodig) | Reeds correct |
| Card → card | 20px (section-margin) | JA (`--space-xl`=20px, exact) | Reeds correct |
| Section → section | 20px | JA (`--space-xl`=20px, exact) | Reeds correct |

**Conclusie:** twee waarden (18px page-inset, 13px icon-gap) zijn pre-existing, gedeelde waarden die niet exact op een DS-01-token vallen. Conform Fase 6 zijn deze **gerapporteerd, niet stilzwijgend als nieuw token toegevoegd** — een toekomstige, aparte DS-01-consolidatiesprint kan beoordelen of deze bewust afwijken of alsnog genormaliseerd moeten worden, met expliciete Product Owner-afweging omdat beide waarden gedeeld zijn met andere, reeds werkende schermen (Running/Cycling).

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
