# B9-H1 Visual Consistency Audit

## Positieve bevindingen (bewijs van bestaande consistentie)

- **Gedeeld button-systeem:** `class="btn btn-p"` (primair) en
  `class="btn btn-o"` (outline/secundair) komen 102 keer voor,
  consistent gebruikt door alle onderzochte, recentere schermen
  (Sociaal, Voeding, Running/Cycling-Inzichten) -- geen ad-hoc,
  losse button-styling gevonden in de nieuwe B9-schermen.
- **Gedeeld card-systeem:** `class="card"` (met `card-hd`/`card-title`/
  `card-body`) komt 152 keer voor, eveneens consistent toegepast in
  alle recentere schermen.
- **Consistente empty-state-taal:** de nieuwe B9-schermen gebruiken
  consequent een grijze, kleine `<p>` met een korte, neutrale zin
  ("Nog niets geregistreerd", "Geen entries", "Geen meldingen") --
  hetzelfde patroon overal.

## Geconstateerde inconsistenties (nog niet aangepast, alleen geregistreerd)

- **Iconenstijl is gemengd:** emoji-iconen (🍽️, 👥, 📊, 🏠, 🏋️, 🧍, 🤖,
  📈) worden gebruikt in bottom-nav en nieuwe entry-knoppen, terwijl
  oudere, onderzochte schermdelen (bijv. de Running-geschiedenis-item-
  iconen) SVG-iconen gebruiken (`<svg viewBox="0 0 24 24">`). Dit is
  een zichtbare, visuele inconsistentie tussen oudere en nieuwere
  functionaliteit. Zie B9G-UX-003.
- **Terminologie voor "opslaan"-acties varieert** (zie ook de
  Button Audit): "Toevoegen", "Wijzigingen opslaan", "Profiel
  opslaan", "Groep aanmaken" -- functioneel gelijksoortige acties met
  verschillende labels per domein. Zie B9G-UX-002.
- **NOT ENOUGH EVIDENCE** voor een volledige, kwantitatieve audit van
  kleurgebruik/typography/spacing/border-radius over alle 93 schermen
  binnen deze sprint -- de CSS-variabelen (`var(--g4)`, etc.) suggereren
  een bestaand, gedeeld design-token-systeem, maar een uitputtende
  visuele diff over elk scherm valt buiten het haalbare binnen deze
  audit-only sprint. Dit vereist een aparte, gerichte visuele
  regressie-tool (bijv. screenshot-vergelijking), die nu niet bestaat.

## Component duplication (technisch, steekproef)

Geen tweede, parallelle button/card/modal-implementatie gevonden in de
onderzochte schermen -- alle nieuwe B9-schermen hergebruiken de
bestaande `btn`/`card`-klassen. Geen bewijs gevonden van lokale CSS-
workarounds in de recentere (B9-07 t/m B9-11) code. **NOT ENOUGH
EVIDENCE** voor de volledige, oudere codebase (vóór B9) binnen deze
sprint.
