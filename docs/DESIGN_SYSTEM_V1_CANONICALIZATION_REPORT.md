# DESIGN_SYSTEM_V1_CANONICALIZATION_REPORT.md

## A. Baseline
Datum: 3 september 2026. Primaire navigatie (goedgekeurd, NIET geïmplementeerd): Vandaag|Trainen|Inzicht|Coach|Samen + Profiel (avatar rechtsboven, geen bottom-tab). Zes referentieconcepten: Vandaag v0.11, Trainen v0.2, Inzicht v0.1, Coach v0.2 (GEEN robotmascotte), Samen v0.1, Profiel v0.1.

## B. Repository status
Branch: `docs/design-system-v1`. HEAD vóór deze sprint / origin/main: `c0ec6c1d1b405d31422a2314e921b060bb73c895`. APP_VER: v4.69.52 (ongewijzigd). Working tree: schoon vóór start. PR #222: OPEN, NIET GEMERGED (geverifieerd, ongemoeid). Target-branch: `docs/target-product-architecture` @ `1fade944a...` (ongewijzigd). Technical admin/org canonicalization: Track A + Track B beide **CLOSED en gemerged** (PR #223, #224).

## C. Documents created
`docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md`, `docs/DESIGN_SYSTEM_CURRENT_IMPLEMENTATION_AUDIT.md`, `docs/UX_BASELINE_PRESERVATION_MATRIX.md`, `docs/UX_CURRENT_TARGET_GAP_MATRIX.md`, `docs/DESIGN_SYSTEM_V1_IMPLEMENTATION_PLAN.md`, `docs/FUNCTIONAL_PRESERVATION_CHECKLIST.md`, dit rapport.

## D. Existing design implementation discovered
Een verrassend volwassen, al grotendeels baseline-conform tokensysteem: `--accent:#00B894` (teal) en `--accent2:#0E3B4A` (marine) matchen de goedgekeurde kleuren vrijwel exact. Volledige dark-mode-ondersteuning (automatisch + handmatig). Motion-tokens volledig gedefinieerd. Status- en belastingstokens bestaan al.

## E. Reusable components
Kleurtokens, dark mode, motion-tokens, status/load-tokens, button-basisklassen (`.btn-r/-o/-d`), card-basisstructuur (`.card`/`.card-hd`/`.card-body`), bottom-navigation-structuur (`.bnav`/`.ni`) — allen structureel herbruikbaar, geen wijziging nodig aan de onderliggende mechaniek.

## F. Inconsistencies
(1) Cardradius: globaal token `8px` vs. een lokale override `16px` — niet geünificeerd. (2) Buttons: twee concurrerende "primary"-kandidaten (`.btn-r` dark vs. `.btn-d` accent) zonder canonieke keuze. (3) Bottom-nav-iconen zijn emoji, niet de gevraagde lijniconografie. (4) Geen gedocumenteerde type-/spacing-schaal (wel consistent gebruikt).

## G. Proposed tokens
Zie `TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md` §2-8, alles gemarkeerd A/B/C/D. Belangrijkste PROPOSED (D), PO-beslissing nodig: AI-identity-kleur, data-visualisatiepalet, canonieke PRIMARY-button-keuze, exacte card-radius-canonisatie, exacte iconenset.

## H. Accessibility gaps
Geen systematische audit binnen dit tijdsbudget mogelijk gebleken — gedeeltelijke dekking gezien (`aria-label`/`aria-level` op enkele plekken), geen volledig beeld. Expliciet geregistreerd als DS-13, niet stilzwijgend opgelost of overgeslagen.

## I. Responsive gaps
Niet apart geïnventariseerd binnen dit tijdsbudget — geregistreerd als DS-14, open.

## J. Migration risks
Grootste risico: DS-06 (navigatie) is de eerste, echt user-facing wijziging en vereist een aparte, expliciete PO-implementatiegoedkeuring per scherm — mag niet in één keer met de Design System-canonicalisatie worden meegenomen. Tweede risico: Inzicht-samenvoeging van de huidige Lichaam+Voortgang-tabs is de meest omvangrijke herstructurering (HOOG, in de gap-matrix).

## K. Functional preservation risks
Geregistreerd in `FUNCTIONAL_PRESERVATION_CHECKLIST.md` — alle bestaande capabilities (inclusief de recent afgesloten Track A/B canonical-gym-architectuur en de HRV/cyclus-confidence-fixes) blijven expliciet behouden, ongeacht of ze zichtbaar waren in de v0.x-mockups.

## L. Unresolved Product Owner decisions
AI-identity-kleur; data-visualisatiepalet; PRIMARY-button-keuze (`.btn-r` vs `.btn-d`); exacte card-radius (8 vs 16px); exacte iconenset voor lijniconografie; DESTRUCTIVE-button-stijl; TERTIARY/text-action-stijl; modal/floating-elevation-waarden; icon-size/control-height-schaal.

## M. Recommended first implementation sprint
**DS-01 (canonical tokens: spacing/radius) + DS-02 (typography)** — laagste risico, geen zichtbare wijziging verwacht, legt het fundament voor alle latere, wél zichtbare stappen. NIET starten met DS-06 (navigatie) zonder aparte PO-goedkeuring per scherm.

## N. Exact git evidence
Branch: `docs/design-system-v1`. Base SHA: `c0ec6c1d1b405d31422a2314e921b060bb73c895`. Alle wijzigingen: nieuwe bestanden onder `docs/`, geen enkele wijziging aan `index.html`, `sw.js`, `core/*.js`, of `netlify/functions/*.js`.

## O. PR status
Wordt aangemaakt na dit rapport. NIET auto-gemerged (conform opdracht). PR #222 ongewijzigd (geverifieerd vóór en na deze sprint).

## Final self-audit (sectie 26, alle 14 vragen — geen enkele ongewenste "ja")
Geen bestaande UX gewijzigd. Geen navigatie gewijzigd. Geen mockdata als productwaarheid behandeld. Geen ongemarkeerde kleur-/pixelkeuzes (alles A/B/C/D). Geen robotmascotte geïntroduceerd. Profiel niet als bottom-tab gemaakt. Geen bestaande functionaliteit verwijderd. Accessibility niet als polish behandeld (expliciet vooraan in het plan). UI niet verantwoordelijk gemaakt voor calculations. AI geen extra bevoegdheid gegeven. Geen automatische social exposure van health-data. Payment niet gelijkgesteld aan authorization. PR #222 niet aangeraakt. Geen user-facing werk zonder PO-approval uitgevoerd.

## EINDSTATUS
**DESIGN SYSTEM V1 SPECIFIED — READY FOR PRODUCT OWNER REVIEW**
