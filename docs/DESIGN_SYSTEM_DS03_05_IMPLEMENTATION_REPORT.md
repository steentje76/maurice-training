# DESIGN_SYSTEM_DS03_05_IMPLEMENTATION_REPORT.md

## 1. Baseline
Main vóór deze sprint: `74871975f96fc089e2289ab80013edc42fa015dd` (PR #227 merge, DS-01/DS-02 CLOSED). APP_VER v4.69.53 → v4.69.54.

## 2. Source Register
| Source | Fully read/visually inspected | Relevance | Constraints derived |
|---|---|---|---|
| `docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md` | VOLLEDIG (zelf geschreven, herlezen) | component/token-contract | PRIMARY=teal, marine=surfaces, radius-card=16px, AI=sparkle |
| `docs/DESIGN_SYSTEM_V1_IMPLEMENTATION_PLAN.md` | VOLLEDIG | DS-03/04/05-scope | DS-03 MEDIUM-risico (zichtbare wijziging), DS-04/05 LAAG |
| `docs/DESIGN_SYSTEM_V1_FOUNDATION_IMPLEMENTATION_REPORT.md` | VOLLEDIG (zelf geschreven) | DS-01/02-basis | tokens die DS-03/04/05 moeten hergebruiken |
| `docs/DESIGN_SYSTEM_CURRENT_IMPLEMENTATION_AUDIT.md` | VOLLEDIG | bestaande patronen | `.btn-r/-o/-d`, `.card`, `.bnav`/`.ni` blijven onaangeraakt |
| `docs/UX_BASELINE_PRESERVATION_MATRIX.md` | VOLLEDIG | preservatie-eisen per scherm | geen scherm migreren |
| `docs/UX_CURRENT_TARGET_GAP_MATRIX.md` | VOLLEDIG | migratierisico's | DS-06 (navigatie) blijft apart, user-facing |
| `docs/ux/baseline/v1/README.md` | VOLLEDIG | hash/contract-bron | conflict rules, avatar/mockdata-waarschuwingen |
| Alle 6 canonical PNG's | VISUEEL herbevestigd (coach-v0.2.png expliciet opnieuw bekeken: sparkle, geen robot) | visuele compositie-bron | card-curvature, teal CTA, marine surfaces, line-icon-karakter |

## 3. Current pattern audit
Zie `docs/DESIGN_SYSTEM_DS03_05_CURRENT_PATTERN_AUDIT.md`. Kernbevinding: 31 van 44 bestaande SVG's gebruiken al exact de gevraagde outline/line-stijl — geen nieuwe icon-library nodig.

## 4. Icon strategy
**BESLISSING: hergebruik van de bestaande inline-SVG-conventie** (`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`). **WHY:** al bewezen, consistent, 0 bundle-impact, 0 CDN/offline-risico, geen licentiekwestie (eigen paden). **ALTERNATIVES:** een externe library (Feather/Lucide/Heroicons) zou een dependency/build-stap vereisen in een single-file PWA zonder build-pipeline — geen aantoonbare meerwaarde. **LICENSE:** n.v.t. **BUNDLE/OFFLINE IMPACT:** 0.

## 5. Icon registry
`core/designSystemIcons.js` — 55 semantische iconen, 4 maten (inline/standard/feature/navigation), accessible-by-default (`tkIcon(name, {label})`).

## 6. Button system
6 varianten (`.tk-btn-primary/-secondary/-tertiary/-destructive/-icon` + gedeelde `.tk-btn`). PRIMARY=`--color-primary` (teal). Destructive semantisch beperkt. States: default/disabled/loading/focus (hergebruikt bestaande `:focus-visible`). Min. 44px touch target.

## 7. Card system
5 levels (`.tk-card-l1..l5`), gedeeld `--radius-card:16px`. Level 1 marine/dominant, Level 4 met expliciete UNKNOWN-presentatie, card-als-actie via semantisch `button`/`a`.

## 8. Accessibility
`:focus-visible` hergebruikt (geen duplicatie — zie sectie 12), icon-only actions vereisen `aria-label`, disabled via `disabled`+`aria-disabled`, loading-spinner zonder layout shift, `data-state`-attributen i.p.v. kleur-only semantiek.

## 9. Dark mode
Alle nieuwe classes gebruiken uitsluitend `var(--color-*)`/`var(--radius-*)`/`var(--elevation-*)`-tokens, die zelf al per-thema (light/dark/`prefers-color-scheme`) correct wijzen naar de bestaande, bewezen dark-mode-tokens (`--card`, `--dark`, `--accent`, etc.). Geen nieuwe, aparte dark-mode-regels nodig — de bestaande tokeninfrastructuur draagt dit automatisch.

## 10. Visual baseline comparison
| Aspect | Canonical PNG | Nieuwe componenten |
|---|---|---|
| Card curvature | zichtbaar afgerond, ~16px-gevoel | `--radius-card:16px` ✓ |
| Teal CTA | "Start training"-knop is teal | `.tk-btn-primary` = teal ✓ |
| Marine surfaces | "Training A"-kaart is donker marine | `.tk-card-l1` = marine ✓ |
| Line icon character | rustige, dunne lijnpictogrammen (bv. weer/device-iconen) | `tkIcon()` = 24x24, stroke=2, outline-only ✓ |
| AI sparkle | Coach v0.2, geen robot | `aisparkle`-icoon = sterretjes-vorm, geen robot ✓ |

## 11. Tests
`core/fDesignSystemComponents.test.js` (nieuw, 39/39). Volledige regressie: release gate 232/232 (was 231, +1 testbestand), Android 29/29, doc-consistency groen.

## 12. Sabotage results
| # | Sabotage | Gedetecteerd | Hersteld |
|---|---|---|---|
| 1 | Primary-knop naar marine-kleur | JA (2 assertions falen) | JA, hash/inhoud herbevestigd |
| 2 | Structurele emoji in icon-registry | JA (1 assertion faalt) | JA |
| 3 | Card-radius gewijzigd | JA (bestaande DS-01-test faalt) | JA |
| 4 | Canonical PNG-byte gewijzigd | JA (1 assertion faalt) | JA, hash exact herbevestigd |

**Zelf gevonden, extra correctie (buiten de sabotage-opdracht):** de vorige DS-01/DS-02-sprint had onbedoeld een dubbele `:focus-visible`/`prefers-reduced-motion`-regel geïntroduceerd naast reeds bestaande, oudere regels ("Sprint 1"/"Sprint v3.3.35") — geen functionele bug, wel een onbedoelde dubbele waarheid. Verwijderd tijdens deze sprint; testsuite bijgewerkt om dit te bewaken.

## 13. Functional preservation
Cross-domain regressietests: Entitlements (52), Team Operations (21), Canonical Gym (9), Admin Auth (8), Women's Performance (9), Recovery (9), Connected Equipment (7), Ergometer Canonical Activities (7) — 0 falen.

## 14. Runtime files changed
`index.html` (additieve CSS: DS-03/04/05-classes + de zelf gevonden accessibility-deduplicatie), `core/designSystemIcons.js` (nieuw), `sw.js`, `android/app/build.gradle` (versie-governance).

## 15. Open implementation gaps
Ongewijzigd: exacte kleinere-radius-waarde voor compacte controls, exacte elevation-sterktes floating/modal, exact data-visualisatiepalet — **niet** deze sprint autonoom ingevuld (buiten DS-03/04/05-scope).

## 16. Explicitly NOT implemented
Geen van de zes hoofdschermen gemigreerd. Geen navigatie gewijzigd. Geen repo-brede vervanging van bestaande emoji/`.btn-*`/`.card`-gebruik (strangler-aanpak: legacy blijft bestaan). Geen debug-/showcase-route toegevoegd (component-tests gebruikt i.p.v. een nieuwe, zichtbare route).

## 17. Recommended next step
**EERSTE GECONTROLEERDE SCREEN MIGRATION — voorkeurskandidaat: TRAINEN v0.2.** Niet automatisch gestart.
