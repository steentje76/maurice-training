# PROJECT_CONTEXT — Maurice Training Coach

## Productdoel
Eerst de beste AI-gestuurde personal training app voor Maurice; later (bewust ná Fase 1/1.5) uitbouwen naar multi-user/white-label platform voor sportscholen.

## Doelgroep
Nu: Maurice (CrossFit/functioneel, Masters-atleet). Later: leden/coaches van sportscholen, te beginnen bij ART CrossFit Hilversum.

## Belangrijkste functionaliteiten
Volledige trainingslogging, AI-coach (Claude, systeemprompt met HRV/Masters-factor/progressieregels), AI-programmagenerator, pre-training check-in met dagfactor/spierherstel, ratiofactor-/dagfactor-motor, 1RM/PR-tracking, plate calculator.

## Technologie
E�n index.html (vanilla JS PWA), Supabase (Postgres+RLS), Netlify (hosting+auto-deploy), Claude Sonnet server-side via Netlify Function.

## Belangrijke projectregels
Governance-niveau B (zie PROJECT_KICKOFF.md) — geen ADR's/Health Check/Dashboard-ceremonie. Bestaande werkwijze (view→str_replace→node --check→test→release) blijft leidend. Geen file-split of ander platform vóór Fase 2 is afgerond. Geen enterprise-governance (Blueprint v6 afgewezen, DECISION_LOG DEC-003).
