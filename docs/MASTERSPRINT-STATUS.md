# MASTERSPRINT-STATUS.md

**Actuele sprint** MASTER CLAUDE SPRINT A — "Eerlijke App & Closed Loop"
**Werkbranch** `mastersprint/v4.50.0`
**Huidige versie** v4.50.0
**Laatste commit** `c08e5e9`
**Vorige sprint** Autonome roadmap-executie v4.48.0 RC0 → v4.49.0 (branch `mastersprint/v4.49.0`, laatste commit `14c7d8c`) — verantwoording vanaf "SPRINT v4.49.0" verderop in dit document.

---

# SPRINT A — v4.50.0 (19 augustus 2026)

## SAMENVATTING SPRINT A

| | |
|---|---|
| Fasen afgerond | 0 t/m 6 |
| Opgelost | A1 (AI-quotum), A2 (hervatten), B1 (eerlijke datastatus), B2 (coachinglus), C4 (opruiming) |
| Niet verifieerbaar | C3 (`migratie_v447.sql` — geen Supabase-verbinding in deze sessie) |
| Nieuwe contracten | `coaching_loop.v1` |
| Nieuwe testsuites | 4 (`fQuotaHervatten`, `fDataStatus`, `fOpruiming`, `fCoachingLusGesloten`) |
| Onafhankelijke audit | 11 bevindingen, 8 hersteld, 3 gedocumenteerd |
| Testbestanden groen | 75 van 75 |
| Tests verwijderd of verzwakt | 0 |
| Nieuwe migratie | `migratie_v450.sql` — **nog niet uitgevoerd**, actie eigenaar |

## FASE 0 — STOP/GO AUDIT · 🟢 GO

Het overdrachtsdocument is niet als waarheid aangenomen maar punt voor punt tegen de code
en de beschikbare bronnen gehouden. Classificatie:

| Punt | Status | Toelichting |
|---|---|---|
| `sessions.duration_s` | 🟢 OPGELOST | Door de eigenaar/ChatGPT rechtstreeks in Supabase (`mhfxhzkdmgkaplicdszg`) uitgevoerd, inclusief check-constraint en kolomcommentaar. **Niet opnieuw gemigreerd.** De live database is hierin leidend. |
| `srpe.v1` databasevoorwaarde | 🟢 OPGELOST | Volgt uit het bovenstaande. |
| A1 — geen limiet op de AI-coach | 🟠 OPEN → opgelost in Fase 1 | Bevestigd in `netlify/functions/coach.js`: wel modelallowlist en tokenplafond per aanroep, geen enkele limiet per gebruiker. |
| A2 — gepauzeerde training onbereikbaar | 🟠 OPEN → opgelost in Fase 1 | Bevestigd: `GW` bewaarde de actieve training wel, maar geen enkel scherm bood een weg terug. |
| B1 — "geen gegevens" versus "er ging iets mis" | 🟠 OPEN → opgelost in Fase 2 | Bevestigd: `sbGet` gaf bij elke fout `[]` terug, over 54 aanroepplaatsen. |
| B2 — coachinglus niet gesloten | 🟠 OPEN → opgelost in Fase 4 | Bevestigd: `nextAction` bestond alleen in `window._coachSignals`. |
| C3 — `migratie_v447.sql` uitgevoerd? | ⚪ NIET VERIFIEERBAAR | Het bestand staat in de repo. Of het in productie gedraaid heeft is zonder databaseverbinding niet vast te stellen. Geen wijziging gedaan, geen productie-SQL uitgevoerd. |
| C4 — twee kopieën van de opruimlijst | 🟠 OPEN → opgelost in Fase 3 | Bevestigd én erger dan gemeld: cleanup stond op 16 van de 30 tabellen. |
| GitHub-push | 🔴 BLOCKED | Ongewijzigd sinds de vorige sprint; zie de blocker-paragraaf. |

## FASE 1 — A1 + A2 · 🟢 GO · commit `4279bab`

**A1 — quotum per gebruiker op de AI-coach.** De functie had een modelallowlist en een
tokenplafond per aanroep, maar niets hield één account tegen om de sleutel van de eigenaar
in een middag leeg te trekken. Nieuw: `migratie_v450.sql` met tabel `ai_usage` (RLS aan,
geen policies = default-deny; alleen de service-rol komt erbij) en twee SECURITY
DEFINER-functies. `ai_usage_registreer` telt **atomair** op met
`insert … on conflict do update … returning`, zodat parallelle verzoeken serialiseren en
niet allemaal dezelfde oude stand lezen. De ophoging gebeurt vóór de limiettoets, zodat een
geweigerde poging óók meetelt. Bij overschrijding: 429 met `Retry-After`.

**Productbesluit (expliciet, niet stilzwijgend gekozen):** 60 aanroepen per dag en 900 per
maand, instelbaar via `AI_QUOTA_PER_DAG` / `AI_QUOTA_PER_MAAND`. Onderbouwing: een intensieve
trainingsdag gebruikt in de zwaarste flow (intake + programma + terugblik + losse vragen)
ruim onder de 20 aanroepen; 60 laat drie zulke dagen op één dag toe voordat er iets knelt.

**Fail-open bij infrastructuurfouten.** Ontbreekt de servicesleutel of is de RPC er niet
(bijvoorbeeld omdat de migratie nog niet gedraaid is), dan gaat de aanroep door mét een
waarschuwing in de log. Een quotumcontrole die de coach onbruikbaar maakt zodra er iets
mis is met de telling is erger dan geen quotum.

**A2 — hervatten van een gepauzeerde training.** `GW` bewaarde de actieve training al, maar
er was geen enkele weg terug: sloot de sporter het scherm, dan was de training onvindbaar
terwijl hij nog gewoon bestond. Nieuw: `peekActive()` (read-only) plus een hervat-kaart op
Home, met het aantal reeds gelogde sets en een verwijderknop die dat aantal expliciet noemt.

Tests: `core/fQuotaHervatten.test.js` 24/24.

## FASE 2 — B1 · 🟢 GO · commit `5a37f2a`

`sbGet` gaf bij élke fout — netwerk, 401, 500, time-out — een lege array terug. Elk scherm
zei daarop "je hebt nog geen trainingen". Dat is niet alleen verwarrend: het is onwaar, en
het nodigt uit tot opnieuw invoeren van gegevens die er al zijn.

Opgelost zonder 54 losse aanpassingen: de teruggegeven array draagt nu een
**niet-enumereerbare** statuseigenschap (`_tkStatus`). Bestaande lezers zien exact dezelfde
array — `length`, `map`, `JSON.stringify` en `for…in` veranderen niet — terwijl schermen die
het willen weten `tkDataFout(rows)` kunnen vragen. Zes uitkomsten worden onderscheiden:
`ok`, `netwerk`, `time-out`, `server`, `sessie`, `verzoek`. Home en Voortgang tonen een
foutkaart met een opnieuw-knop in plaats van een lege staat.

Tests: `core/fDataStatus.test.js` 21/21.

## FASE 3 — C3 + C4 · 🟡 GO MET RESTPUNT · commit `3dcd6a1`

**C4.** `delete-account.js` en `cleanup-unverified-accounts.js` hielden allebei hun eigen
tabellenlijst bij, met in de code de aantekening "bij wijzigingen aan de een, ook de ander
nalopen". Die is niet nagekomen: 30 tabellen tegenover 16. Onder de veertien die ontbraken
zat `wearable_connections` — met het OAuth access- én refresh-token erin. Een niet-bevestigd
account werd dus opgeruimd mét zijn tokens.

Nieuw: `netlify/functions/_userData.js` met één lijst en één routine, inclusief de
bijzondere gevallen (beide richtingen van `content_shares`, alleen persoonlijke rijen in
`equipment_catalog`/`exercise_equipment`, alleen `scope=personal` bij `exercises`, en de
`users`-rij zelf). De aanname dat een gedeelde module niet kon, klopte niet: `_cors.js` wordt
sinds v4.49.0 al door acht functies geladen.

Daarbij: `cleanup-unverified-accounts.js` had géén toegangscontrole. Toegestaan zijn nu de
geplande aanroep van Netlify en een handmatige aanroep met `CLEANUP_SECRET`. Is die variabele
niet gezet, dan blijft het gedrag zoals het was mét een waarschuwing in de log — een
beveiliging die de dagelijkse taak stilzwijgend uitschakelt is geen verbetering.

**C3 — restpunt.** ⚪ NIET VERIFIEERBAAR. Zie Fase 0.

Tests: `core/fOpruiming.test.js` 16/16; `core/fRC0.test.js` E1–E5 aangepast aan de
verhuizing (dezelfde eisen, ander bestand; E5 werd strenger).

## FASE 4 — B2 · 🟢 GO · commit `338ad7d`

De app gaf na iedere training een opdracht mee voor de volgende keer en verloor die meteen.
Kerninzicht: het advies was niet weg — sinds Sprint 18 reist per set een
`evidence_snapshot.v1` mee in `sessions.sets_detail`, mét de beslissing en de regel-id. Het
werd alleen nooit teruggelezen. Daarom is de lus te sluiten **zonder migratie**:
`vorigAdvies()` en `coachingLus()` (`coaching_loop.v1`, puur, in `core/decision.js`) plus
één regel onder het bestaande blok "Vorige keer".

Zonder vastgelegd advies blijft die regel leeg — er wordt nooit een advies gereconstrueerd
dat destijds niet gegeven is. Volledig ontwerp, inclusief wat een lus nog mist en wat
daarvoor een productbesluit vraagt: `docs/ONTWERP-COACHINGLUS.md`.

Tests: `core/fCoachingLusGesloten.test.js` 22/22 (vond twee echte bugs, beide verholpen).

## FASE 5 — VERSIE + VOLLEDIGE REGRESSIE · 🟢 GO

Versienummer op alle vier de plaatsen naar v4.50.0: `APP_VER`, `sw.js`
(`CACHE_NAME`/`CACHE_STATIC` → `v45000`, `CORE_SIG` → `af8aec7a5a12adea`),
`android/app/build.gradle` (`versionCode 45000`, `versionName "4.50.0"`) en
`scripts/smoke-rc0.mjs`.

| Suite | Uitkomst |
|---|---|
| `core/*.test.js` | 75 van 75 bestanden groen |
| `core/coaching.test.js` | 80/80 |
| `node core/release-gate.js` | 12/12 poorten groen |
| `node logic_tests.js` | 250/250 |
| `npm run test:native` | 51/51 |
| `npm run test:smoke` | 41/41 |
| Tests verwijderd of verzwakt | 0 |

## FASE 6 — RELEASE-AUDIT · 🟡 GO MET RESTPUNTEN · commits `00f5cfe`, `c08e5e9`

Op de volledige sprintdiff (`14c7d8c..HEAD`) is een **onafhankelijke audit** uitgevoerd door
een tweede agent, die de SQL echt op een lokale PostgreSQL 16 heeft gedraaid en de nieuwe
core-functies met echte invoer heeft aangeroepen. Elf bevindingen; **acht daarvan zijn
hersteld**, drie zijn beoordeeld en gedocumenteerd.

### Hersteld

| # | Ernst | Bevinding |
|---|---|---|
| 1 | P1 | `revoke … from anon, authenticated` liet de PUBLIC-grant staan die PostgreSQL standaard aan een nieuwe functie geeft. Met de anon-sleutel uit `index.html` kon een willekeurige bezoeker de quotumteller van een ánder account volschrijven en diens coach de rest van de dag blokkeren. `migratie_v447.sql` deed dit al goed. **De migratie was nog niet uitgevoerd, dus dit raakt geen bestaande database.** |
| 2 | P1 | De toegangscontrole op de dagelijkse opruiming was met één woord te omzeilen: `body.indexOf('next_run')`. Nu wordt de payload echt geparseerd; een zelf meegestuurde `x-nf-event`-header is geen toegangsbewijs meer. |
| 3 | P1 | `vorigAdvies` nam de zwaarste set **mét bewijs**; het afrondscherm neemt de zwaarste set ongeacht RPE. Topset zonder RPE + lichtere set mét RPE ⇒ de app toonde achteraf een advies dat de sporter nooit had gezien. |
| 4 | P1 | Een deload-advies kon "verklaard" worden met *volgens je opbouw*, omdat `rationale.via` het verschil met de vorige sessie beschrijft en niet met het advies. De app gaf daarmee een onderbouwing om 10 kg bóven het eigen deload-advies te trainen. |
| 5 | P2 | De speling ging uit van een 0,25-raster; `roundKg` rondt op 0,5 af. Met 1,25-schijven meldde de app zijn eigen afronding als afwijking. |
| 6 | P2 | "Meer laden" in het logboek: bij een fout werd niets toegevoegd, verdween de knop én liep de paginateller door — het logboek beweerde dat de geschiedenis ophield en sloeg bij een volgende poging een pagina over. |
| 7 | P2 | Home toonde de foutbanner én onveranderd "Doe je check-in". Hero, ochtendbericht en coachadvies maken nu het verschil tussen *niet ingevuld* en *niet opgehaald*. |
| 8 | P2 | `AI_QUOTA_PER_DAG=0` werd stilzwijgend 60 (`parseInt(x,10) \|\| 60`), net als elke typefout. |
| 9 | P2 | Het quotum telde vóór de validatie van het verzoek: een client-bug met een kapotte body kostte de sporter zijn dagquotum zonder dat er één token verbruikt werd. |

### Beoordeeld, niet gewijzigd

| # | Ernst | Bevinding en afweging |
|---|---|---|
| 9b | P2 | **Alleen het chatscherm toont de 429-tekst.** De programmagenerator toont hem als "Fout in week N: …", en intake/terugblik/uitleg slikken hem stil in. Bovendien doet de generator één aanroep per week, dus een programma van 12 weken kost 12 van de 60 dagaanroepen. Dat is echt, maar het raakt vijf aanroepplaatsen met elk hun eigen foutafhandeling — buiten de scope van deze sprint en te groot om er ongetest doorheen te duwen. **Openstaand punt voor de volgende sprint.** |
| 10 | P2 | **De daggrens is UTC.** `current_date` staat op de tijdzone van de database (UTC bij Supabase). Een Nederlandse gebruiker die 's zomers om 23:30 zijn limiet raakt, kan om 02:00 lokaal weer verder, terwijl de app "morgen" zegt. Een clientdatum meesturen is spoofbaar en dus geen oplossing; een tijdzone per gebruiker is een **productbesluit**. Bij 60 aanroepen per dag is de praktische impact klein. |
| 11 | P2 | **`ai_usage` in de opruimlijst vóór de migratie** levert bij elke accountverwijdering `failedTables:['ai_usage']` op. De client leest `failedTables` nergens, dus dit is alleen zichtbaar in de log. Geen dataverlies. Verdwijnt zodra `migratie_v450.sql` gedraaid is. |

### Waar de audit niets vond

XSS/injectie in de nieuwe UI-code · atomiciteit van de upsert (geverifieerd met parallelle
aanroepen) · `search_path`/`pg_temp`-shadowing (geverifieerd door als `anon` een
`pg_temp.ai_usage` aan te maken) · RLS default-deny · gemiste tabellen of eigenaarskolommen
in de opruimroutine · data van ándere gebruikers · mutatie van invoer in de lus-functies ·
consistentie van de versiebump.

### Tests naar aanleiding van de audit

`fCoachingLusGesloten` D1–D6 (28/28) · `fOpruiming` C3b/C3c (18/18) · `fQuotaHervatten`
A2/A5 (24/24) · `fDataStatus` C6b/C7b (23/23). Nul tests verwijderd of verzwakt; de
aangepaste asserties zijn stuk voor stuk **strenger** geworden.

## OPENSTAAND VOOR DE EIGENAAR — SPRINT A

1. **`migratie_v450.sql` draaien** in de Supabase SQL-editor (tabel `ai_usage` + de twee
   quotumfuncties). Zolang dat niet gebeurd is valt de quotumcontrole fail-open terug: de
   AI-coach blijft werken, maar zonder limiet.
2. **`CLEANUP_SECRET` zetten** als omgevingsvariabele in Netlify. Zolang die leeg is blijft
   `cleanup-unverified-accounts` open staan voor handmatige aanroepen (met waarschuwing in
   de log).
3. **C3 bevestigen:** is `migratie_v447.sql` in productie gedraaid? Niet vast te stellen
   zonder databaseverbinding.
4. **GitHub-schrijftoegang** — zie de blocker hieronder; ongewijzigd.
5. **Beslissen over de tijdzone van het AI-quotum** (audit-bevinding 10): UTC-dag laten staan,
   of een vaste tijdzone per installatie instellen. Productbesluit.
6. **Volgende sprint:** de 429 van het quotum netjes afhandelen in de vier aanroepplaatsen
   buiten het chatscherm (audit-bevinding 9b).

---

# SPRINT v4.49.0 (vorige sprint)

> Dit document beschrijft wat er aantoonbaar is gedaan, niet wat er bedoeld was. Per fase:
> status, uitgevoerde werkzaamheden, testresultaten en wat er open blijft staan.

---

## SAMENVATTING

| | |
|---|---|
| Fasen afgerond | 0 t/m 10, 13, 14, 16 (16 van de 18) |
| Fasen beperkt uitvoerbaar | 11 (Android) en 12 (Concept2) — geen SDK, geen hardware |
| P0 opgelost | 12 |
| P1 opgelost | 14 |
| Nieuwe contracten | `srpe.v1`, `session_volume.v1`, `evidence_preserve.v1`, `prescription_guard.v1`, `conflict.v1` |
| Nieuwe testsuites | 5 (`fSessieDuur`, `fBewijsAiGrens`, `fOfflineHardening`, `fPlatformGrens`, `fCoachingLus`) |
| Testbestanden groen | 73 van 73 |
| Tests verwijderd of verzwakt | 0 |
| Artefactomvang | 14 MB → 5,1 MB |

---

## OPENSTAANDE BLOCKER — GITHUB SCHRIJFTOEGANG

**Classificatie** P1 (blokkeert uitsluitend het publiceren, niet het werk zelf)

De repository kan wel gekloond worden, maar niet gepusht:

```
remote: access denied by the git proxy: steentje76/maurice-training is not in this
session's authorized repository set, so the proxy will not inject a credential for it.
To fix, add the repository to the session's sources.
```

De GitHub-API geeft eveneens 403. **Actie eigenaar:** voeg `steentje76/maurice-training`
toe als bron met schrijfrechten. Alle fasen zijn intussen lokaal afgewerkt met losse,
geteste commits op `mastersprint/v4.49.0` en per fase opgeleverd als patch en ZIP. De
workflow `.github/workflows/quality-gate.yml` is lokaal één-op-één nagebootst en groen;
GitHub Actions zelf kan pas na de push gecontroleerd worden.

## OPENSTAANDE BLOCKER — SQL-MIGRATIE HANDMATIG UITVOEREN

**Classificatie** P2 (de app werkt zonder; alleen de nieuwe gegevens ontbreken)

`migratie_v449.sql` voegt `sessions.duration_s` toe. Automatisch DDL uitvoeren op de
productiedatabase is in deze werkomgeving geblokkeerd. De app is daarop voorbereid:
`tkDurationKolomBeschikbaar()` stelt eerst vast of de kolom bestaat en laat het veld
anders weg. Zolang de migratie niet gedraaid is wordt de training normaal en volledig
opgeslagen, alleen zonder duur — geen dataverlies, geen foutmelding.

**Actie eigenaar:** `migratie_v449.sql` draaien in de Supabase SQL-editor.

---

## FASE 0 — STARTAUDIT · 🟢 GO

| | |
|---|---|
| Commit | `64d100f` — v4.48.0 RC0 |
| Branch | `main`, werkboom schoon |
| Build | `npm install` + `npm run cap:copy` slagen |
| Tests | coaching 35/35 · 66 × `core/*.test.js` · native 51/51 · logic_tests 250/250 · smoke 41/41 |
| Quality gate | 🟢 alle poorten |

De baseline was volledig groen. Er is niet op een kapotte basis doorgebouwd.

---

## FASE 1 — EVIDENCE FOUNDATION · 🟢 GO · commit `449c931`

**Uitgevoerd**

- `migratie_v449.sql` — nullable kolom `sessions.duration_s` met check-constraint
  (0 < duration_s ≤ 86400), een `comment on column` en een ROLLBACK in de kop.
- `core/calculation.js` — **`srpe.v1`**: `sessionRpeLoad(rpe, duur_s)` geeft Foster's
  session-RPE in AU. Puur, deterministisch en weigerend: buiten de CR-10-schaal of zonder
  plausibele duur komt er geen getal maar een reden.
- `core/athlete.js` — het dagbeeld boekt duur en sessie-RPE per `training_type`, neemt bij
  afwijkingen binnen één training het maximum en weegt de sessie-RPE met het aantal sets.
  `unifiedLoad()` levert pas een AU-reeks als élke dag volledig meetbaar is.
- `core/relationship.js` — `duur` van 'toekomstig' naar 'nu'; nieuwe grootheid `srpe` met
  expliciete invoer `['rpe','duration']`, zodat de circulariteitstoets hem vanzelf
  uitsluit tegenover RPE, duur en belasting.
- `index.html` — `finishSession()` meet de duur met de bestaande pauzeveilige timer, vóór
  de schrijflus en vóór `stopTrainTimer()`, en toont hem in de afrondingskaart.

**Determinisme** `srpe.v1` is een pure functie; `athlete.js` bevat geen `Date.now`,
`Math.random`, DOM of netwerk — afgedwongen door een testcontrole.

**Tests** `core/fSessieDuur.test.js` — 35/35.

---

## FASE 2 + 3 + 4 — EVIDENCE → INSIGHT, DECISION/RULES, AI COACH · 🟡 GO MET RESTPUNTEN
commits `54ba0d5`, `863f2a5`

Er is eerst een onafhankelijke audit uitgevoerd op beide ketens.

**Opgelost**

| | Bevinding | Oplossing |
|---|---|---|
| **P0** | Het bewijsspoor werd gewist bij een correctie in de historie | `evidence_preserve.v1` |
| **P0** | `parseProgrammaJSON` liet elk AI-getal door naar de database | `prescription_guard.v1` |
| **P1** | De AI-terugblik kon draaien zonder deterministische context (race op `_coachSignals`) | `finishSession` wacht op de belofte |
| **P1** | Zonder gezondheidsmetingen viel het hele blok "REGELS BIJ DEZE GEGEVENS" uit de prompt | `tkCoachRegelsBlok` in elke tak |
| **P1** | De AI-proxy zette `model` en `max_tokens` ongecontroleerd door | allowlist + plafond |
| **P1** | De vierde safeguard (tegenstrijdige gegevens) ontbrak volledig | `conflict.v1` |
| **P1** | Het bewijsspoor kende geen betrouwbaarheid | `confidence` in `buildDecisionEvidence` |

**Tests** `core/fBewijsAiGrens.test.js` 22/22 · `core/fCoachingLus.test.js` 37/37.

**Restpunten**

| | Restpunt | Classificatie |
|---|---|---|
| R1 | Acht `core/*.js`-modules staan niet in de `<script>`-lijst van `index.html` en niet in `sw.js`: `scientificEvidence`, `adaptiveCoaching`, `contextEngine`, `coachProgramming`, `sportDefinition`, `platformRoles`, `teamPerformance`, `externalDataModel`. Hun tests zijn groen over code die nergens draait. Besluit nodig: bedraden of expliciet als toekomstig markeren. | P1 |
| R2 | `nextAction` per oefening wordt berekend maar nergens opgeslagen; het volgende voorschrift leest hem niet. De lus advies → uitvoering → uitkomst → volgend advies is daarmee nog open. | P1 |
| R3 | Readiness- en spierhersteldrempels staan verspreid hardcoded in `index.html` naast de canonieke waarden in `core/decision.js`; `dagfactorStatus` voegt een band toe die in geen enkele engine bestaat en heeft geen testdekking. | P1 |
| R4 | Zes sportregels leven in de UI-laag zonder `ruleId`/versie (`repsPrefillFromRange`, `resolvePrescriptionRepTarget`, `computeProgPrefill`, `exercisesTargetForDuration`, `recoveryWeightFactor`, `buildPrescriptionContract`). | P1 |
| R5 | De "losse oefening"-route schrijft nooit een bewijsspoor. | P2 |
| R6 | `SETOUTCOME_ACTIES` kent geen 'aanpassen', 'herstellen' of 'deload overwegen'; die uitkomsten bestaan alleen in het niet-geladen `adaptiveCoaching.js`. | P2 |
| R7 | De lokale `core/release-gate.js` draait 10 van de 73 testbestanden en toetst purity niet op `Date.now`/`Math.random`. CI draait wél alles, dus dit is een vals-groen signaal, geen blokkade. | P2 |
| R8 | Ongedekte edge cases uit FASE 2: gewijzigde oefening, ontbrekende tussenliggende sessies, outliers in trainingsdata (een typefout van 500 kg passeert `releaseRecord`), lange trainingspauze op insight-niveau, gewijzigde rep range in het bewijsspoor. | P2 |

---

## FASE 5 — TRAINING → ANALYSE → ADVIES · 🟡 GO MET RESTPUNTEN · commit `863f2a5`

De vijf vragen die de coachingflow hoort te beantwoorden:

| Vraag | Status |
|---|---|
| 1. Wat heb ik gedaan? | 🟢 afrondingskaart (nu inclusief trainingsduur) |
| 2. Wat is er veranderd? | 🟢 "Vergeleken met vorige keer" |
| 3. Waarom zegt de app dit? | 🟢 **opgelost in v4.49.0** — `explainProgression` per oefening onder de opdracht |
| 4. Wat betekent het? | 🟢 kernconclusie deterministisch, AI-terugblik aanvullend |
| 5. Wat moet ik nu doen? | 🟡 de opdracht staat er, maar bepaalt het volgende voorschrift nog niet (R2) |

---

## FASE 6 — WORKOUT BUILDER / TRAINING MAKEN · 🟡 GO MET RESTPUNTEN · commit `7e8d1e8`

**Opgelost** — P0: een oefening toevoegen aan een Builder-training wiste alle sets, reps,
RPE, rusttijden en picks (`pushCustomTrainingExercises` deed DELETE + INSERT met alleen
`exercise_id`), en schreef bovendien buiten de offline-wachtrij om. Er is nu één
schrijfroute die bestaande targets behoudt.

**Restpunten**

| | Restpunt | Classificatie |
|---|---|---|
| R9 | Reps en RPE zijn in de Builder niet bewerkbaar en worden als `null` weggeschreven; `planItemsFromTargets` laat `rpe` weg, dus RPE overleeft geen resume-ronde. | P1 |
| R10 | Er is geen Update van naam/kleur/notitie van een custom training. | P1 |
| R11 | `saveWorkout` negeert het resultaat van de schrijfactie; de toast liegt bij een 400/409. | P1 |
| R12 | Drie parallelle create-routes met drie id-vormen (`custom_*`, `saved_*`, Builder), en twee delete-routes met verschillend gedrag. | P1 |
| R13 | De Builder staat nog als zelfstandige bestemming in de navigatie, tegen de productbeslissing in. | P2 |
| R14 | Offline aanmaken/verwijderen van een handmatige workout gebruikt nog `sbPost`/`sbDel` in plaats van de wachtrij-varianten. | P1 |

---

## FASE 7 — TRAININGSADVIES · 🟡 GO MET RESTPUNTEN

`SETOUTCOME_ACTIES` dekt verhogen / verlagen / herhalen / onvoldoende bewijs. 'Aanpassen',
'herstellen' en 'deload overwegen' ontbreken (R6), en de lus is nog open (R2). De
deterministische grens tussen AI en voorschrift is wél gelegd (`prescription_guard.v1`).

---

## FASE 8 — RECOVERY & CONTEXT · 🟡 GO MET RESTPUNTEN · commit `7e8d1e8`

**Opgelost** — P0: `startCustomTraining` berekende de herstelaanpassing alleen in een tak
die onbereikbaar is geworden. Een eigen workout werd dus zonder enige aanpassing
uitgevoerd terwijl een vaste training die wél kreeg. De aanpassing wordt nu als
sessie-delta gezet, precies zoals in `startT`.

**Restpunt R15 (P1)** — één grootheid kan de uitkomst domineren. HRV-status `r` levert
`hrvFactor 0.85`, en slaap (max 1,00) en cyclus (max 1,03) kunnen dat na de clamp niet
compenseren: één HRV-meting forceert `-1 set` en `-1,5 RPE`, ook bij 100 % spierherstel en
`voelt: 'top'`. Er is geen positief tegenwicht in `computeProgAdjustment`. De nieuwe
`conflict.v1` maakt dat nu wél zichtbaar en verlaagt de zekerheid, maar verandert de
beslissing bewust niet — dat is een productbesluit, geen technische keuze.

---

## FASE 9 — OFFLINE & SESSION RELIABILITY · 🟢 GO · commit `7e8d1e8`

**Opgelost** — vier P0's: de wachtrij is nu gebruiker-gescoped; een mislukte
wachtrij-schrijfactie levert `false` in plaats van `true`; een netwerkfout tijdens de
refresh logt niet meer uit en wordt na een minuut opnieuw geprobeerd; koud opstarten
zonder netwerk werkt. Plus: `sbDel` en `sbUpsert` lopen nu via `sbFetch` (401-herstel), een
gedeeltelijk mislukte sessie dupliceert niet meer bij een tweede poging, en de intakevlag
wordt pas gezet als het profiel echt is opgeslagen.

Het 401-pad is ongewijzigd correct: één gedeelde refresh (single-flight), één retry met een
per poging opnieuw opgebouwde header, en 400/409/422 gaan niet naar de wachtrij.

**Tests** `core/fOfflineHardening.test.js` — 24/24, met een nagebootste kapotte IndexedDB
en een gebruikerswissel.

**Restpunt R16 (P1)** — een permanent falend item blijft eeuwig in de wachtrij staan: er is
geen pogingenteller, geen maximale leeftijd en geen dead-letter. De badge gaat daardoor
nooit meer weg. **R17 (P1)** — een overgeslagen POST gevolgd door een geslaagde no-op PATCH
verwijdert die PATCH definitief uit de wachtrij.

---

## FASE 10 — PWA HARDENING · 🟡 GO MET RESTPUNTEN · commit `7e8d1e8`

**Opgelost** — P0: een mislukte service-worker-install wiste de complete offline-cache.
P1: de navigatiehandler cachette een captive-portal-pagina over de app-shell, en een
mislukte JS-fetch kreeg HTML terug (parse-fout, half-kapotte app). Tikdoelen: de
gewichtknop tijdens een set (32×28) en de universele terugknop (36×36) naar 44×44, plus
vier chip-klassen naar minimaal 32 px.

**Restpunten**

| | Restpunt | Classificatie |
|---|---|---|
| R18 | `sbGet`/`v43SafeGet` geven `[]` bij élke fout; "geen data" en "er ging iets mis" zijn voor de gebruiker niet te onderscheiden. 54 aanroepplaatsen. | P1 |
| R19 | Geen globale offline-indicator; laadskeletons blijven bij een fout permanent staan. | P2 |
| R20 | Zoomen is uitgeschakeld (`user-scalable=no`) — WCAG 1.4.4. Stond al in `KNOWN_LIMITATIONS`. | P2 |
| R21 | Een nieuwe service worker neemt een draaiende pagina over zonder herlaadmelding. | P2 |

---

## FASE 11 — ANDROID HARDENING · 🟡 GO MET RESTPUNTEN · commit `81de3f5`

**Opgelost** — P0: in de Android-app werkte geen enkele Netlify-functie (relatieve paden
tegen `https://localhost`). Opgelost met `FN_BASE` plus CORS aan de serverkant. Video's
zijn cross-origin op te halen dankzij een header in `netlify.toml`. Het artefact ging van
14 MB naar 5,1 MB.

**NIET HARDWARE-BEWEZEN** — deze omgeving heeft geen Android SDK:

1. Dat het project compileert met compileSdk/targetSdk 36 + AGP 8.9.1 + Capacitor 6.2.1.
   Capacitor 6 declareert zelf compileSdk 34; dit is een reëel risico vóór de
   Play-deadline van 31-08-2026.
2. Dat `bundleRelease` een ondertekend, uploadbaar AAB oplevert.
3. Dat edge-to-edge en predictive back op Android 15/16 correct werken.

**Restpunten** R22 (P1): `android:enableOnBackInvokedCallback` is nergens gezet.
R23 (P1): `POST_NOTIFICATIONS` ontbreekt terwijl de app notificaties aanbiedt; de Web
Notifications-API werkt niet in een Android WebView. R24 (P2): back-up exporteren werkt
niet in de WebView. R25 (P2): de stale-asset-guard vergelijkt alleen `APP_VER` en is in CI
tautologisch.

---

## FASE 12 — CONCEPT2 · 🟡 GO MET RESTPUNTEN · commit `81de3f5`

**Opgelost** — P2: de simulator `makeMockConcept2PM5` stond op de browser-global en zat
daarmee in het uitgeleverde artefact. Hij zet `provenance: concept2_live_ble` op verzonnen
afstand, pace en watts en is niet van echte meetdata te onderscheiden. Nu alleen nog
beschikbaar onder CommonJS.

**NIET HARDWARE-BEWEZEN** — er is geen PM5:

1. Dat BLE-discovery, connect, notify of disconnect ooit met echte hardware werkt.
2. Dat de runtime-permissiedialoog op API 31+ correct verschijnt.

**Vaststelling zonder hardware wél mogelijk en belangrijk:** er is nul `registerDecoder`-
aanroep in de hele repository. De adapter emit dus gegarandeerd geen enkele meetwaarde;
de UI blijft op "Verbonden — wachten op data…". Dat is eerlijk gebouwd (geen fake data),
maar de feature is functioneel leeg tot één echte capture is gevalideerd.

**Restpunten** R26 (P1): er is geen reconnect-implementatie achter de `reconnecting`-status.
R27 (P1): geen background/foreground-afhandeling voor BLE. R28 (P2): de permissiestatus is
altijd optimistisch `granted`, waardoor een geweigerde permissie als generieke fout
verschijnt. R29 (P2): `subscribeConnection` lekt listeners per pairing-poging.

---

## FASE 13 — SECURITY AUDIT · 🟡 GO MET RESTPUNTEN · commits `54ba0d5`, `81de3f5`

**Geen secret in Git.** Geverifieerd over alle commits: nooit een `.jks`, `.keystore`,
`.pem`, `.p12`, `.env` of `google-services.json` toegevoegd. De sleutel in `index.html` is
een publishable/anon key en hoort daar. Service-role, Anthropic- en Google-sleutels komen
uitsluitend als `process.env` voor.

**Geen IDOR.** Geen enkele Netlify Function haalt de gebruikers-identiteit uit body of
query; alle acht aangeroepen functies verifiëren de JWT.

**Opgelost** — P0: opgeslagen XSS via oefenings- en trainingsnamen in `onclick`-attributen
(24 plaatsen). P0: de privacybelofte werd niet nagekomen — vijf van de zes AI-aanroepen
sloegen de toestemmingspoort over. P1: de AI-proxy zette `model`, `max_tokens`, `system` en
`messages` ongecontroleerd door.

**Restpunten**

| | Restpunt | Classificatie |
|---|---|---|
| R30 | Geen rate limiting of quota per gebruiker op `coach.js`. Registratie staat open, dus elk zelfgemaakt account kan ongelimiteerd verzoeken door de `ANTHROPIC_API_KEY` van de eigenaar duwen. De omvangsgrenzen zijn nu wel gezet, maar het aantal aanroepen niet. | P0 |
| R31 | Geen enkele security-header in `netlify.toml`: geen CSP, geen `frame-ancestors`, geen HSTS. Met een JWT in `localStorage` is er niets dat XSS-exfiltratie remt. | P1 |
| R32 | De coach-pincode wordt vergeleken met een ongezouten SHA-256, zonder poging-teller of lockout. 10 000 combinaties zijn snel af te lopen. | P1 |
| R33 | `migratie_v447.sql` (vaste `search_path` + REVOKE op acht SECURITY DEFINER-functies) is geschreven maar nog niet gedraaid. | P1 |
| R34 | `cleanup-unverified-accounts.js` heeft geen auth-check en een tabellenlijst die achterloopt op `delete-account.js`. | P1 |
| R35 | De RLS-policies van 26 tabellen — waaronder `sessions`, `hrv_log` en `atleet_profiel` — staan in géén enkel `migratie_v*.sql`. Ze bestaan alleen in de live database; elke audit en elke restore is daarmee een gok. | P1 |
| R36 | `wipePersonalCache()` werkt met een handmatige sleutellijst; elke vergeten `tk_*`-sleutel blijft bij een gebruikerswissel staan. | P2 |

---

## FASE 14 — PERFORMANCE / QUALITY · 🟢 GO · commit `26a8aa8`

Gemeten, niet gegokt. `exercise-catalog.json` (296 kB) en `exercise-intelligence_6.json`
(8,3 MB) werden meegebundeld terwijl geen enkele regel code ze ophaalt — 60 % van de
artefactomvang was dood gewicht. Ze blijven in de repository als bron; alleen niet meer in
de download. **14 MB → 5,1 MB.** Een testcontrole bewaakt beide kanten van die afspraak.

**Restpunt R37 (P1)** — het Voortgang-scherm doet ± 80 parallelle queries per bezoek (één
`sessions`-query per krachtoefening, plus `refreshRepPRs` sequentieel nog eens per
oefening). Eén query met `exercise_id=in.(…)` zou dat oplossen.
**R38 (P2)** — `refreshHome()` doet ± 6 netwerkqueries en 8 renderpassen voor blokken die
via CSS verborgen zijn en dus nooit worden getoond.

---

## FASE 15 — COMPLETE REGRESSION · 🟢 GO

Na elke fase volledig gedraaid, en als laatste na de laatste commit:

| Suite | Uitkomst |
|---|---|
| `coaching.test.js` | 35/35 |
| 73 × `core/*.test.js` | groen, 0 rood |
| `npm test` (release gate) | 🟢 alle 12 poorten, inclusief logic_tests 250/250 |
| `npm run test:native` | 51/51 |
| `npm run test:smoke` | 41/41 |
| `npm run build:www` + `cap:sync` | slagen |

De workflow `.github/workflows/quality-gate.yml` is stap voor stap lokaal nagebootst.
GitHub Actions zelf kan pas gecontroleerd worden na de push (zie blocker).

---

## FASE 16 — PRODUCT AUDIT · 🟡 GO MET RESTPUNTEN · commits `b87359c`, `8ad04e5`

De kernflow is doorlopen als echte gebruiker.

**Opgelost** — P0: een nieuwe sporter had na de hele onboarding geen enkele startknop.
P0: de opslagindicator tijdens een training stond altijd op "✓ Alles opgeslagen".
P0: de privacybelofte rond AI-toestemming. P1: een mislukte check-in werd niet gemeld.
P1: dezelfde training leverde op vier schermen een ander volume op — nu één
`session_volume.v1`. P2: verwijzingen naar de niet meer bestaande route
"Instellingen → Privacy".

**Restpunten**

| | Restpunt | Classificatie |
|---|---|---|
| R18 | (zie fase 10) fout en leeg zijn niet te onderscheiden — de breedste bevinding van de hele audit | P1 |
| R39 | Een gepauzeerde begeleide training is nooit meer te hervatten: de enige hervat-knop staat in `#home-dash`, dat via CSS verborgen is. | P0 |
| R40 | Elf functieblokken en drie schermen zijn onbereikbaar: `DASH`, `s-doelen`, `s-train-detail`, de "Waarom vandaag?"-uitleg, `tkFitbitSync`, `tkConcept2Import`, de apparaatkaarten, `toggleMuscleRecoveryHeatmapView`, `toggleBlockExpand`, `_quickPanel` en enkele oefeningkaart-helpers. | P1 |
| R41 | Twaalf berekende of opgeslagen gegevens landen nergens (dagfactor-detail, aandachtspunt, laatste training, doelenkaart, programmakaart, recente sessies, body-comp-blok, `training_instances` plan-versus-uitvoering, `tk_coach_voice`/`tk_coach_detail`). | P1 |
| R42 | Het check-inscherm kaapt de navigatie: de knop heet "Opslaan & Analyseer" maar springt naar de Coach en stuurt de ruwe waarden als chatbericht. | P2 |
| R43 | De "AI-analyse" in de oefeningbibliotheek is geen AI maar een if-keten over statische metadata; de uitkomst is voor elke gebruiker identiek. | P2 |
| R44 | Valt de AI-terugblik weg, dan toont de app dezelfde deterministische zin twee keer zonder te melden dat de AI niet reageerde. | P2 |
| R45 | Volume per spiergroep telt het volledige sessievolume bij élke geraakte spier op; de som is een veelvoud van het totaal. | P1 |
| R46 | PWA-snelkoppelingen wijzen naar legacy-ids `A`/`B` en geven "Training niet gevonden". | P2 |
| R47 | Grafieklijnen krijgen geen kleur: `ctx.strokeStyle='var(--accent)'` werkt niet op een canvas. | P2 |
| R48 | Vier schermen zonder uitweg: `s-intake`, `s-onboarding`, `s-auth-newpass`, en drie ✕-knoppen die naar het lege stub-scherm `s-settings` leiden. | P1 |

---

## FASE 17 — RELEASE CANDIDATE · 🟡 GO MET RESTPUNTEN

| Onderdeel | Status |
|---|---|
| Versie | v4.49.0 — `APP_VER`, `sw.js` (`CORE_SIG` + beide cachenamen), Android 44900 / 4.49.0, smoke-verwachting: consistent |
| Build | `build:www` + `cap:sync` slagen; artefact 5,1 MB |
| Tests | 73 bestanden groen, release gate 🟢, native 51/51, smoke 41/41 |
| GitHub | 🔴 niet gepusht — zie blocker |
| Security | 🟡 geen secrets, geen IDOR, XSS gedicht, AI-toestemming afgedwongen; R30 (quota) en R31 (CSP) open |
| Android | 🟡 configuratie gereed, build niet bewezen |
| PWA | 🟢 install, offline, cache-hardening; foutstaten open (R18) |
| Data | 🟢 zes dataverlies-paden gedicht; migratie v449 wacht op de eigenaar |
| Coaching | 🟡 vraag 3 beantwoord, de lus nog open (R2) |
| Offline | 🟢 wachtrij per gebruiker, geen stil verlies |
| Concept2 | 🔴 functioneel leeg tot er één echte capture is |

**Oordeel:** dit is een sterke release voor internal testing en verder dan RC0 op elk
gebied dat zonder hardware te bewijzen is. Voor een publieke release blijven drie dingen
staan die niet vanuit deze omgeving kunnen: één lokale Android-verificatiebuild, een
PM5-capture, en de twee handmatige stappen van de eigenaar (GitHub-source en migratie).
Daarnaast is R30 (quota op de AI-proxy) de enige openstaande P0 in de securitylijst.
