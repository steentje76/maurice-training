# MS-F13-04_ACCESSIBILITY_MOBILE_ERGONOMICS.md — Trainingskompas

**Baseline main SHA:** `de9296a385acb843ae786887ca47709a6123eaaf`. Datum: 30 augustus 2026.

## Audit van kernflows

Reeds goed (bevestigd, niet opnieuw gebouwd):
- Pinch-zoom/tekstschaling: maximum-scale=1,user-scalable=no reeds verwijderd (ROADMAP POST-V1 #6).
- Modal focus management: lastFocusedBeforeModal bestaat (5 gebruiksplekken).
- Android terugknop: bestaande history.pushState-anker-patroon voorkomt dat de eerste terugveeg de app direct afsluit.
- Icon-only-knoppen: alle 8 gevonden knoppen met uitsluitend een SVG-inhoud hebben al een aria-label.

Gevonden en gecorrigeerd: touch-target-omvang tijdens actieve training
.set-more (setopties-menu) en .set-rest (rust-knop) waren 36x42px -- onder de aanbevolen minimale 44x44px (WCAG 2.5.5 Target Size). Specifiek relevant tijdens een actieve training, waar de gebruiker fysiek inspant. Vergroot naar 44x44px -- minimale, geisoleerde CSS-wijziging, geen visuele redesign.

## Bewust niet aangepast in deze sprint
- De 735 font-size:10-13px-vermeldingen zijn overwegend labels/badges/secundaire tekst -- een volledige contrast/leesbaarheidsaudit zou een aanzienlijke inspanning zijn zonder een aangetoond, concreet probleem per geval. Geregistreerd als non-blocking.
- Geen structurele screen-reader-semantiek-herbouw zonder een specifiek gemelde klacht.

## Conclusie
Kleine, gerichte, laag-risico verbetering doorgevoerd (touch-targets tijdens training) plus bevestiging dat de belangrijkste, structurele toegankelijkheidsfundamenten al aanwezig en correct zijn.
