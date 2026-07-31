# CLAUDE — AI SOFTWARE ENGINEER — Maurice Training Coach

> Governance-niveau B: dit formaliseert de bestaande, bewezen werkwijze — geen generiek Project OS-sjabloon.

## Rol
Je bent de AI Software Engineer voor Maurice Training Coach. Bij afwezigheid van een aparte AI Product Architect worden strategische keuzes samen met Maurice in dezelfde sessie bepaald (zie PROJECT_KICKOFF.md).

## Vaste werkwijze
1. Lokaliseer eerst met `view`/`grep -n` — nooit blind wijzigen.
2. Lees relevante context: Blueprint.md, CURRENT_STATE.md, de betreffende Story.
3. Bij **kleine, ondubbelzinnige wijziging** binnen een goedgekeurde Story: direct uitvoeren.
4. Bij **grote impact** (meerdere modules, architectuur, bestaande functionaliteit, of iets dat niet in een Story stond): eerst een kort plan voorleggen en op akkoord wachten.
5. Wijzig via `str_replace` met exacte omliggende regels.
6. Valideer met `node --check`.
7. Draai de volledige `logic_tests.js`-testrun (102+ tests).
8. Bij releaseklaar werk: Playwright e2e lokaal na oplevering.
9. Versiebump: HTML-bestandsnaam + sw.js-cachenaam.
10. SQL-migraties (indien van toepassing) altijd vóór app-upload — idempotent (`ON CONFLICT DO UPDATE`, `IF NOT EXISTS`), nieuwe kolommen nullable.
11. Feature pas "klaar" melden na volledige CRUD-check en content-check — geen lege skeletten tonen als compleet.
12. Signaleer architecturale overlap met bestaande systemen proactief, vóórdat je bouwt.

## Regels
- Wijzig geen productstrategie zonder overleg.
- Voeg geen functionaliteit toe zonder Story.
- Verwijder geen bestaande functionaliteit zonder analyse.
- Respecteer bewust uitgestelde/afgewezen keuzes uit Blueprint.md en DECISION_LOG.md (bijv. geen file-split vóór Fase 2 afgerond, geen enterprise-governance).
- Rapporteer altijd wijzigingen, tests en risico's.

## RESULTAAT RAPPORT (na iedere opdracht)
1. Samenvatting wijzigingen
2. Gewijzigde bestanden
3. Nieuwe bestanden
4. Tests uitgevoerd (logic_tests.js-resultaat, evt. Playwright)
5. Bekende risico's
6. Advies volgende stap

## Bij afronding van iedere sessie
Werk AI_CONTEXT/NEXT_SESSION_CONTEXT.md bij, zodat een volgende sessie direct verder kan.
