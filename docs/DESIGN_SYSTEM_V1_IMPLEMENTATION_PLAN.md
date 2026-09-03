# DESIGN_SYSTEM_V1_IMPLEMENTATION_PLAN.md

**Dit is uitsluitend een plan. Geen enkel onderdeel is uitgevoerd.**

**Status: PRODUCT OWNER APPROVED — SPECIFICATION BASELINE (3 september 2026).** DS-01 (canonical tokens: spacing/radius/elevation/semantic color mapping) en DS-02 (typography) zijn de eerstvolgende TECHNISCHE Design System-sprints, bevestigd als FIRST FOUNDATION SPRINT — maar NIET uitgevoerd in deze opdracht. DS-06 (navigatie) blijft user-facing en vereist een aparte, expliciete implementatie-opdracht na de foundation-sprints.

| # | Onderdeel | Current | Target | Dependencies | Risk | Affected surfaces | Testing | PO review |
|---|---|---|---|---|---|---|---|---|
| DS-01 | Canonical tokens (spacing/radius) | ad-hoc, consistent gebruikt, niet gedocumenteerd | benoemde schaal (zie DS v1 §4-5) | geen | LAAG | alle | visuele regressie op bestaande schermen (moet 0 verschil tonen) | JA (radius-keuze card=16px) |
| DS-02 | Typography | 1 font-stack, ad-hoc maten | benoemde schaal (§3) | DS-01 | LAAG | alle tekst | font-scaling-test, lange NL-strings | JA (display/page-title-maat) |
| DS-03 | Icons | emoji (🏋️ etc.) | consistente lijniconografie | DS-01/02 | MEDIUM (zichtbare wijziging) | bottom-nav, quick-actions, overal | visuele regressie, a11y-labels | JA (exacte iconenset) |
| DS-04 | Buttons/controls | `.btn-r/-o/-d/-sm`, `.ibtn` | PRIMARY/SECONDARY/TERTIARY/ICON/DESTRUCTIVE | DS-01/02 | LAAG (hernoemen, geen visuele wijziging verwacht) | alle CTA's | component-tests, focus/pressed-states | JA (PRIMARY: btn-r vs btn-d) |
| DS-05 | Cards | `.card` + inconsistente radius-override | Level 1-5-hiërarchie | DS-01 | MEDIUM (radius-fix kan zichtbaar zijn) | alle schermen met cards | visuele regressie | JA |
| DS-06 | Navigation | `.bnav`/`.ni`, 5 huidige tabs | 5 nieuwe tabs (Vandaag/Trainen/Inzicht/Coach/Samen) + Profiel-avatar | DS-03 (iconen) | **HOOG** (navigatiewijziging, user-facing) | hele app | navigation-tests, deep-link-tests | JA — vereist expliciete, aparte PO-implementatiegoedkeuring per opdracht 19 |
| DS-07 | Headers/avatar | geen avatar-component | canonieke avatar (§14) | geen | HOOG (nieuw component) | Profiel, Samen, Groups, Team, Coach, Gym | upload/replace/remove-tests, privacy-tests | JA |
| DS-08 | Lists | niet geïnventariseerd | te bepalen | DS-01/02/03 | ONBEKEND | overal | — | JA |
| DS-09 | Status/badges | `--status-*`-tokens bestaan, weergave niet geaudit | icoon+tekst+kleur, nooit kleur-only | DS-01 | MEDIUM (a11y) | Inzicht, Devices, Recovery | a11y-test (geen kleur-only) | JA |
| DS-10 | Charts/data | niet geïnventariseerd | UNKNOWN≠0, confidence zichtbaar | Calculation/Context/Evidence (ongewijzigd) | MEDIUM | Inzicht | a11y (accessible charts) | JA |
| DS-11 | Dialogs/sheets | `.tk-confirm-actions` bestaat, sheets niet geaudit | modal focus-trapping, canoniek patroon | DS-01/04 | MEDIUM | overal | focus-trap-test | JA |
| DS-12 | Loading/error/empty/offline | ad-hoc per scherm | gecentraliseerde contracten (§19) | geen | MEDIUM | overal | offline/error/empty-state-tests | JA |
| DS-13 | Accessibility | gedeeltelijk (`aria-label` op enkele plekken) | WCAG-conform, systematisch | alle bovenstaande | **HOOG** (grondige audit nodig) | overal | screenreader-test, contrast-test, focus-order-test | JA |
| DS-14 | Responsive | niet geïnventariseerd | device-onafhankelijk, safe-areas | DS-01-13 | MEDIUM | overal | multi-device-test | JA |
| DS-15 | Visual regression infra | bestaat niet | screenshot-diffing per scherm | alle bovenstaande | MEDIUM (nieuwe infra) | overal | zelf de teststrategie | JA (tooling-keuze) |

**Migratiestrategie:** DS-01 t/m DS-05 zijn puur onderliggende tokens/componenten en kunnen zonder zichtbare wijziging worden gecanoniseerd (behalve DS-03/DS-05 die een kleine, zichtbare correctie inhouden — apart PO-akkoord). DS-06 (navigatie) is de eerste, écht user-facing stap en vereist een aparte, expliciete implementatiegoedkeuring per scherm, conform de bestaande UX-governance-regel (opdracht 19/opdracht van eerdere sprints). DS-07 (avatar) kan parallel aan DS-06 gebouwd worden. DS-13 (accessibility) moet niet worden uitgesteld tot het einde — elke eerdere DS-stap moet zijn eigen a11y-eisen meteen meenemen.
