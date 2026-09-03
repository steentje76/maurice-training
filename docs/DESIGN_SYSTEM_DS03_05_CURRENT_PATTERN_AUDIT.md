# DESIGN_SYSTEM_DS03_05_CURRENT_PATTERN_AUDIT.md

## Iconen
| CURRENT PATTERN | Location | Usage count | Semantic purpose | Visual family | A11y | Reusable | Target |
|---|---|---|---|---|---|---|---|
| Emoji (🏋️💪👥❤️⚙️🔔📅) | verspreid, o.a. bottom-nav, quick-actions | 74 | navigatie/functie-iconen | inconsistent, kinderlijk t.o.v. baseline | geen `aria-label`, betekenis via glyph alleen | NEE (PO: emoji niet als structureel icoon) | Vervangen door canonical line-icon (DS-03) |
| Inline SVG `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"` | 31 treffers, verspreid | 31 | diverse functie-iconen | **exact de outline/line-stijl uit de baseline** | wisselend (sommige `aria-hidden`, de meeste niet) | JA — dit wordt de basis van de canonical strategie | Hergebruikt, geformaliseerd in DS-03-registry |
| `.ibtn svg{stroke:currentColor;fill:none;stroke-width:1.8}` | icon-buttons | 19px vaste maat | icoon binnen ronde knop | consistent met outline-stijl | wisselend | JA | Aansluiten op nieuwe `--icon-*`-maten |

## Buttons
| CURRENT PATTERN | Location | Usage count | Target |
|---|---|---|---|
| `.btn-r` (dark surface) | verspreid | tientallen | Blijft bestaan (legacy); nieuw `.btn-primary` gebruikt teal conform PO-besluit |
| `.btn-o` (outline) | verspreid | tientallen | Blijft bestaan; nieuw `.btn-secondary` additief |
| `.btn-d` (accent/teal) | verspreid | tientallen | Blijft bestaan; is het PO-goedgekeurde PRIMARY-kleurpatroon, nieuw `.btn-primary` bouwt hierop voort |
| `.ibtn` (rond, 36px) | verspreid | tientallen | Blijft bestaan; nieuw `.btn-icon` additief, DS-01-tokens |
| Geen TERTIARY/DESTRUCTIVE-variant | — | 0 | Nieuw te bouwen (DS-04) |

## Cards
| CURRENT PATTERN | Location | Usage count | Target |
|---|---|---|---|
| `.card` (wit, `--r:8px` of lokale `16px`-override) | overal | honderden | Blijft bestaan (legacy); nieuwe `.card-l1..l5`-klassen additief, gebruiken `--radius-card` |
| `.today-cta`/`.today-start` (marine surface, actie-kaart) | Home | 1 | Conceptueel Level 1 — nieuw `.card-l1` formaliseert dit patroon zonder de bestaande klasse te wijzigen |

**Consolidatieprincipe:** geen van bovenstaande, bestaande patronen wordt gewijzigd of verwijderd. Nieuwe, canonieke klassen/componenten worden ADDITIEF toegevoegd.
