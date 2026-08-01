# NEXT_SESSION_CONTEXT — Maurice Training Coach

> Bijwerken aan het eind van iedere sessie.

## Project
Maurice Training Coach (werktitel)

## Huidige status
Project OS (governance-niveau B) is 31 juli 2026 opgezet: PROJECT_KICKOFF, CURRENT_STATE, DECISION_LOG, Product Book, Blueprint, Roadmap en Product Reset Report staan klaar om in de repo geplaatst te worden. Kritieke RLS-lekken op 5 tabellen zijn gedicht. Nog niet in de repo gecommit — dat is de eerstvolgende actie.

## Laatste wijziging
Story 2 (per-user profielscheiding) opgepakt: bug gevonden en gefixt — atleet_profiel-writes faalden stil doordat user_id nooit werd meegestuurd (NOT NULL, geen default). Fix gepusht (commit 71fd2b8), live via Netlify auto-deploy. Functionele bevestiging nog nodig.

## Belangrijkste bestanden
- docs/00_Project_Management/CURRENT_STATE.md — actuele status
- docs/02_Blueprints/Blueprint.md — technische stand van zaken
- docs/00_Project_Management/DECISION_LOG.md — waarom dingen zijn zoals ze zijn

## Open problemen
sw.js-fix nog niet browser-getest. atleet_profiel-fix nog niet functioneel bevestigd (profiel opslaan + Table Editor checken). Unique constraint op user_id nog niet gecontroleerd. Zie CURRENT_STATE.md.

## Volgende actie
Product Owner bevestigt beide fixes functioneel (sw.js + atleet_profiel). Daarna: unique constraint op user_id checken.

## Belangrijke instructies voor AI
Respecteer governance-niveau B — geen ADR's/Health Check toevoegen tenzij de Product Owner dat expliciet heroverweegt. Bestaande werkwijze (zie docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md) blijft leidend.
