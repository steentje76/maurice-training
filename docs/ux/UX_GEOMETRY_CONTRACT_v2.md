# Trainingskompas UX Geometry Contract v2

Alle waarden hieronder zijn **gemeten** via Playwright/computed styles op
de daadwerkelijke, gemergde runtime (main SHA `ecf09049...`), niet
geschat uit de mockup.

## PAGE

| Property | Value | Source |
|---|---|---|
| Horizontal inset (scroll padding) | 16px links/rechts | gemeten, Trainen |
| Header padding-top | 52px (of `max(52px, safe-area-inset-top+12px)`) | gemeten, gedeeld |
| Header padding-bottom | 12px | gemeten, Trainen |

## HEADER

| Property | Value |
|---|---|
| Title font-size | 28px |
| Title font-weight | 800 |
| Title color | rgb(11,29,42) (`--dark`) |
| Subtitle font-size | 13px |
| Subtitle color | rgb(136,136,136) (`--color-text-secondary`, `--g4`) |

## CARDS

| Component | Radius | Padding |
|---|---|---|
| Standard Card (`.tk-card-l3`) | 18px | 2px 16px (verticaal minimaal, intern component-afhankelijk) |

## ICON CONTAINER

| Property | Value |
|---|---|
| Icon box (Domeinen, Icon Row Pattern) | 36×36px |
| Icon box radius | 11px |

## TILES

| Property | Value |
|---|---|
| Snel overzicht metric-cell breedte (390px viewport, 5 tegels) | ~66.8px elk |

## TYPOGRAPHY-KLEUREN (bevestigd, exacte contrastratio's)

| Token | Hex | Contrast op wit | Gebruik |
|---|---|---|---|
| `--color-text-primary` / `--dark` | #0B1D2A | ~15.6:1 | titels, hoofdwaarden |
| `--color-text-secondary` / `--g4` | #888888 | ~3.54:1 | subtitels (NIET voldoende voor kleine, kritieke tekst als enige token) |
| `--color-text-muted` / `--g3` | #bbbbbb | ~1.95:1 | uitsluitend voor werkelijk niet-kritieke, decoratieve tekst |
| `--g6` | #444444 | ~9.74:1 | bewezen, voorkeurstoken voor secundaire-maar-leesbare tekst (trend, coach-advies) |

**Regel:** voor elke tekst die een betekenisvol getal/statuswoord bevat
(trend, delta, status), gebruik `--g6`, niet `--color-text-secondary` of
`--color-text-muted`, tenzij expliciet, programmatisch gemeten dat de
gekozen token >=4.5:1 haalt tegen de daadwerkelijke achtergrond.

## SCROLL

| Rule | Status |
|---|---|
| Verticale pagina-scroll | standaard, altijd toegestaan, geen custom overflow-hack |
| Horizontale component-carousel (Insight Cards) | `overflow-x:auto`, alleen binnen het component, nooit op paginaniveau |
| Geen pagina-brede horizontale overflow | verplichte, herbruikbare test-assertion |

## Openstaande metingen (niet in deze sessie voltooid)

Featured Card (Trainen "Volgende actie"-kaart), Period Selector,
Content Mode Switch, Section Tabs volledige typography-tabel, en Primary/
Secondary Button-geometrie zijn **niet** in deze sessie gemeten -- de
selectors in de eerste meetpoging matchten niet en zijn niet met
voldoende zekerheid herhaald binnen de resterende tijd. Dit blijft open
voor een vervolgmeting, expliciet zo gemarkeerd om geen geschatte waarden
als gemeten te presenteren.
