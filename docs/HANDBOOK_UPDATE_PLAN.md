# HANDBOOK_UPDATE_PLAN.md

**Doel:** exact vastleggen welke Handbook-hoofdstukken stale zijn en welke capabilities ontbreken. **Status na MS-F1-04 (28 augustus 2026):** H6, H9 en H12 (Prioriteit 1, hieronder) zijn behandeld — zie de kanttekeningen/nieuwe subsecties direct in die bestanden. H4/H5/H8/H10 (Prioriteit 2) en de overige hoofdstukken (Prioriteit 3) blijven open vervolgwerk, bewust niet in deze sprint meegenomen (scope-discipline: MS-F1-04 was gericht op de twee met concreet bewijs vastgestelde, bindende tegenstrijdigheden — H9 ontbrekende Evidence/Corroboratie-governance, H12 verouderde testarchitectuur-claim — plus een coverage-gap-notitie in H6, niet op volledige herschrijving van alle dertien hoofdstukken).

| Hoofdstuk | Laatst bijgewerkt | Stale? | Ontbrekende capabilities (bewijs) | Gekoppelde capability-IDs |
|---|---|---|---|---|
| H1 Productvisie | 2 aug | Waarschijnlijk niet — visiedocument, laag wijzigingstempo | Geen concrete lacune gevonden | — |
| H2 Doelgroepen | 2 aug | Onbekend, niet geverifieerd tegen code (geen "doelgroep" af te leiden uit code) | — | — |
| H3 Design Principles | 2 aug | Onbekend | — | — |
| H4 UX Interaction Design | 2 aug | Vermoedelijk — 26 releases aan nieuwe flows (HYROX-executie, cyclus-check-in) niet gezien | Interval-executie-UX (multisport, v4.69.0), cyclus-check-in-flow | END-INTERVAL-001, CTX-CYCLE-001 |
| H5 UI Design System | 2 aug | Vermoedelijk gedeeltelijk — nieuwe schermen gebruiken mogelijk al bestaande componenten, niet geverifieerd | Race-classificatie-UI (Adaptive/Relay), Women's Performance-kaarten | END-HYROX-001, CTX-CYCLE-001 |
| **H6 Screen Library** | 2 aug + coverage-gap-notitie 28 aug (MS-F1-04) | **Bevestigd onvolledig** (niet tegenstrijdig) — bevat geen "Cyclus"-referentie, geen `s-lich-cyclus`; noemt HYROX slechts 1×. **Behandeld:** prominente COVERAGE GAP-notitie toegevoegd bovenaan het hoofdstuk; de 24-veld-specificaties voor de ontbrekende schermen zelf zijn nog niet geschreven (contentcreatie, apart vervolgwerk) | Alle 11 Lichaam-subschermen (`s-lich-*`), beide HYROX-schermen, de builder→guided-executieflow voor multisport | Alle SCR-*-IDs onder Lichaam en HYROX in de bijgewerkte Capability Registry |
| H7 Component Library | 2 aug | Vermoedelijk gedeeltelijk | Niet inhoudelijk geverifieerd (vereist component-voor-component vergelijking) | — |
| H8 AI Behaviour Library | 2 aug | Gedeeltelijk — noemt HYROX wel, maar niet de v4.69.0-Interval-executie of de cyclus-gekoppelde coaching (`cycleTraining.js`) | Interval-multisport-coaching, cyclus-training-correlatie in AI-context | END-INTERVAL-001, CTX-CYCLETRAIN-001 |
| **H9 AI Governance** | 2 aug + nieuwe subsectie 6.5, 28 aug (MS-F1-04) | **Was bevestigd stale, nu behandeld** — bevatte geen enkele referentie aan `evidence_store.v1`, corroboratie-regels, of DEC-036. **Behandeld:** nieuwe bindende subsectie 6.5 "Evidence & Corroboratie-governance" toegevoegd, met expliciete verwijzing naar `core/scientificEvidence.js`/`core/decision.js`/DEC-036 en de regel dat een enkel signaal (bv. HRV) nooit een ingrijpend advies mag dragen | De volledige Evidence/Provenance-laag die sinds Sprint 18/S3-reeks is toegevoegd, en de corroboratie-eis (DEC-036, 27 augustus) | EVID-SCI-001, DEC-CORE-001 |
| H10 Navigation Architecture | 2 aug | Vermoedelijk — de `go()`-router bevat sindsdien nieuwe redirects (`s-doelen`→`s-stats` v4.21.0, `s-train-schema/workouts`→`s-train-mine` v4.20.0) | Geconsolideerde navigatie-redirects | — |
| H11 Motion Design | 2 aug | Niet geverifieerd | — | — |
| **H12 Quality Assurance** | 2 aug + 4 gerichte correcties, 28 aug (MS-F1-04) | **Was bevestigd feitelijk fout, nu gecorrigeerd** — beschreef `logic_tests.js` (127+ tests) als hét bindende regressiemechanisme, terwijl `core/release-gate.js` (discovery-based, 80 testbestanden, 82 teststappen) al langer de daadwerkelijke, bindende gate is. **Behandeld:** 4 normatieve claims gecorrigeerd (Deel 4 Testing Done, Deel 5 Test Strategy inclusief nieuwe kanttekening, Deel 16 Release Gates, Deel 18 Quality Constitution Law 2) | De volledige nieuwe release-gate-architectuur | — |
| H13 Sprint Execution | 2 aug | Procesdocument, mogelijk nog grotendeels geldig | Niet geverifieerd | — |
| H14 Product Strategy | 2 aug | Onbekend | — | — |

## Aanpak voor de resterende update (niet nu uitgevoerd)
1. **Prioriteit 1 (H6, H9, H12): AFGEROND via MS-F1-04** — zie kolom "Stale?" hierboven per hoofdstuk.
2. **Prioriteit 2 (H4, H5, H8, H10):** waarschijnlijk gedeeltelijk stale, vereisen een gerichte vergelijkingssessie per hoofdstuk. Nog niet uitgevoerd.
3. **Prioriteit 3 (H1, H2, H3, H7, H11, H13, H14):** geen concreet bewijs van veroudering gevonden in deze audit; laag risico, kunnen later.
4. Voor elke update: koppel de wijziging aan een capability-ID uit `CAPABILITY_REGISTRY.md`, zodat traceerbaar blijft welke code-realiteit de aanleiding was.
