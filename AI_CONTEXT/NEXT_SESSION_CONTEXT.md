# NEXT_SESSION_CONTEXT — Maurice Training Coach

> Bijwerken aan het eind van iedere sessie.

## Project
Maurice Training Coach (werktitel)

## Huidige status
Project OS (governance-niveau B) is 31 juli 2026 opgezet: PROJECT_KICKOFF, CURRENT_STATE, DECISION_LOG, Product Book, Blueprint, Roadmap en Product Reset Report staan klaar om in de repo geplaatst te worden. Kritieke RLS-lekken op 5 tabellen zijn gedicht. Nog niet in de repo gecommit — dat is de eerstvolgende actie.

## Laatste wijziging
Project OS-documentenset gepusht (commit b040c2b). Eerste Story afgerond: sw.js navigatie omgezet van cache-first naar network-first (commit 62965e8) — automatisch live via Netlify auto-deploy. Browsertest nog niet bevestigd.

## Belangrijkste bestanden
- docs/00_Project_Management/CURRENT_STATE.md — actuele status
- docs/02_Blueprints/Blueprint.md — technische stand van zaken
- docs/00_Project_Management/DECISION_LOG.md — waarom dingen zijn zoals ze zijn

## Open problemen
sw.js-fix nog niet browser-getest door Product Owner (DevTools controle na deploy). Per-user profielscheiding nog niet getest. Zie CURRENT_STATE.md voor volledige lijst.

## Volgende actie
Browsertest van de sw.js-fix bevestigen, dan Story 2 starten: per-user profielscheiding testen.

## Belangrijke instructies voor AI
Respecteer governance-niveau B — geen ADR's/Health Check toevoegen tenzij de Product Owner dat expliciet heroverweegt. Bestaande werkwijze (zie docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md) blijft leidend.
