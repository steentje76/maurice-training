# Trainingskompas UX Component Contracts v2

Bron: echte, Playwright-gemeten waarden op de gemergde Trainen v0.2 /
Inzicht v0.1-runtime (main SHA `ecf09049...`), plus bestaande CSS-
klassen in index.html. Waar geen empirisch bewijs bestaat, expliciet
gemarkeerd als **NOT YET EMPIRICALLY DEFINED**.

---

## 1. Page Shell
**Semantic purpose:** buitenste scherm-container, altijd 1 per `.scr`.
**Reference:** alle schermen (`.scr`).
**Reference DOM:** `<div class="scr" id="...">`, kind: `.hdr` + `.scroll`.
**When to use:** elk nieuw hoofdscherm.
**When not to use:** modals (eigen `.modal`-patroon).
**Tokens:** `--bg` achtergrond.
**Measured geometry:** scroll horizontal padding 16px (gemeten, Trainen).
**Responsive:** vaste 16px inset op alle geteste breedtes (320-430px).
**Test contract:** geen horizontale page-overflow op 320-430px.
**PO decision:** geen open punt.

## 2. Header + Avatar
**Reference:** alle schermen, `.hdr`.
**Measured geometry:** padding-top 52px (of safe-area+12px), padding-
bottom 12px; title font-size 28px/weight 800/kleur `--dark`; subtitle
font-size 13px/kleur `--g4` (rgb 136,136,136).
**Avatar:** ronde profielfoto/fallback rechtsboven, klikbaar naar Profiel.
**Icon behavior:** avatar-cirkel, teal rand indien canonical (niet
empirisch bevestigd op alle schermen in deze sessie).
**Accessibility:** avatar heeft `aria-label` op de meeste schermen
(bevestigd bij Trainen: "Profiel openen").
**Test contract:** titel/subtitel altijd aanwezig en niet leeg.
**PO decision:** exacte avatar-rand-styling per scherm: NOT YET
EMPIRICALLY DEFINED op alle schermen, alleen op Trainen bevestigd.

## 3. Standard Card
**Reference:** Inzicht (`.tk-card-l3`).
**Measured geometry:** border-radius 18px, padding 2px 16px (extern;
intern component-afhankelijk).
**When to use:** groeperende container voor gerelateerde content-
secties (Jouw ontwikkeling, Snel overzicht).
**When not to use:** losse, individuele tegels (gebruik Action/KPI/
Metric Tile i.p.v. content in een Standard Card te proppen).
**Test contract:** radius exact 18px, geen afwijkende radius zonder
semantische reden (Featured Card).

## 4. Featured Card
**Reference:** Trainen "Volgende actie"-kaart (donkere achtergrond,
`#0B1D2A`).
**Measured geometry:** **NOT YET EMPIRICALLY DEFINED** -- de meetpoging
in deze sessie matchte de selector niet met voldoende zekerheid; geen
gegokte waarde gepresenteerd.
**Semantic rule:** alleen gebruiken voor de primaire, tijdgebonden
call-to-action van een scherm (max 1 per scherm), nooit voor decoratie.
**PO decision:** exacte radius/padding moet in een vervolgsessie
empirisch gemeten worden voordat een nieuw scherm dit hergebruikt.

## 5. Icon Container
**Reference:** Inzicht Domeinen (`.tk-icon-box`).
**Measured geometry:** 36×36px, border-radius 11px.
**Icon behavior:** SVG binnenin, `stroke="currentColor"`, kleur via
`--color-primary` (teal) op lichte achtergrond (`--color-primary-soft`).
**Known variant:** kleinere variant (Snel overzicht, 22×22px met 7px
radius) -- gemeten, bevestigd afwijkend van de 36px-standaard voor
compactere tegel-contexten.
**Test contract:** icoon zelf heeft `stroke="currentColor"` (voorkomt de
eerder gevonden "zwart icoon"-regressie).

## 6. Icon + Text + Chevron Row
**Reference:** Inzicht Domeinen-rijen (`.tk-domain-row`, `.row` binnen
`.v43-tmt`).
**Structure:** icon-container | tekst-blok (`.t` title + `.s` subtitle,
BEIDE verplicht `display:block`) | optionele visual-zone | chevron.
**Measured geometry:** rij-padding 10px verticaal (gescoped override,
niet de gedeelde 15px van `.v43-tmt .row` zelf).
**Hard rule (uit Lessons Learned #2):** `.t`/`.s` altijd expliciet
`display:block`, nooit vertrouwen op omliggende class alleen.
**Test contract:** geen concatenatie van titel+subtitel in `innerText`.

## 7. Action Tile
**Reference:** Trainen "Start een activiteit" (Kracht/Hardlopen/Fietsen/
HYROX/Meer).
**Structure:** icon-container boven, label eronder, geen aparte
sub-tekst.
**Responsive:** 5 tegels op 1 rij bevestigd op de canonical breedtes.
**Test contract:** gelijke tegel-breedte/hoogte, geen mid-word wrapping.

## 8. KPI Tile
**Reference:** Inzicht Jouw ontwikkeling (`.tk-summary-cell`).
**Structure:** icoon (trend/kalender/doel) -> hoofdwaarde (`.num`) ->
label -> optionele context/delta. Volgorde icoon->waarde->label is
BEWUST (Lessons Learned #5): label na de waarde voorkomt dat een lang
label de waarde-positie beinvloedt.
**Test contract:** max 1px verticale afwijking tussen de 4 waarde-
posities op 390/430px (bevestigd, sabotage-getest).

## 9. Metric Tile
**Reference:** Inzicht Snel overzicht (`.tk-overview-cell`).
**Measured geometry:** celbreedte ~66.8px bij 5 tegels op 390px.
**Structure:** icoon -> label (vaste min-height) -> waarde+eenheid ->
optionele trend (alleen tonen bij >=2 valide datapunten, zie Lessons
Learned #6).
**Trend kleur:** `--g6` (#444444, ~9.74:1 contrast) -- NOOIT
`--color-text-muted` of `--color-text-secondary` alleen voor
betekenisvolle tekst (Lessons Learned #7).
**Test contract:** max 1px verticale afwijking tussen alle waarde-
posities; geen trend-indicator bij <2 datapunten.

## 10. Insight Card
**Reference:** Inzicht "Recente inzichten" (`.tk-insight-card`).
**Structure:** icoon-in-cirkel -> titel (`.t`) -> beschrijving (`.s`),
beide `display:block`.
**Responsive:** horizontale scroll (`overflow-x:auto`) toegestaan
uitsluitend binnen dit component, nooit op paginaniveau.
**Test contract:** laatste kaart bereikbaar via scroll op de smalste
geteste breedte (320px).

## 11. Primary Button
**Reference:** Trainen "Start training" (volle breedte, teal, binnen
Featured Card).
**Measured geometry:** **NOT YET EMPIRICALLY DEFINED** (afhankelijk van
Featured Card-meting, zie component 4).

## 12. Secondary Button
**Reference:** Trainen "Bekijk details" (outline, naast Primary Button).
**Measured geometry:** **NOT YET EMPIRICALLY DEFINED**.

## 13. Period Selector
**Reference:** Inzicht (`.tk-period-selector`, role=tablist).
**Structure:** 3 tabs (7 dagen/4 weken/3 maanden), actieve tab teal-
achtergrond.
**Accessibility:** `role="tablist"`/`role="tab"`, `aria-selected`
bevestigd correct togglend (browsertest-bewezen).
**Responsive:** deelt de rij met Filter Chip; stapelt verticaal
alleen op zeer smalle viewports indien nodig (canonical: horizontaal
op alle geteste breedtes, bevestigd zonder mid-word-wrap).

## 14. Content Mode Switch
**Status:** **NOT YET EMPIRICALLY DEFINED** -- geen bevestigd
voorbeeld in de gemergde Trainen/Inzicht-runtime gevonden in deze
sessie. PO/Screen Implementation-beslissing bij eerste daadwerkelijk
gebruik (canonical kandidaat: Coach AI/Mijn coach-switch, nog niet
gebouwd).

## 15. Section Tabs
**Status:** **NOT YET EMPIRICALLY DEFINED** in de huidige, gemergde
runtime. Canonical kandidaat: Samen-overzicht (Feed/Vrienden/Groepen/
Clubs) -- dat scherm bestaat nog niet.

## 16. Filter Chip
**Reference:** Inzicht sportfilter (`.tk-filter-chip`).
**Measured/verified:** `flex-shrink:0`, geen `max-width`/`ellipsis`
(expliciet verwijderd na de eerdere afkap-regressie, Lessons Learned #3).
**Test contract:** volledige labeltekst nooit afgekapt op 320-430px.

## 17. Horizontal Card Carousel
**Reference:** Inzicht Insight Cards (zie component 10) -- dit is
dezelfde onderliggende mechaniek, apart benoemd omdat de opdracht dit
als los component vereist.
**Rule:** interne scroll (`overflow-x:auto`), nooit pagina-brede
horizontale overflow. Bevestigd via test op 320px (kleinste breedte,
meest kans op overflow).
