# F13 Post-Audit — P1-16 XSS/HTML-Injectie Audit

## Methode

Taint-oriented scan van `index.html` (345 `innerHTML`-voorkomens, 748
`onclick=`-voorkomens): geautomatiseerde regex-scan op alle
`${...}`-interpolaties binnen template literals die risicovolle,
user-controlled velden bevatten (`.naam`, `.name`, `.note`, `.notitie`,
`.beschrijving`), gevolgd door handmatige verificatie per treffer: gaat
de string daadwerkelijk naar `innerHTML`/een HTML-attribuut, of is het
plain-text (AI-prompt, toast, confirm-dialoog)?

## Classificatie van alle onderzochte treffers

| Sink-type | Voorbeeld | Bevinding |
|---|---|---|
| UNESCAPED USER DATA → innerHTML | `renderExerciseRow()`: `ex.name`/`meta.notes` | **BEVESTIGD KWETSBAAR** -- gefixt |
| UNESCAPED USER DATA → innerHTML | Sessie-samenvattingskaart: `ex.naam` | **BEVESTIGD KWETSBAAR** -- gefixt |
| UNESCAPED USER DATA → HTML-attribuut | Notitie-invoerveld: `value="${session.note}"` | **BEVESTIGD KWETSBAAR** -- gefixt |
| UNESCAPED USER DATA → innerHTML | `describeOfflineQueueItem()`: oefeningnaam | **BEVESTIGD KWETSBAAR** -- gefixt |
| JS-ATTRIBUTE-CONTEXT (subtiel) | `onclick='fn(${JSON.stringify(naam)})'` (6 plekken) | **BEVESTIGD KWETSBAAR**: `JSON.stringify()` escaped geen enkele quote, die het `onclick='...'`-attribuut zelf kan doorbreken -- gefixt via nieuwe `escJsAttr()`-helper |
| STATIC TRUSTED | `c.naam`/`c.icoon` (challenge-generator) | Interne, berekende data, geen user-input. Geen wijziging. |
| ESCAPED USER DATA (al correct) | `escHtml(ex.name)` op meerdere plekken (o.a. regel 12187/17920/18354-blok) | Al veilig vóór deze sprint. |
| AI INPUT (geen HTML-sink) | `buildPRTekst()`, `bibliotheek`, `hrvStr`, coach-contextstrings | Gaat naar de Anthropic-systeemprompt, nooit naar `innerHTML`. Buiten scope voor XSS (prompt-injectie is al gedekt via de P1-02-serverside-outputvalidatie). |

## Toegepaste fixes

1. **Nieuwe helper `escJsAttr(waarde)`** (direct na `escHtml()`): combineert
   `JSON.stringify()` met `escHtml()` op de resulterende string. Nodig
   omdat `JSON.stringify()` wel JSON-syntax (dubbele quotes) escaped,
   maar niet de enkele quote die een `onclick='...'`-attribuut zelf
   afsluit -- een oefeningnaam als `Farmer's Walk` kon dit attribuut al
   theoretisch doorbreken. De browser decodeert de HTML-entiteiten terug
   vóórdat de inline JS-parser de attribuutwaarde ziet, dus legitieme
   waarden blijven functioneel identiek.
2. **6 `onclick='...'`-aanroepen** omgezet van `JSON.stringify(...)` naar
   `escJsAttr(...)`: `openRenameVasteTraining`, `askCoachEx`,
   `show1RMChart`, `openEditPeak`, `openEditMuscles`, `openEditRest`,
   `openEditAnchor`, `openEditYT` (allemaal in het oefeningen-beheer- en
   voortgangsscherm, waar namen mogelijk cross-tenant gedeeld zijn).
3. **`renderExerciseRow()`**: `ex.name` en `meta.notes` nu via `escHtml()`.
4. **Sessie-samenvattingskaart**: `ex.naam` nu via `escHtml()`.
5. **Notitie-invoerveld** (`m-edit-session`): `session.note` nu via
   `escHtml()` in de `value="..."`-attribuutcontext.
6. **`describeOfflineQueueItem()`**: exercise-naam en `item.body.name`
   nu via `escHtml()`.

## Niet gewijzigd (bewuste, verantwoorde keuzes)

- AI-promptcontext-strings (`buildPRTekst`, `bibliotheek`, `hrvStr`,
  `atleetProfielTekst`): plain-text richting de Anthropic-API, nooit
  een HTML-sink. Prompt-injectie via deze velden wordt al opgevangen
  door de server-side `AIOutputContract`-validatie (P1-02) op de
  **uitkomst** van de AI, niet op de input zelf -- een kwaadaardige
  naam kan de AI hooguit proberen te misleiden, maar de output blijft
  onderworpen aan dezelfde governance-check.
- `c.naam`/`c.icoon` (challenge-generator): interne, berekende data,
  geen user-controlled invoer.

## Regressietest

`core/fXssHardening.test.js`: bevestigt dat `escJsAttr()` bestaat en
correct `JSON.stringify()` combineert met `escHtml()`, dat alle 6
eerder kwetsbare `onclick='...'`-aanroepen nu `escJsAttr()` gebruiken
(geen kale `JSON.stringify(...naam...)` meer binnen `onclick='...'`),
en dat de vier bevestigde innerHTML/attribuut-sinks nu `escHtml()`
gebruiken.
