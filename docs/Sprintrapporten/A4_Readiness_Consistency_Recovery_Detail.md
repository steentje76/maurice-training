# A4 — Daily Readiness & Recovery 2.0: Rapport

**Versie**: v4.65.0 · **Datum**: 27 augustus 2026 · **Status**: A4 CLOSED

## 1. Baseline
- Startbaseline: v4.64.0, main SHA `9ddf9d42a59df0ba697eaf6e841c0d40b81d9e75`.
- Bevestigd exact overeenkomend vóór aanvang.

## 2. Bestaande architectuur (discoveryronde)
Trainingskompas bleek al een buitengewoon uitgebreide, wetenschappelijk
correcte readiness/recovery-infrastructuur te bezitten:

- **Persoonlijke HRV-baseline**: `hrvBaseline()`/`hrvRollingRecent()`/
  `hrvStPersonal()` — log-getransformeerd (`meanLn`, correct voor
  log-normaal-verdeelde HRV), SWC-drempel (smallest worthwhile change, een
  erkend sportwetenschappelijk concept), expliciete `ready`-gate.
- **Dagfactor**: `dagfactor()` → `CalcCore.calculateDayFactor()` (protected).
- **Recovery-score**: `recoveryScoreFrom()` → `CalcCore.recoveryScore()`
  (protected).
- **Home-readinesssurface**: al volledig gebouwd (`id="home-readiness"`,
  `tkReadinessHtml()`/`tkReadinessVandaag()`).
- **Decision Engine — dagbeslissing**: `DecisionCore.readinessDay()`
  (protected) → `zone`: `ready`/`caution`/`reduce`.
- **Decision Engine — pre-workout-aanpassing**: `computeProgAdjustment()`
  (protected, ongewijzigd sinds A3).
- **Coach-uitleg met onzekerheid**: `CoachingCore.readinessCoachMessage()`
  → `{kop, betekenis, aanpassing, waarom, onzekerheid}`.
- **Anti-fake-precision al toegepast**: bestaand commentaar bevestigt een
  bewuste eerdere beslissing om geen derde, verwarrend getal te tonen.

## 3. Gap-analyse — de enige twee bewezen gaps

### Gap 1 — Home ↔ pre-workout-consistentie
**Aanvankelijke hypothese** (later gecorrigeerd): `readinessDay()` en
`computeProgAdjustment()` leken twee parallelle Decision Engine-functies.

**Werkelijkheid, bewezen met de daadwerkelijke, protected code**:
`readinessDay()` roept **intern** exact `computeProgAdjustment()` aan
(`core/decision.js` regel 381). Er is dus **geen** dubbele Decision Engine.

Het echte verschil zit in de inputs:
- Home geeft **structureel altijd** `gevoel: null, pijn: null` door — de
  `hrv_log`-tabel heeft geen kolommen voor deze velden (bevestigd via
  Supabase-schema-query).
- Pre-workout haalt `gevoel`/`pijn` vers uit de check-in van dezelfde
  sessie (`progCheckinCtx`).
- Home's spierherstel-input is algemeen (`recRows`); pre-workout is
  sessiespecifiek (`getRelevantMuscleRecovery()`, gescoped op de
  daadwerkelijke oefeningen van de geplande training).

**Bewezen scenario** (met echte `DecisionCore.readinessDay()`-aanroepen,
identieke dagfactor/herstel):
- Home-invoerpatroon (`gevoel: null, pijn: null`) → `zone: ready`,
  `trainingsadvies.soort: ongewijzigd`.
- Pre-workout-invoerpatroon (echte `gevoel: 'matig'`, `pijn: 'Schouder'`)
  → `zone: ready` (ongewijzigd!), maar `trainingsadvies.soort: aangepast`
  met concrete `redenen`.

Dit is een **legitiem, verklaarbaar verschil** (Home = dagniveau met
minder input-scope, pre-workout = sessieniveau met meer, verse subjectieve
input) — maar zonder uitleg kan het als tegenstrijdig overkomen.

### Gap 2 — Recovery detail/trend view
Geen centrale, compacte plek waar HRV/RHR/slaap/subjectief/belasting samen
te bekijken waren — alleen verspreid (HRV-chart in Voortgang, losse
signalen her en der).

## 4. Gewijzigde bestanden
- `index.html` — nieuwe functies + modal-HTML (zie §5).
- `core/fHardening.test.js` — 13 nieuwe tests (V-sectie).
- `CHANGELOG.md`, `docs/00_Project_Management/CURRENT_STATE.md`,
  `docs/00_Project_Management/DECISION_LOG.md` (DEC-041).
- `android/app/build.gradle`, `sw.js` — versiebump.
- Dit rapport.

## 5. Nieuwe/gewijzigde calculations
**Geen enkele nieuwe Calculation- of Decision Engine-berekening.** Alle
nieuwe functionaliteit is presentatie/aggregatie van reeds bestaande,
canonieke bronnen:

- `consistentieBrug` (in `evaluateProgAdjustment()`): leest uitsluitend
  het al bestaande, alleen-te-lezen `window._tkReadiness`.
- `openRecoveryDetail()`: nieuwe UI-functie, roept uitsluitend bestaande
  `hrvBaseline()`/`hrvStPersonal()`/`rhrBaselineDelta()`/
  `TrainingLoadCore.classifyAcwr()`/`acwrAdvisoryText()` aan.

## 6. Decision Engine-integratie
Geen wijziging. `computeProgAdjustment()` wordt in `evaluateProgAdjustment()`
nog steeds met exact dezelfde vier parameters aangeroepen als vóór deze
sprint (getest, test U7 uit A3 blijft slagen). De consistentiebrug wordt
apart, ná deze aanroep toegevoegd en beïnvloedt `adj` op geen enkele manier
(bewezen via bug-terugzet-simulatie, test V3).

## 7. Data-quality-model
Elke sectie in de detailweergave verschijnt uitsluitend wanneer de
onderliggende meting daadwerkelijk aanwezig is (`if(lh&&lh.hrv!=null)`,
etc.) — nooit een verzonnen 0. Bij volledige afwezigheid van hersteldata:
een vriendelijke, uitnodigende lege-staat, geen foutmelding. Subjectieve
data wordt expliciet gemarkeerd als "zelf ingevuld", nooit vermengd met
meetdata (provenance-behoud).

**Bewust geen nieuwe slaap-baselineformule ontworpen** — bestond niet
canoniek. In plaats van dit stilzwijgend te verzinnen: toont uitsluitend
vandaag + de laatste zeven losse waarden, met een expliciete notitie dat
een persoonlijk gebruikelijk niveau nog niet berekend wordt. Dit is
geregistreerd als een P2/backlog-item voor een toekomstige sprint, niet
als stille beperking.

## 8. UX
- Consistentiebrug: één extra, grijze tekstregel in de bestaande
  `m-prog-advies`-modal, uitsluitend zichtbaar wanneer relevant.
- Herstel & Readiness-detail: nieuwe, compacte modal (`m-recovery-detail`),
  bereikbaar via een nieuwe "Bekijk herstel"-knop op de bestaande
  Home-readinesskaart. Geen nieuw hoofdnavigatie-item, geen tweede
  dashboard.

## 9. Tests
`fHardening.test.js`: 305/305 (13 nieuw, V-sectie). Bug-terugzet-simulatie
bewijst twee kernprincipes effectief: (1) de consistentiebrug wijzigt
nergens `setsDelta`/`rpeDelta`, (2) protected core bevat geen enkele
referentie aan de nieuwe functies. Volledige regressie: `fVoortgang`
128/128, `fScheduleAdherence` 40/40, `fHyroxTriathlon` 401/401,
`fTrainingLoad` 45/45, `core/*.test.js` 71/71, sw-guard 4/4, coaching
35/35, native Concept2 51/51, Android 29/29 (na `npm run cap:copy`).
Beschermde kernbestanden (`calculation.js`/`decision.js`/`relationship.js`/
`athlete.js`/`coaching.js`/`progression.js`): SHA256-bevestigd
byte-identiek.

## 10. Evidence
- HRV-baseline: log-transformatie + SWC — gevestigde sportwetenschap, niet
  zelfverzonnen (reeds vóór deze sprint aanwezig, hier uitsluitend
  hergebruikt).
- ACWR-classificatie: Gabbett (2016)-banden, reeds vóór deze sprint
  aanwezig (v4.58.0), hier uitsluitend hergebruikt.
- RHR-vergelijking: puur beschrijvend (delta t.o.v. recent gemiddelde),
  geen "goed/slecht"-oordeel toegevoegd — er bestaat geen canonieke
  drempel hiervoor, dus geen kwalitatief label verzonnen.

## 11. Beperkingen
- Geen persoonlijke slaap-baseline (P2/backlog).
- `pijn` wordt in `readinessDay()`'s aanwezigheidscontrole niet als apart
  te-missen-signaal getrackt (alleen hrv/rhr/slaap/spierherstel/gevoel/
  trainingsbelasting) — een bestaande, niet in deze sprint gewijzigde
  eigenschap van protected core. Gedocumenteerd, niet gewijzigd (conform
  "geen protected-core-wijziging zonder aantoonbare noodzaak").
- Geen 90-dagen-venster gebouwd — de bestaande brondata/helpers boden geen
  eenvoudige, performante basis hiervoor binnen deze sprint; 7 recente
  losse waarden volstaan voor de huidige, beperkte historische diepte.

## 12. Acceptatie
Syntax gevalideerd (alle 10 scriptblokken), functionele logica getest met
zowel gesimuleerde als echte, protected-core-aanroepen. Geen visuele
screenshot-acceptatie uitgevoerd (geen live browserinstantie beschikbaar
in deze omgeving) — mobiele/CSS-aannames zijn gebaseerd op hergebruik van
bestaande, al geteste klassen/patronen (`card`, `modal`, `exfocus-hero-vid`),
niet op nieuwe, ongeteste layout.
