# Design Drift Gates — Specificatie voor toekomstige schermen

Semantische/geometrische contracts, GEEN pixel-perfect screenshot-tests
(die breken bij elke triviale wijziging). Elke gate hieronder is al
minstens één keer bewezen effectief via een sabotage-test tijdens
Trainen v0.2 of Inzicht v0.1.

| Gate | What it protects | How measured | Pass criterion | Sabotage case (bewezen) | Proven on |
|---|---|---|---|---|---|
| Page inset | consistente horizontale marge | `getComputedStyle(scroll).paddingLeft/Right` | exact 16px op alle breedtes | n.v.t. (nooit gefaald) | Trainen, Inzicht |
| Tile equal height | geen willekeurig uitgerekte tegel | bounding rect height per tegel in een rij | max 1px verschil | Trainen "Meer"-tegel breed uitgerekt (CSS Grid-fix) | Trainen |
| Metric/KPI value alignment | waarden op één lijn, ongeacht labellengte | bounding rect top van de waarde-container | max 1px verschil tussen alle tegels in de rij | Inzicht: icon-hoogte van 1 tegel vergroot -> gedetecteerde afwijking | Inzicht |
| Icon container geometry | consistente icoon-afmeting en -kleur | width/height + `stroke`-attribuut/`color` | exacte, gedocumenteerde maat; `stroke="currentColor"` aanwezig | oudere iconenset zonder `stroke=currentColor` gaf zwarte iconen | Inzicht |
| Card radius | canonical, consistente afronding | `getComputedStyle(card).borderRadius` | Standard=18px, Featured=NOT YET DEFINED | n.v.t. | Inzicht |
| No mid-word breaking | geen "Rusthart-slag"-achtige afbreking | `getClientRects().length>=2` + check op spatie in tekst | 0 labels met mid-word-break | `hyphens:auto`+`break-word` verwijderd na regressie | Inzicht |
| No page horizontal overflow | geen onbedoelde, pagina-brede scroll | `scrollWidth > clientWidth` op scherm-niveau | false op 320-430px | n.v.t. (preventief, nooit gefaald) | Trainen, Inzicht |
| Carousel reachability | laatste kaart bereikbaar via scroll | `scrollLeft` na programmatische scroll | laatste kaart's rect binnen viewport na scroll | bevestigd werkend op 320px (waar overflow het meest waarschijnlijk is) | Inzicht |
| Minimum contrast | leesbare secundaire tekst | berekende WCAG-contrastratio (relatieve luminantie) tegen echte achtergrond | >=4.5:1 voor normale tekst | 2x gefaald in productie (`--color-text-muted` 1.95:1, `--color-text-secondary` 3.54:1) voordat `--g6` (9.74:1) werd gekozen | Inzicht |
| Minimum touch target | bereikbare, aanraakbare knoppen | bounding rect van interactieve elementen | >=44×44px (Apple/Android-richtlijn) | **NOT YET EMPIRICALLY GATED** -- geen bestaande test gevonden die dit expliciet meet | nog geen scherm |
| Focus-visible | toetsenbord-/screenreader-navigatie | `:focus-visible`-styling aanwezig op interactieve elementen | zichtbare focus-ring | **NOT YET EMPIRICALLY GATED** | nog geen scherm |
| Responsive width behavior | juist gedrag op 320-430px | element-tellingen/breedtes per viewport | vaste rij-structuur (bv. 5-op-1-rij) blijft op alle geteste breedtes | 3+2-wrap-regressie in Snel overzicht, hersteld naar altijd-1-rij | Inzicht |
| Semantic section order | secties in de juiste, canonical volgorde | DOM-volgorde van `.v43-lbl`/sectie-headers | matcht canonical PNG-volgorde | n.v.t. (nog geen regressie hierop gevonden) | Inzicht |
| No fake/decorative data visuals | geen misleidende, data-loze grafiek | check op `<polyline>`/data-attribuut binnen elke visual-zone | elke zichtbare SVG-grafiek bevat echte data; lege zone blijft leeg | dashed placeholder-lijnen verwijderd na PO-afkeuring | Inzicht |
| Trend-suppression bij onvoldoende data | geen "fake flat" trend | check of trend-element alleen bestaat bij `count>=2` | geen trend-tekst zonder onderliggende, valide vergelijking | `healthTrend()` gaf bij <2 punten een misleidend "flat"-resultaat | Inzicht |

**Twee gates zijn nog niet empirisch bewezen** (minimum touch target,
focus-visible) -- expliciet zo gemarkeerd, geen valse volledigheid.
Deze moeten bij het eerstvolgende scherm alsnog worden opgebouwd en
sabotage-getest voordat ze als "bewezen" gelden.
