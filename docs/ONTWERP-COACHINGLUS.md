# Ontwerp — de gesloten coachinglus (`coaching_loop.v1`)

Status: deel 1 geïmplementeerd in v4.50.0 · deel 2 ontworpen, niet gebouwd
Sprint: MASTER CLAUDE SPRINT A — v4.50.0, Fase 4 (B2)
Laatst bijgewerkt: 2026-08-19

## 1. Het probleem

De coachingflow hoort vier stappen te doorlopen:

    advies → uitvoering → resultaat → volgend advies

De app deed er drie. Na iedere training berekende `enhanceSummaryProgression` per oefening
een `nextAction` ("Verhogen (+2,5 kg)") en toonde die op het afrondscherm onder "Voor de
volgende keer". Die opdracht stond uitsluitend in `window._coachSignals` — in het geheugen
van dat ene scherm. Bij het herladen van de app was hij weg.

De vólgende training werd daarna volledig opnieuw afgeleid: vorige sessie + schema +
herstel van dat moment. Drie gevolgen:

1. De sporter kon nergens terugzien wat hem was opgedragen.
2. Er was geen enkele registratie van of het advies is opgevolgd.
3. Week het voorschrift van vandaag af van het advies van toen — door de rep-range of door
   een herstelcorrectie — dan kreeg de sporter daar geen woord over. De app sprak zichzelf
   zichtbaar tegen zonder het uit te leggen.

Dat laatste is het ernstigst: het ondermijnt precies de belofte "niet alleen WAT, ook
WAAROM".

## 2. Wat er al wel was

Cruciaal: het advies zelf was niet weg. Sinds Sprint 18 reist per set een
`evidence_snapshot.v1` mee in `sessions.sets_detail` (jsonb), met:

- `raw` — kg, reps, RPE, en het voorschrift van dat moment
- `calculated` — het effectieve gewicht
- `decision` — de genomen beslissing (`outcome`, `deltaKg`, `label`)
- `rule` — `progression_rpe` / `progression.v1`
- sinds v4.49.0 ook `confidence` en `explanation`

De opdracht voor de volgende keer is niet meer dan die beslissing toegepast op het gewicht
van de zwaarste set. Met andere woorden: **het advies lag al vast in de database, het werd
alleen nooit teruggelezen.**

## 3. Deel 1 — de leeslaag (gebouwd in v4.50.0)

Twee pure functies in `core/decision.js`, versie `coaching_loop.v1`:

    vorigAdvies(sessieRij)
      → { bruikbaar, reden, datum, exerciseId,
          besluit:{outcome,label,deltaKg,ruleId,ruleVersion},
          uitgevoerd:{kg,reps,rpe}, verwachtKg }

Leest de snapshots uit `sets_detail` en kiest **dezelfde set als het afrondscherm destijds**:
die met het hoogste berekende gewicht. Daardoor is wat de app achteraf toont per definitie
hetzelfde advies als wat er toen gegeven is.

    coachingLus(advies, voorgeschrevenKg, redenen)
      → { status:'gevolgd'|'afgeweken'|'onbekend', reden,
          verwacht, voorgeschreven, verschil, redenen }

Vergelijkt het advies met het gewicht dat vandaag toch al op het scherm staat (`rxWeight`,
de canonieke prescription-waarheid). De afwijkingsreden komt uit `rationale.via` van
`buildPrescriptionContract` — informatie die de app al had.

In `index.html` rendert `tkLusRegel()` er één regel van, onder het bestaande blok
"Vorige keer".

### Wat dit expliciet NIET doet

- Geen migratie, geen nieuwe kolom, geen extra schrijfactie.
- Geen tweede beslissing: er staat geen enkele RPE-drempel of kilo-stap in de leeslaag
  (bewaakt door test C1).
- Geen reconstructie. Ontbreekt de snapshot — sessies van vóór Sprint 18, of een set
  zonder RPE — dan blijft de regel leeg. Een verzonnen "dit zei ik vorige keer" is erger
  dan zwijgen.
- Geen AI. De AI mag deze uitkomst verwoorden, nooit bepalen.

### Dekking

| Situatie | Gedrag |
|---|---|
| Krachtsessie met RPE, ná Sprint 18 | volledige lus |
| Krachtsessie zonder RPE | geen advies vastgelegd → `onbekend`, regel blijft leeg |
| Sessie van vóór Sprint 18 | idem |
| Cardio | geen progressiebeslissing per set → buiten bereik |
| Advies dat over meer dan één sessie loopt | buiten bereik |

## 4. Deel 2 — wat een volledige lus nog mist (ontwerp, niet gebouwd)

De leeslaag sluit de lus voor het meest voorkomende geval zonder enig risico. Drie dingen
blijven open. Ze vragen alle drie een expliciet productbesluit van de eigenaar, en de
eerste twee ook een migratie.

### 4.1 De sessiebrede conclusie (`coaching_conclusion.v1`)

`buildCoachConclusion` maakt per afgeronde training één conclusie over álle oefeningen heen
("drie oefeningen vooruit, één stap terug"). Die wordt getoond en daarna weggegooid. Hij is
niet uit `sets_detail` af te leiden, want hij is sessiebreed.

Voorstel: kolom `sessions.coach_advice jsonb`, of — schoner, want een sessie in
Trainingskompas is één rij per oefening — een tabel `training_advice`:

    training_advice
      user_id uuid            not null
      training_instance_id    not null
      at                      timestamptz
      versie                  text        -- coaching_conclusion.v1
      conclusie               jsonb       -- de reeds berekende uitkomst, ongewijzigd
      primary key (user_id, training_instance_id)

RLS: alleen eigen rijen. Schrijven gebeurt op hetzelfde pad als de sessie zelf, dus via de
bestaande offline-wachtrij.

Voordeel boven een kolom: `training_instance_id` is al de sleutel die uitvoering en
voorschrift verbindt, en een aparte tabel raakt het hete `sessions`-schrijfpad niet.

### 4.2 Adviezen zonder RPE en voor cardio

`progressionDecision` levert `null` zonder RPE, en cardio kent geen equivalent. Voor die
gevallen bestaat er geen advies om terug te lezen. Dat is geen bug maar een grens: er ís
niets besloten. Wil de app hier wél een lus, dan is er eerst een **nieuwe, expliciete
regel** nodig (bijvoorbeeld `cardio_progression.v1`) — een productbesluit, geen refactor.

### 4.3 Opvolging over meerdere sessies

Nu wordt alleen de laatste sessie naast vandaag gelegd. "Je hebt het advies drie keer op rij
niet opgevolgd" vraagt om een reeks. Dat kan volledig read-side (de laatste N sessierijen
worden op andere schermen al opgehaald), maar het vraagt een besluit over wat de app daar
dan mee zegt — en dat grenst aan gedragscoaching. Bewust niet gebouwd zonder opdracht.

## 5. Volgorde van invoering

1. **v4.50.0 (nu):** leeslaag + presentatie. Geen migratie, geen risico.
2. **Daarna, na productbesluit:** `training_advice` voor de sessiebrede conclusie (4.1).
3. **Pas daarna, als de eigenaar dat wil:** cardio-regel (4.2) en meerdere sessies (4.3).

## 6. Bewaakt door

`core/fCoachingLusGesloten.test.js` — 22 tests:

- A: teruglezen uit het bewijsspoor, inclusief de zwaarste-set-keuze, deload/hold,
  onbruikbare vormen, onbekende snapshotversie, en dat de historie niet muteerbaar is
- B: gevolgd / afgeweken / onbekend, afrondruis, leeg voorschrift, puurheid, versionering
- C: dat de lus een leeslaag blijft — geen trainingsregel in de code, geen duplicaat in
  `index.html`, geen berekening in de weergave, en leeg bij ontbrekend advies
