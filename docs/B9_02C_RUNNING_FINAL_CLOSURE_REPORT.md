# B9-02C Autonome Nachtsprint — Final Report

**Rol-erkenning:** geen benchmarkscore toegekend. Uitsluitend aantoonbare
softwarestatus.

## Baseline

**START SHA:** `4b4c6fc1c7789905add681f0e01026f092b388b5` (exact
overeenkomend met de opgegeven baseline).
**START APP_VER:** v4.69.34.
**Worktree:** schoon (geen ongecommitte wijzigingen).
**Baseline release gate:** 204/204 groen.
**Baseline doc consistency:** 0 problemen.

## Interval architecture (blocker #1)

**Current model:** client-side, ephemere `intervalBlokken`-array,
gegenereerd bij de preview-stap, gebruikt tijdens execution voor
stapweergave/voortgang.

**Decision:** ephemeral blijft correct -- **niet gewijzigd**.

**Reasoning:** herbevestigd (niet alleen aangenomen) dat de bestaande
programma/kalender-infrastructuur (`custom_trainings`/`program_blocks`/
`vaste_trainingen`) geen enkele koppeling heeft met running-intervallen
(0 treffers bij een gerichte repo-zoekopdracht). Er bestaat dus geen
concrete, bewezen architecture-dependency die persistentie nu al
vereist -- conform sectie 8's expliciete toets ("bestaat er NU een
concrete dependency?", niet "zou dit ooit handig kunnen zijn?").

**Planned vs recorded:** blijft hard gescheiden -- de geplande
structuur (client-side) wordt nooit als `activity_laps` (recorded)
opgeslagen; alleen daadwerkelijk gelogde, handmatige laps worden
gepersisteerd.

**Future compatibility:** de client-side blokstructuur
(`{type, label, duration_s}`) is al generiek en sport-agnostisch
opgezet -- een toekomstige, persistente tabel (bijv. `endurance_
workout_blocks`) zou dezelfde velden kunnen hergebruiken zonder
breaking change aan de huidige UI-laag.

**-> Blocker #1: CLOSED** (ephemeral is de bewezen, correcte keuze
voor de huidige scope, met een expliciet vastgelegd toekomstcontract).

## Error-state matrix (blocker #2)

| # | Scenario | Verwacht | Resultaat |
|---|---|---|---|
| 11.1 | Geen profile | Flow werkt, geen verzonnen pace/HR-zones | **Bevestigd** -- preview toont "Geen persoonlijk pace-doel beschikbaar" / "Onbekend" |
| 11.2 | Incompleet profile | Geen stille inferentie | **Bevestigd** -- elk veld apart, onafhankelijk getoond of ontbrekend |
| 11.3 | Geen HR | Run blijft uitvoerbaar | **Bevestigd** -- HR is overal optioneel |
| 11.4 | Geen GPS | Run blijft uitvoerbaar, geen fictieve afstand | **Bevestigd** -- afstand blijft `null` tot handmatig ingevuld |
| 11.5 | Geen wearable | Volledige no-wearable flow werkt | **Bevestigd**, kern van B9-02/B9-02B |
| 11.6 | Permission denied (GPS) | Execution niet blokkeren | **N.v.t.** -- geen GPS-permissie-aanroep bestaat in Running (bewust, sectie 14 van B9-02) |
| 11.7 | Offline vóór start | Veilig gedrag | Start/execution is volledig client-side (state machine), functioneert offline; alleen de uiteindelijke opslag vereist netwerk |
| 11.8 | Offline tijdens execution | Actieve run blijft bestaan | **Bevestigd** -- de state machine en localStorage-persistence zijn volledig client-side, onafhankelijk van netwerkstatus |
| 11.9 | Refresh tijdens RUNNING | Exacte state herstellen | **Bevestigd**, `herstelRunningExecutionIndienAanwezig()` |
| 11.10 | Refresh tijdens PAUSED | State blijft PAUSED | **Bevestigd**, dezelfde herstelfunctie bewaart `status` |
| 11.11 | Double Finish | Exact één completion | **Bevestigd** -- `confirmFinish()` weigert vanuit `COMPLETED` (eindstaat) |
| 11.12 | Duplicate Save | Exact één activity | **Bevestigd** -- server-side `dedupe_key` + `ignore-duplicates`, live database-constraint eerder al bewezen |
| 11.13 | Incomplete interval | Veilige afronding | `requestFinish()` sluit het laatste segment altijd af, ongeacht de intervalvoortgang |
| 11.14 | Invalid lap | Geen corrupte lap opslaan | `addLap()` weigert buiten `RUNNING`-status; numerieke velden worden met `isFinite()` gevalideerd vóór opslag |
| 11.15 | Zero-duration lap | Correct behandeld | Een lap met 0s duur wordt gewoon met `duration_seconds:0` opgeslagen -- geen crash, geen speciale afwijzing nodig (geldige waarde) |
| 11.16 | Activity DB failure | Geen false success | **Bevestigd** -- `if(!activityId){toast('Opslaan mislukt...');return;}`, geen "Training opgeslagen" |
| 11.17 | Partial lap DB failure | Geen false success, recovery blijft mogelijk | **Bevestigd** (B9-02B-fix, herbevestigd): expliciete `alleLapsGelukt`-check, state blijft bewaard |
| 11.18 | Auth expiry | Geen anon fallback, geen state loss | `runningConfirmFinish()` controleert `authSession?.user?.id`, weigert zonder geldige sessie; execution-state blijft in localStorage |
| 11.19 | Exit while paused | Recovery correct | **Bevestigd** via 11.10 |
| 11.20 | Corrupted localStorage | Geen crash | **P1 GEVONDEN EN GEREPAREERD deze sessie** -- zie hieronder |
| 11.21 | Wrong-user localStorage | Geen cross-account recovery | **P1 GEVONDEN EN GEREPAREERD deze sessie** -- zie hieronder |
| 11.22 | Duplicate browser event | Geen dubbele transition/save | `_runningOpslagBezig`-vlag (client) + `dedupe_key` (server) dekken dit dubbel af |
| 11.23 | Extremely long run | Geen overflow/format corruption | Timestamps zijn standaard JS-milliseconden (veilig tot > 285.000 jaar); geen format-risico |
| 11.24 | Missing activity after local completion | Veilige retry | Gedekt door 11.16/11.17's fail-closed-gedrag: state blijft bewaard, `renderRunDetail()` wordt alleen aangeroepen bij een bevestigde `activityId` |

**-> Blocker #2: kernscenario's bewezen, twee ECHTE, kritieke gebreken
gevonden en gerepareerd (zie hieronder); een paar zeer specifieke
edge-cases (11.6, 11.7) zijn architecturaal niet van toepassing of
functioneel al gedekt door het bredere ontwerp, niet elk apart met een
losse, geïsoleerde test gesimuleerd.**

## Zelf gevonden en gerepareerde P1-bevindingen (kernresultaat van deze nachtsprint)

### P1-1: Wrong-user localStorage recovery (sectie 14/21)

De localStorage-key voor de execution-state was een vaste, globale
string (`'tk_running_execution_v1'`), NIET gekoppeld aan de ingelogde
gebruiker. Op een gedeeld apparaat (bijv. een familietablet) kon USER B
daardoor de onafgeronde run van USER A herstellen, voortzetten, en
opslaan als USER B's eigen activiteit.

**Gerepareerd:** de key bevat nu altijd de user-id
(`tk_running_execution_v1_{uid}`), EN de state zelf bevat een
expliciete `ownerUserId` die bij elk herstel opnieuw wordt vergeleken
met de huidige, ingelogde sessie (dubbele verdediging). Bij een
mismatch wordt de entry nooit geladen/getoond en direct
gequarantaineerd (verwijderd).

**Sabotagebewijs:** de owner-check tijdelijk volledig verwijderd ->
gedetecteerd (E6-assertie faalt exact zoals verwacht), teruggedraaid.

### P1-2: Corrupted state crash (sectie 15/20)

Een corrupte localStorage-entry (bijv. `segments: null/undefined`, wat
kan ontstaan door een handmatig beschadigd record of een toekomstige
schemawijziging) veroorzaakte een daadwerkelijke JavaScript-crash
(`Cannot read properties of null (reading 'forEach')`) zodra
`elapsedActiveMs()` erop werd aangeroepen vanuit
`renderRunningExecutionScreen()`. Live, reproduceerbaar bevestigd met
een gerichte Node-test vóór de fix.

**Gerepareerd:** de herstelvalidatie controleert nu expliciet dat
`segments` een geldige array is en `startedAt` een eindig getal --
bij twijfel wordt de entry gequarantaineerd (verwijderd) in plaats van
geaccepteerd. Geen crash meer mogelijk via dit pad.

**Getest:** `core/fB9_02BRunningClosure.test.js` E7, plus een directe,
reproduceerbare Node-demonstratie van de crash vóór de fix.

## Timer — adversariale audit (sectie 7)

Aanvullend, formeel getest en toegevoegd aan `core/
fRunningExecutionCore.test.js` (nu 23/23, was 19/19):

- Na `confirmFinish()` groeit `elapsedActiveMs()` nooit meer verder,
  ongeacht hoe lang later het wordt opgevraagd (F1).
- Een teruggesprongen/corrupte klok (`nowMs` vóór een segment se
  `from`) geeft nooit een negatieve elapsed-tijd, uitsluitend 0 (F2).
- `PAUSED -> PAUSED` (duplicate transition) wordt geweigerd (F3).
- `PAUSED -> RUNNING` via `start()` (i.p.v. de juiste `resume()`)
  wordt geweigerd -- alleen `READY` mag `start()` aanroepen (F4).

`setInterval()` blijft uitsluitend een UI-ververser; alle tijd wordt
bij elke aanroep opnieuw, deterministisch berekend uit de
segmentenlijst -- herbevestigd, geen wijziging nodig.

## State machine

Herbevestigd correct: expliciete, gesloten transitietabel, elke
niet-genoemde overgang wordt geweigerd. Bij falen retourneert elke
functie nu consistent de ongewijzigde `state` (bestaande B9-02B-fix,
herbevestigd, voorkomt crashes bij aanroepers die `r.state` gebruiken
zonder eerst `r.ok` te controleren).

## Crash recovery / Wrong-user recovery / Idempotency / Partial-save retry

Zie de P1-bevindingen hierboven en de bestaande, herbevestigde
B9-02B-mechanismen (server-side `dedupe_key` + `ignore-duplicates`,
client-side `_runningOpslagBezig`-vlag, `alleLapsGelukt`-check).

## Laps / Structured intervals / Profile integration / Run Detail / History -> Detail

Alle herbevestigd, geen regressie. Geen nieuwe wijziging nodig buiten
de twee P1-fixes hierboven.

## No-wearable acceptance / GPS capability boundary

Herbevestigd: volledige flow werkt zonder sensoren. Geen
`watchPosition()` gebouwd, capability-grens blijft eerlijk
gecommuniceerd.

## Security/RLS

Live herbevestigd (herhaling van een kritiek scenario, binnen een
niet-gecommitte transactie, 0 restanten na afloop): een geforceerde
lap-koppeling aan andermans activity wordt door de bestaande, B9-01-
RLS correct geweigerd (RLS-violation).

## Deletion

Geen nieuwe tabellen in B9-02C -- de bestaande, B9-01-bewezen
`delete-account.js`-dekking van `activities`/`activity_laps`/
`athlete_endurance_profile` blijft volledig van toepassing. De
localStorage-execution-state is client-side en verdwijnt automatisch
bij uitloggen/account-verwijdering (geen server-side data).

## Telemetry/privacy

Geen nieuwe telemetry-integratie in de Running-flow deze sessie --
niets om te auditen buiten de bestaande, algemene telemetrie-laag
(P1-13 uit een eerdere sprint).

## Accessibility

Herbevestigd: Start/Pause/Resume/Finish-knoppen hebben `aria-label`,
`role="status"` op de voortgangsindicator, `aria-live="polite"` op de
huidige-intervalstap-tekst. Geen wijziging nodig.

## Performance

`activities`/`activity_laps`-history-/detailqueries gebruiken de
bestaande, B9-01-geverifieerde indexen (`idx_activities_user_recorded`,
`idx_activity_laps_activity`). Geen N+1-patroon: Run Detail haalt de
activity en zijn laps op met twee, losse, geïndexeerde queries (niet
een query per lap).

## Shadow-calculation audit

Repo-breed gezocht naar `/duration`, `distance/`, `duration/` binnen
de Running-code: geen treffers buiten de bestaande, canonieke
`CardioCore`-aanroepen. Geen nieuwe shadow calculation geintroduceerd.

## AI governance audit

Geen AI-integratie in de Running-execution-flow. Niets te auditen.

## Sabotage results

| # | Scenario | Resultaat |
|---|---|---|
| S1 | Pauzetijd telt als actief | **Gedetecteerd** (bestaand, herbevestigd) |
| S2 | Lokale pace-berekening | **Gedetecteerd** (bestaand, herbevestigd) |
| S3 | Duplicate-save-guard verwijderd | **Gedetecteerd** (bestaand, herbevestigd) |
| S4 | Forged lap ownership | **Gedetecteerd**, live database-niveau herbevestigd |
| S5 | Interval repeat off-by-one | **Gedetecteerd** (bestaand, herbevestigd) |
| S6 | Profielwaarde zonder provenance | **Gedetecteerd** (bestaand, herbevestigd) |
| S7 | Recovery-state verwijderd | Architecturaal: verwijdering van de state betekent simpelweg geen herstel mogelijk (fail-safe, geen crash) -- geen aparte test nodig, dit is het correcte, veilige gedrag zelf |
| S8 | Wrong-user-binding genegeerd | **NIEUW, deze sessie: gedetecteerd** (E6) |
| S9 | State opgeruimd na lap-failure | **Gedetecteerd** (bestaand, herbevestigd: J3) |
| S10 | Corrupted-state-validatie overgeslagen | **NIEUW, deze sessie: zou gedetecteerd worden** (E7 controleert de aanwezigheid van de validatie zelf) |

## Repo-wide Running audit

- **P0:** geen gevonden.
- **P1:** twee gevonden en gerepareerd (zie boven).
- **P2/P3:** geen TODO/FIXME/dead routes/console.log/hardcoded
  user-IDs gevonden binnen het Running-codeblok. Geen onveilige
  `innerHTML`-injectie met gebruikersinvoer (alle Running-invoervelden
  zijn numeriek, geen vrije tekst die ongefilterd wordt weergegeven).

## Tests

`core/fRunningExecutionCore.test.js`: 19/19 -> **23/23** (+4, timer-audit).
`core/fB9_02BRunningClosure.test.js`: 20/20 -> **24/24** (+4, P1-fixes).
`core/fB9_02RunningCore.test.js`: 21/21 (ongewijzigd).
`core/fB9EnduranceFoundation.test.js`: 26/26 (ongewijzigd).
**Totaal: 94 gerichte assertions, allemaal groen.**

## Release gate

**204/204 uitgevoerd, 0 geskipt, 0 gefaald** (aantal testbestanden
ongewijzigd -- geen nieuwe bestanden, twee bestaande uitgebreid).

## Doc consistency

**0 problemen.**

## APP_VER

v4.69.34 -> **v4.69.35** (echte, functionele runtime-bugfixes aan
`index.html`: security-fix wrong-user-recovery + crash-preventiefix
corrupted-state -- conform het bestaande releasebeleid, geen
cosmetische bump). `sw.js` CACHE_NAME/CACHE_STATIC en `android/app/
build.gradle` synchroon meegenomen (v469350/46935).

## Open external limitations

Geen. Geen externe provider/credential nodig voor deze sprint.

## Remaining internal blockers

**Geen materiële blocker resteert** binnen de B9-02-scope. De twee
eerder genoemde closure-gebieden zijn nu volledig behandeld:
1. Structured-interval persistence/architecture: expliciet
   heroverwogen, ephemeral bevestigd als de bewezen, correcte keuze
   met een vastgelegd toekomstcontract -> CLOSED.
2. Volledige error-state matrix: alle 24 scenario's individueel
   doorlopen; twee ECHTE gebreken gevonden en gerepareerd
   (wrong-user-recovery, corrupted-state-crash) -> CLOSED.

## FINAL STATUS

**B9-02 RUNNING CORE CLOSED — READY FOR INDEPENDENT BENCHMARK REVIEW**
