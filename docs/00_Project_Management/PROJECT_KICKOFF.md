# PROJECT_KICKOFF — Maurice Training Coach

## Projectnaam
Maurice Training Coach (werktitel — appnaam nog niet definitief; richting "sport + zelfstandig naamwoord", eerdere kandidaten: Trainr, CoachForge, TrainSense AI, Athleon Coach, PeakCoach AI, Adaptrain, StrengthPath, Bracket, Sport Trainr)

## Product Owner
Maurice

## AI Product Architect
Nog geen aparte rol ingevuld. In de praktijk tot nu toe: strategie en techniek worden samen door Maurice en Claude bepaald binnen dezelfde sessie. Kan later formeel als aparte rol (bijv. ChatGPT) worden ingevuld als de scope dat rechtvaardigt — geen noodzaak zolang het project solo-schaal blijft (governance-niveau B, zie Projectregels).

## AI Software Engineer
Claude — volgens de bestaande, bewezen werkwijze (zie docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md).

## Productvisie
"Niet eerst een multi-user platform bouwen, maar eerst de beste AI-gestuurde personal training app." (PROJECTPLAN_AI_Performance_Coach_v3.1.md, herziene roadmap — leidend productdocument)

## Doelgroep
Nu: Maurice zelf (CrossFit/functioneel, Masters-atleet, ART CrossFit Hilversum, concreet peakdoel 15 augustus 2026).
Later (Fase 3-5): leden en coaches van sportscholen, te beginnen bij ART CrossFit Hilversum; white-label voor andere gyms.

## Probleem
Trainingsbeslissingen (belasting, herstel, progressie) zijn foutgevoelig om handmatig af te wegen, extra complex door leeftijdscorrectie (Masters-factor) en een vast peakdoel met deadline.

## Oplossing
Een AI-coach die op basis van HRV, herstel, RPE en trainingshistorie concrete, uitlegbare adviezen geeft — gecombineerd met volledige, frictieloze trainingslogging.

## Technologie
E�n HTML-bestand (vanilla JS, geen framework) — bewuste keuze, geen migratie naar ander platform vóór Fase 2 is afgerond. Supabase (Postgres + PostgREST + RLS). Netlify hosting + auto-deploy vanuit GitHub. Claude Sonnet server-side via Netlify Function. PWA (manifest.json + sw.js); toekomstige store-distributie via Capacitor (iOS) en TWA/Bubblewrap (Android) — wrapping, geen rewrite.

## Huidige fase
Fase 1 (personal app) nagenoeg afgerond. Fase 2 (multi-user voorbereiding) is de huidige prioriteit en deels al gebouwd (Auth + RLS actief sinds 12 juli 2026).

## Belangrijke documenten
- Product Book: docs/01_Product/Product_Book.md
- Blueprint: docs/02_Blueprints/Blueprint.md
- Product Reset Report: docs/03_Product_Reset/PRODUCT_RESET_REPORT.md
- Roadmap: docs/12_Roadmap/Roadmap.md

## Projectregels
**Governance-niveau: Optie B (Middenweg)** — vastgesteld 31 juli 2026, zie DECISION_LOG.md.
- Wel: Product Book, Blueprint, CURRENT_STATE.md, Stories met prioriteit (P0-P3) en lichte Definition of Ready, Roadmap, DECISION_LOG.md voor grote koerskeuzes.
- Niet: ADR's per technische keuze, Project Health Check, Product Owner Dashboard-ceremonie, PROJECT_OS_RULES als apart formeel document.
- Bestaande technische werkwijze blijft leidend (zie docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md) — Project OS formaliseert wat al werkt, vervangt het niet.
- Enterprise-blueprintstructuren (ADR-governance, C4-diagrammen) zijn eerder al expliciet afgewezen als te zwaar voor dit solo-project (zie DECISION_LOG.md) — dat besluit blijft van kracht.
