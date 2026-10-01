# GAP-P2-010 — Service-worker runtime-core precache — closure record

**Status:** `CLOSED_PROVEN`  
**Registratie:** `docs/AUDIT_GAP_REGISTER.json`, GAP-P2-010.  
**Implementatiebewijs:** `docs/GAP_P2_010_SERVICE_WORKER_PRECACHE_CLOSURE.md`.  
**Implementatie-PR:** [#493](https://github.com/steentje76/maurice-training/pull/493).  
**Canonical implementation main:** `160426393ef61e205c05eb010e1d53d8b1206d8d`.

## Re-audit en gerealiseerde invariant

De historische gaptekst noemde 13 ontbrekende `core/*.js`-bestanden. Door productontwikkeling was de runtime-set op de
implementatiebaseline gegroeid: `index.html` laadde 94 runtime-coremodules en `sw.js` precachte er 26. De actuele
lacune vóór #493 was daardoor 68, niet 13.

Na #493:

- runtime-core scripts geladen door `index.html`: **94**;
- daarvan opgenomen in `STATIC_ASSETS`: **94**;
- ontbrekende runtime-core precache-items: **0**;
- `CACHE_NAME`: `trainingskompas-v470071`;
- `CACHE_STATIC`: `trainingskompas-static-v470071`.

De historische titel blijft als auditidentiteit intact; de closure bewijst de actuele invariant in plaats van historische
metingen achteraf te herschrijven.

## Bewijs tegen het PCC closure-contract

PCC-contract `a2e3b133-b542-472a-8f5f-a69b441955d4`, revision 1:

> Code/schema en geautomatiseerde of externe evidence tonen dat het verschil is opgeheven.

| Contractonderdeel | Bewijs |
| --- | --- |
| Canonical productstaat | PR #493 squash-gemerged als `160426393ef61e205c05eb010e1d53d8b1206d8d`; dat is de actuele TK-main tijdens deze verificatie |
| Volledige runtime-set | `core/sw-guard.test.js` deriveert de runtime `core/*.js`-set rechtstreeks uit `index.html` |
| Volledige precache | dezelfde guard eist voor ieder ontdekt runtime-corepad een entry in `STATIC_ASSETS`; post-merge PASS |
| Bestaande bestanden | dezelfde guard eist dat ieder ontdekt runtime-scriptpad fysiek als repositorybestand bestaat; post-merge PASS |
| Cacheverversing | `CACHE_NAME` en `CACHE_STATIC` beide v470071 |
| Exact-head CI | Quality Gate run `36817819955` (run #1324) SUCCESS op PR-head `655c423b201cb004156d92417834043e13a04bda` |
| Post-merge CI | Quality Gate run `36817980823` (run #1325) SUCCESS op `160426393ef61e205c05eb010e1d53d8b1206d8d` |
| Feitelijke joblog | `core/sw-guard.test.js` wordt uitgevoerd en rapporteert expliciet: alle runtime-corefiles in precache, alle paden bestaan, SW-cache guard groen |

## Waarom CLOSED_PROVEN gerechtvaardigd is

Deze gap gaat specifiek over ontbrekende runtime-corebestanden in de service-worker-precache. Het closure-contract eist
geen afzonderlijke handmatige toestelproef, maar `DATA_PROOF`: code/schema plus geautomatiseerde of externe evidence
moeten aantonen dat het verschil op canonical productstaat en relevante runtime is opgeheven.

Dat bewijs is aanwezig op de gemergede main zelf. Dit is nadrukkelijk méér dan "PR gemerged": de post-merge Quality Gate
voert de discovery-based guard daadwerkelijk uit tegen de gegenereerde/canonical bronset en slaagt. Daarmee is de
beschreven precache-lacune aantoonbaar 0.

## Traceability

Voor deze historische gap is geen canonical capability-owner bewezen. De eerdere koppeling aan
`PLAT-OBSERVABILITY-001` is in de v1.2-reconciliatie verworpen omdat observability niet de eigenaar van
service-worker-precache is. Daarom wordt geen nieuwe capability-ID verzonnen.

De gap blijft historisch `traceability_status = INCOMPLETE` en `traceability_scope = UNSCOPED`. Dat verhindert de
closure niet: het bestaande registercontract rekent `traceability_unresolved` uitsluitend over V1-gaps die nog
`OPEN` of `REVIEW_REQUIRED` zijn. Na bewezen sluiting resteert dus geen unresolved **open** V1-gap.

## Scopegrens

PR #493 wijzigde uitsluitend:

- `sw.js`;
- `core/sw-guard.test.js`;
- `docs/GAP_P2_010_SERVICE_WORKER_PRECACHE_CLOSURE.md`.

Geen Calculation Engine, Context Engine, Decision Engine, AI Coach, training execution, persistentie, database, RLS of
inhoudelijke trainingsregel is gewijzigd.
