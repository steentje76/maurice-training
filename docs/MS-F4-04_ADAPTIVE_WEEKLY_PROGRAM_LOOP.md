# MS-F4-04_ADAPTIVE_WEEKLY_PROGRAM_LOOP.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json, leidend):** "Adaptive Weekly Program Loop" -- "Rule/evidence-governed adaptation with audit trail." Capability: AI-PROGRAM-AUTOGEN-001.

## AI_PROGRAM_GENERATION_FLOW (sectie 8, volledige runtime-trace)

| Stap | Functie | Deterministisch? | AI-controlled? | Validator? | State mutation? |
|---|---|---|---|---|---|
| 1. Prompt-opbouw | buildWeekPrompt() | Ja | Nee | -- | Nee |
| 2. Model-aanroep | fetch coach-proxy | Nee | Ja | -- | Nee |
| 3. JSON-extractie/parse | parseProgrammaJSON() | Ja | Nee | Ja -- schema + canonieke exercise-ID-whitelist | Nee |
| 4. Preview | renderProgConcept() | Ja | Nee | toont uitsluitend gevalideerde data | Nee (alleen DOM) |
| 5. Expliciete bevestiging | opslaanProgramma()-knop / confirmModal() | Ja (user-actie) | Nee | -- | Nee tot klik |
| 6. Save | opslaanProgramma() / sbPost | Ja | Nee | hergebruikt dezelfde gevalideerde structuur | Ja -- DB-insert |
| 7. Unified execution | Training Preview -> Execution -> Logging | Ja | Nee | bestaande, canonieke flow | Ja (normale sessieflow) |

Twee actieve generatiepaden bevestigd, geen verborgen derde:
- genereerProgramma() -- initiële, volledige programmagenerering (nieuw programma).
- heergenereerResterendeWeken() -- de Adaptive Weekly Program Loop: vervangt uitsluitend onvoltooide weken van een BESTAAND programma, met adherence%/RPE-delta als evidence-input. Afgeronde weken blijven ongemoeid.

Beide paden hergebruiken exact dezelfde parseProgrammaJSON()-validator.

## Kernbevinding: rule/evidence-gestuurde adaptatie bestond al
heergenereerResterendeWeken() berekent computeProgramProgress(blocks) (adherence% + gemiddelde RPE-afwijking) -- echte, deterministisch berekende evidence -- en geeft dit mee aan de regeneratieprompt. De gebruiker ziet deze evidence in een confirmModal() vóórdat regeneratie start.

## Nieuw gevonden gat: geen audit trail
Vóór deze sprint werden vervangen program_blocks/program_block_exercises hard verwijderd (sbDel) zonder enige logging.

Fix: nieuwe, forward-only, append-only tabel program_regeneration_log (migratie_v501.sql, live uitgevoerd en geverifieerd). Vóór de destructieve delete wordt een onveranderlijk snapshot weggeschreven: regenerated_weeks, evidence (adherence%/RPE-delta), replaced_blocks_snapshot, reden. RLS identiek aan het bestaande patroon, live herbevestigd. De applicatiecode roept uitsluitend INSERT aan -- nooit UPDATE/DELETE.

De audit-log-write is bewust niet-blokkerend: als de log-insert faalt, gaat de al-bevestigde regeneratie gewoon door; de fout wordt naar de console gelogd.

## Deep audit: CalcCore.validateProposedWeight() / ai_guard.v1
Reeds bevestigd (F1.3, MS-F4-01/03). Aanvullend geverifieerd:
- 120%-e1RM-plafond: bevestigd technical/product heuristic, al correct geclassificeerd in docs/CALCULATION_REGISTRY.md.
- Missing e1RM: valt terug op een absoluut plafond van 500 kg.
- Scope: uitsluitend van toepassing op de [[APPLY:exId:kg]]-marker in de vrije coach-chat; de programmagenererings-JSON bevat geen kg/weight-veld.

## Exercise-ID-whitelist -- functioneel opnieuw getest
Bekende ID geaccepteerd, onbekende ID geweigerd, geen stille fabricage van een nieuw exercise-record.

## AI-PROGRAM-AUTOGEN-001 closure-toetsing
- [x] Alle actieve generatiepaden geïnventariseerd (2, geen verborgen derde)
- [x] Geen raw-model-naar-persistence-bypass
- [x] Canonieke exercise-ID's afgedwongen
- [x] Malformed schema geweigerd
- [x] Numerieke sanity-validatie
- [x] Load-guard actief
- [x] Geen AI-only progressie
- [x] Preview runtime bevestigd
- [x] Expliciete save-bevestiging runtime bevestigd
- [x] Geen stille overschrijving van een actief programma
- [x] Unified execution path
- [x] Audit trail (nieuw gebouwd deze sprint)
- [x] Tests + sabotagebewijs

AI-PROGRAM-AUTOGEN-001: CLOSED.

## MS-F4-04 acceptance-gate-toetsing
Letterlijke acceptance gate: "Rule/evidence-governed adaptation with audit trail."
Resultaat: CLOSED. Rule/evidence-gestuurde adaptatie bestond al. Audit trail was het enige echte ontbrekende onderdeel -- nu gebouwd, live gemigreerd, en getest.
