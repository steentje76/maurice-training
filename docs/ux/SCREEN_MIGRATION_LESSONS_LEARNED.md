# Screen Migration Lessons Learned — Trainen v0.2 + Inzicht v0.1

Bron: forensische reconstructie van de daadwerkelijke correctierondes
tijdens beide migraties (eigen sessiegeschiedenis, git-commits, PO-feedback).

## TRAINEN v0.2

| # | Problem | Classification | Root cause | Why tests missed it | Final solution | Prevention rule |
|---|---|---|---|---|---|---|
| 1 | Literal `${tkIcon(...)}` zichtbaar in runtime | RUNTIME ERROR | ES6 template literals in statische HTML worden nooit door de browser geëvalueerd -- alleen door JS-strings | Unit-/source-tests lazen de string, geen echte browser-render | Browser-runtime-testsuite gebouwd (Playwright, laadt echte index.html, leest live DOM) | Elk nieuw scherm: verplichte browser-runtime-test die op live DOM controleert op letterlijke `${`-tekens |
| 2 | CSS Grid "Meer"-tegel breed uitgerekt | GEOMETRY ERROR | flex-item zonder expliciete breedte-begrenzing in een grid-context | Geen responsive/geometry-test bestond voor deze tegel | Expliciete grid-template-columns i.p.v. flex | Nieuwe tile-rijen altijd met CSS Grid + expliciete kolombreedtes, niet flex+auto |

## INZICHT v0.1

| # | Problem | Classification | Root cause | Why tests missed it | Final solution | Prevention rule |
|---|---|---|---|---|---|---|
| 1 | HRV/RHR/Slaap tonen "--" ondanks bestaande data | DATA PATH ERROR | Lokale `dc` (DeviceCore-alias) ontbrak in de nieuwe functie; stille ReferenceError werd door try/catch opgevangen | Geen enkele test mockte een echte netwerkrespons -- alle tests draaiden zonder data, dus "--" leek correct gedrag | `var dc=DeviceCore` toegevoegd, exact het patroon van het al werkende Lichaam-scherm | Elke nieuwe presentatiefunctie die een gedeelde databron aanroept: expliciete, lokale referentie-test + minstens één test met een echte, gemockte netwerkrespons |
| 2 | Concatenatie "Frontsquathogere geschatte 1RM" | CANONICAL FIDELITY ERROR / RUNTIME ERROR | Ontbrekende `.v43-tmt`-basisclass, dus geen `display:block` op titel/subtekst | Source-only tests zagen de tekst wel, maar niet de CSS-rendering | Canonieke Icon Row Pattern-class toegepast | Elke titel+subtekst-combinatie: verplichte, browser-gemeten `display:block`-assertion |
| 3 | Sportfilter afgekapt ("Alle sp...") | GEOMETRY ERROR | Hardcoded `max-width` + `text-overflow:ellipsis` | Geen test mat de werkelijke, gerenderde breedte op alle viewports | max-width verwijderd, responsive stacking bij smalle viewports | Nooit `max-width`+`ellipsis` op filter-/label-tekst zonder expliciete PO-goedkeuring |
| 4 | Snel overzicht: onnatuurlijke woordafbreking | ACCESSIBILITY ERROR / GEOMETRY ERROR | `hyphens:auto` + `overflow-wrap:break-word` samen | Geen test controleerde op mid-word-breaks specifiek | Beide properties verwijderd, labelzone met vaste min-height i.p.v. tekstsplitsing | Nieuwe compacte tegels: nooit hyphens/break-word; gebruik vaste label-zone-hoogte |
| 5 | 5 metric-waarden niet uitgelijnd | GEOMETRY ERROR | Labelgebied had geen vaste hoogte; langer label duwde waarde omlaag | Bestaande alignment-test testte de verkeerde sabotage-variabele (label i.p.v. icon), gaf vals positief resultaat | `min-height` + flex-center op labelzone | Elke tegel-rij: vaste, gereserveerde hoogte per zone (icon/label/waarde/trend), nooit content-afhankelijk |
| 6 | Trend-pijltjes zonder betekenis | DATA PATH ERROR | `healthTrend()` geeft bij <2 punten een misleidend "fake flat" terug; presentatielaag toonde dit klakkeloos | Geen test onderscheidde "echte vlakke trend" van "onvoldoende data" | Presentatielaag onderdrukt trend bij <2 valide punten, toont anders de al-bestaande delta | Elke trend-weergave: expliciete `count>=2`-check in de presentatielaag, nooit de Calculation-functie zelf aanpassen |
| 7 | Trend-tekst onvoldoende contrast (2x) | ACCESSIBILITY ERROR | Eerst `--color-text-muted` (~1.95:1), daarna `--color-text-secondary` (~3.54:1) -- beide onder WCAG AA | Geen programmatische contrast-test bestond | `--g6` (~9.74:1), een bestaand, elders bewezen token | Nieuwe secundaire tekst: altijd vooraf de exacte, gerenderde contrastratio berekenen tegen de echte achtergrond, niet aannemen dat een "secondary"-naam voldoende is |
| 8 | Domeinen: fake dashed placeholder-grafieken | CANONICAL FIDELITY ERROR | Eigen interpretatie van "consistente rechterzijde" leidde tot een decoratief element zonder onderliggende data | Geen test verbood decoratieve SVG's expliciet | Placeholder verwijderd; lege, gereserveerde zone zonder zichtbaar element | Mini-visualisaties: uitsluitend tonen bij bevestigde, echte data; PO expliciet om input vragen bij twijfel over "lege ruimte vs. placeholder" |
| 9 | Jouw ontwikkeling/Snel overzicht ogden als losse tekst | DESIGN INTERPRETATION ERROR | Aanvankelijke implementatie kopieerde de canonical layout-structuur, maar niet de canonical "tegel-met-eigen-achtergrond"-taal die Trainen al bewees | Geen COMPONENT REUSE-check dwong hergebruik van de Trainen-tegeltaal af | Herbouwd als zelfstandige tegels (eigen achtergrond+schaduw per KPI/metric) | Vóór elke nieuwe sectie: expliciet checken of een vergelijkbaar, al-goedgekeurd scherm (zoals Trainen) al de juiste componenttaal bewijst, en die hergebruiken in plaats van opnieuw te interpreteren |
| 10 | Preservation-zorgen (Lichaam/Voortgang) | FUNCTIONAL PRESERVATION RISK | Geen automatische garantie dat een nieuw overzichtsscherm geen legacy-routes zou laten "verweesd" raken | Geen enkele test controleerde legacy-routebereikbaarheid | Forensische preservation-audit + matrix-document | Elke toekomstige migratie: verplichte, vooraf-audit van alle legacy-routes/functies die het nieuwe scherm raakt, vastgelegd in een matrix, VOORDAT gebouwd wordt |

## Terugkerend patroon over beide migraties

De meerderheid van de correctierondes (6 van de 10 hierboven) was een
**GEOMETRY ERROR of DATA PATH ERROR die pas zichtbaar werd op een echte
browser-render met echte of realistisch-gemockte data** -- source-only
tests en tests zonder netwerkdata misten deze systematisch. Dit is de
kernmotivatie voor Deel A2-A5 van de UX Implementation Engine v2.
