# UX-1 CURRENT-vs-CANONICAL DELTA ANALYSE (minimal-change)

## INZICHT — polish, GEEN redesign

Code-inspectie van `#s-inzicht` toont dat de huidige implementatie de
canonical compositie al vrijwel 1-op-1 volgt:

| Canonical element | Current | Oordeel |
|---|---|---|
| Titel "Inzicht" + "Jouw ontwikkeling en herstel" | identiek aanwezig | 1. AL GOED |
| Periodefilter 7 dagen / 4 weken / 3 maanden | aanwezig | 1. AL GOED |
| Sportfilter "Alle sporten" | `#inzicht-sport-filter` | 1. AL GOED |
| "Jouw ontwikkeling" + KPI-grid + insight | `#inzicht-summary-grid`, `#inzicht-dev-insight` | 1. AL GOED |
| "Snel overzicht" | `#inzicht-overview-grid` | 1. AL GOED |
| "Domeinen" | `#inzicht-domain-list` | 1. AL GOED |
| "Recente inzichten" | `#inzicht-recent-list` | 1. AL GOED |
| CTA "Bekijk alle inzichten en trends" | aanwezig | 1. AL GOED |

**Conclusie: mijn eerdere PROPOSED-INZICHT was een overbodig redesign.**
De structuur hoefde niet te veranderen. Alleen polish is nodig:

- 5. POLISH: KPI-responsiviteit op 390px (4 kolommen worden krap), typografische
  hiërarchie, spacing/grouping, chart-leesbaarheid, canonical icoonbehandeling.
- 5. POLISH: eerlijke UNKNOWN/PARTIAL-states binnen de bestaande visualisatie-
  componenten (`tkRenderHealthChart` heeft al een empty-state; die uitbreiden
  naar PARTIAL i.p.v. een nieuw component bouwen).
- 6. ECHT WIJZIGEN: nav-labels naar canonical IA; dev-banner "Preview: nieuw
  Inzicht-scherm (v0.1)" verwijderen uit de eindgebruiker-UI.

## TRAINEN — polish, GEEN redesign

| Canonical element | Current | Oordeel |
|---|---|---|
| Titel "Trainen" | aanwezig | AL GOED |
| "Eerstvolgende training" + empty-state "Nog geen training gepland" | aanwezig | AL GOED (heeft zelfs een nette empty-state) |
| "Jouw training": Mijn trainingen / Programma's / Planning | aanwezig | AL GOED |
| "Start een activiteit": Kracht/Hardlopen/Fietsen/HYROX/Meer | aanwezig | AL GOED |
| "Sport vandaag" | aanwezig, NIET in canonical | 3. CURRENT RIJKER — behouden |

- 4. ABSOLUUT BEHOUDEN: "Sport vandaag", de bestaande empty-state, en de
  volledige execution-entry (uit de screenrecording: herstel per spiergroep,
  voorgesteld gewicht, vorige keer, aanpassingen).
- 5. POLISH: CTA-hiërarchie en spacing/density op 390px.

## LICHAAM / HERSTELVISUALISATIE — canonicaliseren

Component: `MALE/FEMALE_FRONT/BACK_SVG` (38 spiergroep-elementen),
`MUSCLE_NAME_TO_SVG_IDS` (14 groepen incl. aggregaten), `SVG_ID_RECOVERY_HOURS`
met expliciete prioriteitsvolgorde, `recoveryHeatmapView` (front/back),
`openSpierDetail()` (tap), `v43HomeRecColor()` — die laatste is blijkens het
commentaar al **gedeeld door Home-hero en Lichaam**.

Dat gedeelde-kleurfunctie-patroon is precies de juiste architectuur: één
herstelmodel, twee presentaties. **Vandaag hergebruikt dus de bestaande
component in compacte vorm; er komt geen tweede herstelmodel en geen tweede
calculation source.**

Statuslabels: Hersteld / Aandacht / Vermoeid — af te leiden uit de bestaande
`SVG_ID_RECOVERY_HOURS`, geen nieuwe berekening.

## Minimal-change conclusie

Van de zes schermen vereist **geen enkele** een fundamenteel redesign.
Vandaag/Inzicht/Trainen/Coach/Profiel: polish + canonical IA.
Samen: polish + de twee goedgekeurde capabilities (avatar, challenge-target).
