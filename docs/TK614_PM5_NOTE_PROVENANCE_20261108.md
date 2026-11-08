# TK614 — PM5-notitieprovenance bij bewerken (P2), 8 november 2026

**Branch:** `fix/tk614-pm5-note-provenance-20261108` · **Basis:** DRAFT PR #615 HEAD `77aec90a5a453f32d08f24c9cd41f34db7f5b326`
**Status:** fix + RED/GREEN-test daadwerkelijk uitgevoerd op originele productiefuncties; meerdere gerichte regressies groen. Nog niet gecommit, gepusht of gereleased.

## Bug (gelokaliseerd)

Grammatica van de note (bestaande schrijvers, ongewijzigd):

| Schrijver | Vorm |
|---|---|
| `Concept2Live.liveWorkoutToActual` (`core/concept2Live.js`) | `split:<s>/500m[ · drag N][ · hr N] · [c2:<resultId>]` of `[c2local:<id>]`, scheider `' · '` |
| finish-pad P1 (`index.html`, exNote) | `<vrije notitie> · <converter-note>` |
| `cardioDataToRow` (handmatig) | `[machine ]split:<s> | drag N | splits:q=sec,…`, scheider `' | '` |
| `saveEditSession` (oud) | `<notitieveld> · <extraNote>` |

Dedupe leest `[c2:id]`/`[c2local:id]` overal in de note (`Concept2Live.alreadyLoggedLive`, `DeviceCore.concept2AlreadyImported`).

Oude `renderEditSessFields` vulde het notitieveld met *alles vóór de laatste `' · '`*. Voor een PM5-rij
`split:2:08.3/500m · [c2:X]` werd dat `split:2:08.3/500m`: `[c2:X]` verdween en bij opslaan maakte
`saveEditSession` er `split:2:08.3/500m · split:2:08.3/500m` van — **dubbel split, zonder bronidentiteit**.
Gevolg: een latere Concept2-import/live-dedupe herkent de rij niet meer (mogelijk duplicaat). Bij RowErg
gingen ook gemeten `hr N` (geen editveld) via de "vrije tekst" mee, maar tag en volgorde niet.

## Fix (index.html, 79+/2−, EOL-bytes behouden)

1. `tkCardioEditNoteParts(rawNote, cfg)` — één parser, gesplitst op `·` en `|`:
   - **derived**: delen die `cardioDataToRow` bij opslaan uit de editvelden opnieuw maakt (exact dezelfde
     template-probe/regex als de bestaande veldextractie, waarde moet gelijk zijn aan de geëxtraheerde
     waarde; plus het `splits:`-token als dat handmatige splits oplevert);
   - **prov**: `[c2:…]`/`[c2local:…]` (ook ingebed in tekst) en, alleen naast zo'n tag, `drag N`/`hr N`
     waarvoor het apparaat geen editveld heeft;
   - **user**: al het overige, ongewijzigd en in volgorde → bewerkbaar notitieveld.
2. `tkCardioEditNoteCompose(parts, notitieveld, extraNote)` — bij **bewerken** van een bestaande rij:
   - vrije tekst ongewijzigd **en** opnieuw gegenereerde tokens exact gelijk → **opgeslagen note byte-identiek**;
   - anders `[vrije tekst · ]extraNote[ · prov…]`; prov komt **alleen** uit de opgeslagen rij
     (`curEditSess.note`), nooit uit UI-invoer; door de gebruiker getypte `[c2:]`-tags worden gestript.
3. `renderEditSessFields`: notitieveld = `parts.user`. De bestaande veldextractie is bewust **niet** aangeraakt
   (bevat een `\x01`-sentinel; zelfde regex staat in de helper).
4. `saveEditSession`: alleen de note-compositie voor `curEditSess` gewijzigd; nieuw-toevoegen-pad, CAS
   (`edit_revision=lt.`), `sbPatchQ`-schrijver, `watt_source`-logica en RLS/eigenaar-pad ongewijzigd.

Geen nieuw veld, geen DB-kolom, geen nieuwe global state (parser draait op `curEditSess.note`).

## Tests

- **Nieuw** `core/fTk614Pm5NoteProvenance.test.js` — echte functies uit index.html (zelfde extractie als
  `fTk614Pm5EditSplitMode`), echte CardioCore/DeviceCore/Concept2Live, fixtures uit `liveWorkoutToActual`
  (synthetisch: SkiErg 500 m, 2:08.3, 167 W gemeten, 35 spm, `[c2:tk614-synth-0001]`). Cases: A open+save
  byte-identiek/dedupe/CAS/watt_source, B bestaande vrije tekst, C alleen tekst wijzigen + heropenen
  (idempotent), D tekst wissen + lege note, E RowErg drag/hr/tag, F SkiErg hr/drag zonder veld, G alleen
  moduswissels, H echte handmatige splits + heropenen, I vervalste `[c2:]`-tag/HTML in tekst, J door de bug
  beschadigde note, K `[c2local:]` + meerdere scheiders, L machinenaam, M handmatige niet-PM5-note.
  Helpers worden conditioneel geëxtraheerd, zodat de test op HEAD `77aec90` **RED** (assertions) hoort te
  zijn en niet crasht; op de fix **GREEN**.
- **Gewijzigd** `core/fTk614Pm5EditSplitMode.test.js` — extraheert nu (conditioneel) ook `TK_C2_NOTE_TAG_RE`,
  `tkCardioEditNoteParts`, `tkCardioEditNoteCompose`; asserties ongewijzigd (42).
- `core/fCardioEditPrefill.test.js` ongewijzigd (spiegelt de veldextractie, die ongewijzigd is; zijn
  note-verwachtingen — `'Voelde goed · split:1:50'` → `'Voelde goed'` — komen overeen met de nieuwe parser,
  ook gedekt in case M met de echte functies).

### RED/GREEN-uitkomst

**Door ChatGPT daadwerkelijk uitgevoerd op de Windows-ontwikkelcomputer, zonder netwerk/productiedata:** originele PR #615 HEAD `77aec90` **21 PASS / 29 FAIL**; deze fix **50 PASS / 0 FAIL**. Daarnaast: `fTk614Pm5EditSplitMode` **42/42**, `fCardioEditPrefill` **32/32**, `fWattProvenanceGapP2013` **25/25**, `fConcept2FinalizeLifecycle` **127/127**, `fConcept2Live` **98/98**, `fConcept2PM5Completion` **46/46**. Alle regressies groen. De **volledige lokale releasegate** is daarna uitgevoerd op dezelfde code met offline geïnstalleerde dependencies, `npm run cap:sync` en gegenereerde Android-webassets: **507 controles uitgevoerd, 0 geskipt, 0 gefaald**, inclusief nieuwe test. Het build/sync-proces leverde alleen lokale testassets; gegenereerde Android-wijzigingen zijn weer uit de Git-werkboom verwijderd. **Nog te controleren:** GitHub CI op de gecombineerde commit en fysieke PM5/Android-acceptatie. Reproduceerbare opdrachten:

```
# RED: kopieer alleen core/fTk614Pm5NoteProvenance.test.js naar een aparte worktree op 77aec90 en draai daar:
node core/fTk614Pm5NoteProvenance.test.js        # verwacht RED (o.a. A/B/E/F/H/K/M) op 77aec90
# GREEN: in deze worktree:
node core/fTk614Pm5NoteProvenance.test.js        # verwacht GREEN op deze fix
node core/fTk614Pm5EditSplitMode.test.js         # verwacht 42 PASS
node core/fCardioEditPrefill.test.js
node core/fWattProvenanceGapP2013.test.js
node core/fConcept2Live.test.js
node core/fDeviceIntegration.test.js
node core/fConcept2PM5Completion.test.js
node core/fConcept2Pm5LiveAggregation.test.js
node core/fConcept2Pm5ProductionWiring.test.js
```

## EOL

index.html is `i/mixed`. De Edit-tool normaliseerde het hele bestand (17k-regeldiff); dat is teruggedraaid
(`git show HEAD:index.html`) en de wijziging is byte-exact samengesteld uit originele stukken (`head`/`tail`)
plus de nieuwe LF-regels. Eindresultaat: `git diff --stat` = 79+/2−, `git ls-files --eol` = `w/mixed`.

## Overige risico's

- **Nog niet fysiek gevalideerd op een echte PM5/Android**; de code is wel daadwerkelijk met synthetische, brongetrouwe fixtures getest.
- Machinenaam-prefix: een geselecteerde machine (`localStorage sel_<type>`) zet bij een échte wijziging
  `"<machine> split:…"` i.p.v. `"split:…"` (bestaand gedrag van de split-template). Tag en waarde blijven
  behouden; alleen bij no-op-save is de note byte-identiek.
- Vrije tekst direct vóór `split:` zonder scheider (`"tekst split:1:50"`) wordt, net als vroeger, als
  machinenaam-prefix gezien en valt bij een échte wijziging weg (bestaand gedrag, niet verergerd).
- Twee verschillende waarden voor hetzelfde token in één note: de eerste vult het veld (zoals vroeger), de
  tweede blijft als vrije tekst staan (geen verlies, mogelijk zichtbaar).
- `hr N`/`drag N` worden alleen als provenance beschermd als de note een `[c2:]`/`[c2local:]`-tag heeft;
  in handmatige notes blijven ze gewone tekst.
- Gebruikerstekst met letterlijke `·`/`|` wordt bij een échte wijziging genormaliseerd naar `' · '`/`' | '`.
- Het nieuw-toevoegen-pad (`curEditSess == null`) is bewust ongewijzigd.
- Losse blanco regel tussen `tkCardioEditNoteCompose` en `renderEditSessFields` ontbreekt (cosmetisch).
