# NEXT_SESSION_CONTEXT — Maurice Training Coach

> Bijgewerkt aan het eind van de sessie van 1 augustus 2026 (Project OS-migratie + Sprint 1 + accountverwijdering + offline sync-voorstel).

## Project
Maurice Training Coach (werktitel) — governance-niveau B (Middenweg), zie PROJECT_KICKOFF.md.

## Huidige status
Project OS staat volledig in de repo (docs/, AI_CONTEXT/). Sprint 1 is afgerond en functioneel bevestigd: sw.js network-first, atleet_profiel user_id-fix, volledige RLS-audit (31 tabellen), trigger-audit (16 tabellen, trg_set_user_id overal aanwezig). equipment_types/exercise_equipment gedocumenteerd. Appnaam nog open (3 vrije kandidaten: Sportkompas, Trainingskompas, Loadwise). Social/competitief bevestigd voor Fase 3 (DEC-008, ART CrossFit-vraag).

**Nieuw gebouwd, nog niet getest:** accountverwijdering (Play Store-verplichting). Netlify Function `delete-account.js` verwijdert eerst alle 16 gebruikersdata-tabellen, dan het auth-account. `SUPABASE_SERVICE_ROLE_KEY` is ingesteld op Netlify en gedeployed (commit 6cdf1d6). **Wacht op functionele test door Product Owner met een wegwerp-account** (nog niet gedaan — "test ik straks thuis").

## Laatste wijziging
Voorstel gedaan voor offline IndexedDB-sync (laatste open Fase 1/2-item), scope: alleen trainingssessies (finishSession/saveEditSession/saveLosOefening) in v1, niet de hele app. **Nog geen akkoord ontvangen van Product Owner op deze scope** — dit was de laatste vraag vóór het gesprek werd afgesloten voor een nieuwe sessie.

## Belangrijkste bestanden
- docs/00_Project_Management/CURRENT_STATE.md — volledige actuele status
- docs/00_Project_Management/DECISION_LOG.md — DEC-001 t/m DEC-009, alle context waarom dingen zijn zoals ze zijn
- netlify/functions/delete-account.js — nieuw, ongetest
- sw.js — heeft al een lege `sync-sessions`-hook klaarstaan voor de offline-sync

## Open problemen
1. Accountverwijdering: functionele test nog niet gedaan (wegwerp-account, thuis-PC).
2. Offline IndexedDB-sync: scope voorgesteld (alleen sessies), **akkoord nog nodig** vóór bouwen.

## Volgende actie
Eerst navragen of het offline-sync-voorstel (alleen sessies, v1) akkoord is. Bij akkoord: bouwen volgens dat scope, gebruikmakend van de al aanwezige `sync-sessions`-hook in sw.js. Daarna: accountverwijdering-testresultaat opvolgen zodra Product Owner die heeft uitgevoerd.

## Belangrijke instructies voor AI
- Governance-niveau B blijft leidend: geen ADR's/Health Check/Dashboard-ceremonie toevoegen.
- Bestaande werkwijze (docs/Prompts/CLAUDE_SOFTWARE_ENGINEER_START.md) volgen: view/grep → str_replace → node --check → testrun → release. Altijd wijzigingen via de GitHub API verifiëren na een push (niet vertrouwen op "geen foutmelding" — is al eerder misgegaan, zie DEC-009-toelichting in de sessiegeschiedenis).
- Repo is publiek, kan zonder token gecloned worden om te lezen. Voor schrijftoegang: Product Owner heeft eerder een fine-grained GitHub token verstrekt (kortstondig, zelf ingetrokken/verlopen) — bij een nieuwe sessie moet opnieuw om een token gevraagd worden indien schrijftoegang nodig is, nooit een oud token aannemen als nog geldig.
