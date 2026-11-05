# Resterende P1's in de schrijfketen (TK-REL-SEC-15 t/m 20)

**Datum:** 19 oktober 2026
**Branch:** `review/claude-p1-rest-20261019`
**Basis:** #562 (`7b19a35`), plus #560 (`d865599`) via merge-commit `b954df7`.

Dit is een Draft-PR: niet mergen naar `main`, niet deployen, geen Android-release. De productiedatabase is uitsluitend read-only geraadpleegd (information_schema, pg_policies, pg_indexes, pg_constraint, triggers).

## 1. Integratiebasis

- #562 is afgetakt van `cd64a52`. #560 kreeg daarna nog één commit (`d865599`), en die raakt alleen documentatie.
- Deze branch begint bij `7b19a35` en neemt `d865599` op via een merge-commit (`b954df7`), zonder conflicten. Bestaande branches zijn niet aangepast.

## 2. Herstel per commit

| Commit | Onderwerp | Test | RED vóór herstel | Mutaties |
|---|---|---|---|---|
| `22bfd90` | **A. Accountisolatie.** `sbFetch` weigert een write als de binding (`opts.uid`) of een payload-`user_id` bij een andere gebruiker hoort. Directe helpers accepteren de binding; `sbDel`/`sbUpsert` lopen via `sbFetch`. De wachtrij-helpers weigeren zonder te queuen. Tien flows met meerdere awaits zijn gebonden. | `fWriteIdentityBinding` 14/14, `fWriteFlowIdentity` 22/22 | 9 van 14 en 10 van 11 flows | 19/19 |
| `77aa953` | **B. Idempotency.** `exercises`: 409 telt pas als bevestigd na teruglezen. `exercise_goals`: `on_conflict`. Programma opslaan is hervatbaar. Extra oefeningen worden niet dubbel toegevoegd. Duursport afronden vangt een verloren antwoord op. | `fWriteIdempotencyP1` 21/21 | 15 van 21 | 17/17 |
| `c6b15e1` | **C. Time-outs en onzekerheid.** `sbPatchQ`/`sbDelQ`/`sbRpcQ` wachten begrensd, met de status `onzeker`. Een onzekere niet-idempotente insert wordt niet automatisch herhaald. Zes tabellen kregen een client-id. | `fWriteTimeoutUncertain` 23/23 | 24 van 24 (versie vóór de review) | 13/13 |
| `83fcc6d` | **Reviewronde.** Volgorde per rij; de replay van een insert is een no-op; verificatie die bij twijfel weigert; symptomen worden niet overschreven; 502/504 tellen als onzeker; "Toch versturen". | `fWriteReviewFollowup` 18/18 | 17 van 18 | 13 van 18, na gerichte tests 17 van 18 (1 equivalent, zie §4) |

- Alle tests draaien de echte productiefuncties uit `index.html` via `core/fixtures/schrijfHarnas.js`. Dat harnas bevat de echte schrijflaag, een nep-netwerk dat per verzoek het gebruikte token vastlegt, en een kleine PostgREST-nabootsing met PK-, `on_conflict`-, merge-, ignore- en unieke-sleutelgedrag.
- Elke suite faalt als hij niet volledig afrondt (exit-guard).
- De RED-uitvoer staat per commit in de commitberichten. Scenario's die ook vóór het herstel slaagden, zijn regressiebewaking voor gedrag dat al correct was, en zijn als zodanig benoemd.

**Gecombineerde mutatierun op de eind-HEAD.** 66 mutaties over alle vier de onderwerpen, tegen de zes betrokken suites: **65 gedood, 1 overleefd**. De overlevende (D12) is equivalent, zie §4.

## 3. Wat er per P1-onderwerp is gedaan

### A. Accountisolatie

**Directe REST-writes en wisselingen tijdens refresh.**
- `sbFetch` legt de identiteit vast vóór het eerste verzoek. Bij een write weigert hij als een gebonden gebruiker niet (meer) is ingelogd, of als de payload een `user_id` van een ander draagt.
- Het resultaat is een lokale weigering (status 0): niet retrybaar, niet gequeued.
- `sbDel` en `sbUpsert` gingen met een kale `fetch` buiten deze laag om en hadden geen refresh. Dat is hersteld.

**Flows met meerdere awaits (nu gebonden):**
- `permanentlyAddExtras`, ook de route via eigen trainingen;
- `upsertWeightLog`, `intakeConfirm`;
- `sendMsg`: het AI-antwoord van A kwam na een wissel in de chatgeschiedenis van B;
- seed en migratie van vaste trainingen;
- `saveVasteTrainingName`;
- `deleteVasteTraining`: `training_ref=A` bestaat bij elke gebruiker, waardoor de training van B werd geleegd;
- `deleteProgramma`, `heergenereerResterendeWeken` en `opslaanProgramma`.

**Social- en coach-writes via een kale `fetch`.** Read-only geverifieerd: elke INSERT-policy eist `<eigenaarskolom> = auth.uid()`, en de payload draagt de eigenaar die bij de start is vastgelegd. Een write onder een ander account wordt dus door RLS geweigerd. Er is geen client-binding, wel isolatie via RLS (restrisico §5).

### B. Idempotency

- **`exercises`:** een 409 telt alleen als bevestigd als exact dezelfde, zichtbare en actieve rij wordt teruggelezen (id, naam, type, scope, active). Zo blokkeert de replay niet langer de sessies erachter.
- **`exercise_goals`:** `on_conflict=user_id,exercise_id`. De unieke index en de UPDATE-policy zijn read-only geverifieerd.
- **Programma opslaan:**
  - vóór de eerste insert vastleggen welke programma's met dezelfde naam en startdatum al bestaan;
  - na een onzekere poging alleen een nieuw programma hergebruiken;
  - vaste client-id per oefeningrij;
  - bij een gedeeltelijke fout blijft het voorstel bewaard en verstuurt een nieuwe poging alleen de rest;
  - een leesfout stopt de poging en wordt nooit als "bestaat niet" gelezen.
- **Opnieuw genereren:** de bestaande regel blijft: blokken worden pas na volledige generatie vervangen, en een nieuwe run vervangt onvolledige blokken. De writes zijn nu ook gebonden.
- **Dubbel tikken:**
  - de busy-guards op programma opslaan en op duursport afronden zijn met gedragstests bevestigd;
  - `afrondenRunningActivity` is onbereikbare code: er is geen UI-markup (`fCriticalFlowResilience`);
  - de live afrondpaden vangen nu een verloren antwoord op via de `dedupe_key`.

### C. Time-outs en opslagbetrouwbaarheid

**Uitkomstklassen.** Elke write valt in één van drie klassen:

| Klasse | Status / reden | Betekenis |
|---|---|---|
| Definitief | `rejected` of `failed` | Niet opgeslagen en niet gequeued. |
| Tijdelijk | `queued`, reden `offline`/`server`/`auth`/`volgorde` | De server heeft niets toegepast. |
| Onzeker | `queued` met `onzeker: true` (reden `timeout`, `netwerk` of `gateway`) | De write kan de server hebben bereikt. |

**Regels:**
- PATCH, DELETE en `sbRpcQ` (idempotency-sleutel verplicht) zijn veilig opnieuw af te spelen.
- Een insert zonder idempotente sleutel (nu alleen `goals` en `cycle_symptom_logs`) wordt na onzekerheid nooit automatisch herhaald. De sporter kan het item na controle bewust vrijgeven; dat werkt het bestaande item bij en maakt nooit een tweede.
- **Volgorde:** een write op een rij met een wachtende write gaat erachteraan. In de flush wacht een latere write als een eerdere op dezelfde rij mislukte.

## 4. Onafhankelijke review

Een aparte review-agent zonder kennis van de bouw beoordeelde de diff `b954df7..77aa953/c6b15e1`. Zes MEDIUM- en vijf LOW-bevindingen zijn nagespeeld. Alle bevindingen binnen de claim zijn test-first hersteld in `83fcc6d`:

- cycle_symptom_logs: merge overschreef symptomen;
- merge-replay draaide het intrekken van een agenda-link terug;
- lost update via een getimede PATCH;
- een leesfout gaf een dubbel programma;
- een bestaand programma met dezelfde naam kreeg nieuwe blokken;
- de 409-verificatie was bijna een tautologie;
- 502/504 werden niet als onzeker geteld;
- vastgehouden items waren alleen te verwijderen;
- de route via eigen trainingen was niet gebonden;
- intake zonder sessie werd geweigerd.

**Equivalente mutant D12.** De identiteitscontrole na de terugleescontrole in `opslaanProgramma` is niet apart waarneembaar. Een leesverzoek gaat altijd uit met het token van de gebruiker die de handeling startte; er zit geen await tussen de start-check en het verzoek. Alle writes erna zijn bovendien gebonden. De controle is bewust als verdediging laten staan.

## 5. Resterende risico's

**Accountisolatie**
1. De trigger overschrijft een afwijkende `user_id` in plaats van te weigeren. De client voorkomt dit nu, de database niet (PO-besluit, productiemigratie).
2. Social- en coach-writes via een kale `fetch` hebben geen client-binding en geen 401-refresh; isolatie gebeurt alleen via RLS.
3. Single-await-flows zijn niet expliciet gebonden. Het venster tussen klik en verzoek bevat geen await; `sbFetch` pint de identiteit binnen het verzoek.

**Dubbele of ontbrekende records**
1. `goals` en `cycle_symptom_logs`: na een verloren antwoord vraagt het item een handmatige keuze. Een client-id-kolom vergt een migratie.
2. Een time-out breekt het oorspronkelijke verzoek niet af. In zeldzame gevallen komt dat na de replay aan (oplossing: `AbortController`, fase-2-plan §6).
3. **P2 nog open of deels: 36 rijen** (zie de matrix):
   - genegeerde resultaten: gewicht/HRV/check-in, intake-profiel, `saveAtleet`, `saveNewEx`, `delEx`, `clearChat`, coach/social-verwijderingen;
   - `nutritionSaveEntry` zonder busy-guard;
   - wees-threads bij coachberichten;
   - globaal unieke ids van `training_exercises` en `vaste_trainingen` (seed voor een tweede gebruiker).
4. Het gedrag van PostgREST/Postgres (`on_conflict`, ignore-duplicates, unieke sleutels) is nagebootst, niet tegen een echte database getest. Een lokale Supabase-test hoort in fase 2.

**Omgeving**
- Geen fysiek Android-toestel gebruikt.
- `fHomeDagfactorBasisSafety` (360 px-tekstafbreking) faalt lokaal ook op de basis `7b19a35`; dat komt door de fonts in deze omgeving. CI is leidend.

## 6. Testbewijs

- **CI-gelijke run lokaal** (Node 20, zonder Playwright): 474 core-suites, alles groen. `fAndroidOcrAssetPackaging` slaagt pas na `npm run cap:copy`, wat CI ook eerst doet.
- **Chromium (lokaal, echte browser):** de zes suites uit de workflow plus `fGuidedSaveReliability` en `fAndroidOcrAssetPackaging`. Allemaal groen, op de omgevingsafhankelijke 360 px-controle na (zie §5).
- **Bijgewerkte bestaande tests:**
  - `fGuidedSaveReliability`: het aantal uitgangen van `sbPostQ` gaat van 6 naar 7. De invariant "elke uitgang loopt via `uit()`" is ongewijzigd.
  - `fP1WriteUiHonesty` W9/W10: stub voor `sbGetOrFail`, omdat de verificatie nu via `sbGetOrFail` leest.
  - `fWriteTimeoutUncertain` T5: `cycle_symptom_logs` is eruit gehaald, omdat die tabel nu bewust zonder idempotente sleutel werkt.
  - Er is geen test aangepast om een productiefout te verbergen.

## 7. Gewijzigde bestanden

- `index.html`
- `sw.js` (cache v470262)
- `.github/workflows/tk-browser-acceptance-staging.yml`: base-branch van deze PR toegevoegd
- Tests: `core/fWriteIdentityBinding.test.js`, `core/fWriteFlowIdentity.test.js`, `core/fWriteIdempotencyP1.test.js`, `core/fWriteTimeoutUncertain.test.js`, `core/fWriteReviewFollowup.test.js`
- Harnas: `core/fixtures/schrijfHarnas.js`
- Bijgewerkte tests: `core/fGuidedSaveReliability.test.js`, `core/fP1WriteUiHonesty.test.js`
- Tooling: `tools/audit-matrix-status.js`
- Audit: `docs/audit/TK_WRITE_CALLER_MATRIX_20261019.{md,json}`
- Documentatie: `docs/TK_SERVER_READ_AFTER_WRITE_FASE2_PLAN_20261019.md`, `CHANGELOG.md`, `docs/00_Project_Management/{CURRENT_STATE,DECISION_LOG}.md`

## 8. Mergeadvies

Het advies is onafhankelijk toetsbaar: tests, RED-uitvoer en de mutatierun zijn reproduceerbaar.

| Domein | Code-integratie | Android-release |
|---|---|---|
| Accountisolatie schrijfketen | GO, na #560 en #562 | NO-GO |
| Idempotency P1 | GO | NO-GO |
| Time-outs en onzekerheid | CONDITIONAL GO: gedrag "Toch versturen" door de PO laten bekijken | NO-GO |
| Serverbevestiging (read-after-write) | NO-GO, fase 2 niet gebouwd | NO-GO |
| Productie | NO-GO | NO-GO |

**Integratievolgorde:** #552 → #555 → #556 → #557 → #558 → #560 → #562 → deze PR → #554.

- #559 en #561 moeten opnieuw worden opgebouwd met één nieuwe, unieke SW-cache-versie (deze PR gebruikt v470262).
- #532 pas na de besluiten D1–D4.
