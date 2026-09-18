# Trainingskompas UX Design Engine v1

**Status:** CANONICAL FOUNDATION — PRE-CODE UX GATE  
**Baseline:** main `b7c77e4a2e5d8b995931a32b1c64ad559294c26b`

## Doel
De UX Design Engine maakt nieuwe en gewijzigde TK-schermen sneller, consistenter en toetsbaar. Productcode mag niet beginnen vanuit een losse afbeelding of vrije interpretatie. De engine consolideert bestaande canonieke bronnen en maakt per wijziging een uitvoerbaar UX Build Package.

## Bronhiërarchie
1. Werkelijke runtime voor bestaand gedrag.
2. `docs/architecture/TRAININGSKOMPAS_ROUTE_RULES.md` + Route Map voor actieve navigatie.
3. `docs/ux/baseline/v1/` voor goedgekeurde primaire schermcompositie.
4. `docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md` voor tokens/componentprincipes.
5. `docs/ux/SCREEN_IMPLEMENTATION_STANDARD_v1.md` voor bewezen implementatiepatronen.
6. Handbook H4/H5/H6/H7/H10 voor product- en UX-intentie, voor zover niet aantoonbaar stale.
7. Goedgekeurde TK-MU mock-up voor de specifieke wijziging.
Bij conflict wint actuele runtime voor bestaand gedrag; een bewuste targetwijziging moet expliciet als DELTA worden vastgelegd. Ambiguïteit: PO_REVIEW_REQUIRED, niet zelf ontwerpen.

## Verplichte flow
REQUIREMENT → IMPACT DISCOVERY → REUSE/EXTEND/NEW → UX BUILD PACKAGE → UX PRE-CODE GATE → IMPLEMENTATION → AUTOMATED DRIFT GATES → RENDER/DEVICE PROOF → UX ACCEPTANCE → REGISTRY SYNC.

## UX Build Package
Voor ieder substantieel athlete-facing scherm:
- uniek `TK-UX-<DOMAIN>-NNN` screen-contract;
- optioneel gekoppelde `TK-MU-<DOMAIN>-NNN` visuele target; verplicht bij nieuwe IA/interaction/compositie of PO-keuze;
- alle entry/exit-actions en ieder interactief element;
- states: normal + toepasselijke loading/empty/error/offline/degraded;
- bestaande componenten/tokens die MOETEN worden hergebruikt;
- data/calculation/decision/evidence provenance waar relevant;
- accessibility/responsive eisen;
- DO NOT CHANGE;
- acceptance criteria.

## Pre-Code Gate
Geen product-UI-code wijzigen voordat het pakket `UX_SPEC_READY` is. Uitzondering: zuiver technische wijziging zonder athlete-facing UX-delta; registreer `UX_IMPACT=NONE` met reden.

## Mock-up contract
Een mock-up is visuele intentie, niet gedrag. Gedrag staat machine-readable in de registry. Mock-ups worden vóór code gemaakt wanneer een ontwerpkeuze nodig is. Eén mock-up = één scherm. Geen side-by-side referentie tenzij expliciet gevraagd.

## Claude execution rule
Claude mag niet:
- een tweede design system creëren;
- nieuwe componenten toevoegen zonder reuse-audit;
- navigatie of back-gedrag improviseren;
- ontbrekende states overslaan;
- een mock-up als enige functionele specificatie gebruiken;
- UX-documentatie handmatig laten afwijken van registry/runtime.
Claude moet bij ambiguïteit stoppen met de betreffende ontwerpbeslissing en `PO_REVIEW_REQUIRED` rapporteren.

## Closure
Een scherm is pas `UX_PROVEN` na function, reuse, visual, navigation, states, accessibility, science/claim (waar relevant), responsive en render/device proof. Groen unit-testresultaat alleen is geen UX-bewijs.
