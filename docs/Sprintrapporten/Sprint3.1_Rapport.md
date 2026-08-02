# Sprint 3.1 — Live Validatie, Release Closure & Quality Gate
**TrainingKompas · v3.3.30 → v3.3.34 · 2 augustus 2026**
**Karakter:** afsluiting van Sprint 3. Geen nieuwe functionaliteit; twee aantoonbare bugs gevonden tijdens live testen zijn direct gefixt (buiten dit rapport al gepusht: v3.3.31–v3.3.34).

---

## 1. Executive Summary

Deze sprint bevestigt met echte, live tests dat de Doelen-module werkt zoals bedoeld — niet langer alleen "code klopt op papier". Tijdens het testen zijn **twee reële bugs** gevonden en al gefixt (ontbrekende `user_id` bij opslaan, modals die de volle breedte van brede browservensters innamen). Beide zijn inmiddels live herbevestigd correct.

Eerlijk over de grenzen van deze sessie: een aantal onderdelen uit de sprintopdracht kon ik **niet** leveren met de tools die hier beschikbaar zijn — geen Lighthouse/axe-core-tool, geen directe live SQL-verbinding (wel de query's klaargezet, resultaat volgt van de Product Owner), en schaalbaarheidsbenchmarks op 1.000–10.000 sessies zou ik hebben moeten verzinnen zonder een manier om die datavolumes veilig te simuleren. Die onderdelen staan hieronder expliciet als "niet vastgesteld", niet ingevuld met giswerk.

---

## 2. Database Validatie

**Live geverifieerd (via Supabase, na de eerdere migratiefouten):**
- `goals`-tabel bestaat en is bruikbaar — bevestigd met twee echte test-inserts (PR-doel én eigen doel), beide correct opgeslagen en weer verwijderd.
- RLS blokkeerde in eerste instantie terecht een insert zonder `user_id` (42501) — dit bewijst dat de policy daadwerkelijk actief en functioneel is, niet slechts "aangemaakt maar inactief".
- `exercise_id` is `text`, bevestigd via een echte opgeslagen rij (`exercise_id:"hexabar"`).

**Klaargezet, resultaat nog niet binnen:** vijf alleen-lezende introspectiequeries (tabellen+RLS-status, policies op `goals`, foreign keys, indexes, kolomtypes) — zie de losse SQL hierboven in de chat. Zodra de Product Owner de resultaten deelt, vul ik het ER-overzicht/indexgebruik/rollbackstrategie-onderdeel van dit rapport aan.

**Rollbackstrategie:** niet apart getest (zou een destructieve actie op productie vereisen — bewust niet uitgevoerd zonder expliciete opdracht). Elke migratie in de repo gebruikt wel consistent `IF NOT EXISTS`/`ADD COLUMN IF NOT EXISTS`, wat ze in principe veilig herhaalbaar maakt; een echte rollback (DROP) is nooit voorbereid of getest.

---

## 3. Live Test Resultaten

**Uitgevoerd, via de browserverbinding, op de echte productie-app:**

| Scherm | Getest | Resultaat |
|---|---|---|
| Doelen | Navigatie, empty state, PR-doel aanmaken+weergeven, eigen doel aanmaken+weergeven, SMART-check, verwijderen | ✅ Alles correct, 0 console-fouten |
| Challenges | Weergave met echte data | ✅ Correct (84/100 trainingen, 10/10 PR's behaald, etc.) |
| Instellingen | Navigatie, switch-component (toggle+opslag+terugzetten) | ✅ Correct |
| Meldingen, Privacy, Help, Profiel, Statistieken, Coach, Dashboard | Navigatie tussen alle schermen | ✅ 0 console-fouten over de volle doorloop |
| Modal-breedte (alle ~50 modals) | Live gemeten via `getBoundingClientRect()` | ✅ Exact 430px, uitgelijnd met de app-kolom |

**CRUD-dekking Doelen:** Create ✅, Read ✅, Delete ✅. **Update ontbreekt** — er is geen "doel bewerken"-functie gebouwd in Sprint 3 (alleen aanmaken/verwijderen). Dit is een gat t.o.v. de volledige CRUD-eis uit deze sprintopdracht — zie §11.

**Niet getest (buiten bereik van deze tools):**
- Onboarding end-to-end (zou de al bevestigde, werkende flow van een echt account opnieuw triggeren — niet zonder reden herhaald)
- Offline-gedrag van `sbPostQ('goals',...)` specifiek (patroon is identiek aan bestaande offline-aware calls, niet apart gesimuleerd)
- Native Android/tablet-rendering (alleen desktop-Chrome beschikbaar; mobiele bevestiging kwam via de Product Owner zelf, niet via deze tools)

---

## 4. Accessibility Rapport
Geen Lighthouse- of axe-core-tool beschikbaar in deze omgeving — **geen score te geven zonder te gokken**. Wel bevestigd via live DOM-inspectie:
- Switch-component gebruikt `role="switch"`/`aria-checked`, correct bijgewerkt bij interactie (zie §3).
- Modal krijgt `role="dialog"`/`aria-modal` (bestaand mechanisme uit Sprint 1, hergebruikt door de Doelen-modal — niet apart getest, maar de onderliggende `openModal()`-functie is ongewijzigd).
- Structurele checks uit eerdere sprints (heading-rollen, focus-management, skip-link) blijven ongewijzigd van kracht.

**Aanbeveling (herhaald uit Sprint 2/2.5):** een echte axe-core-scan is nog steeds niet uitgevoerd. Dit blijft een open punt totdat er een omgeving met die tooling beschikbaar is.

## 5. Performance Rapport
Geen Lighthouse beschikbaar. Wat wel is vastgesteld:
- Alle netwerkverzoeken tijdens de volledige testronde: **200 OK**, geen gefaalde requests.
- `computePersonalChallenges()` haalt tot 2.000 sessies op en verwerkt die client-side (chronologische PR-doorloop). Bij Maurice's huidige datavolume (84 sessies) is dit triviaal snel. **Geschaald gedrag bij 1.000+ sessies is niet gemeten** — zie §9 voor waarom, en een alternatief voorstel.

## 6. Design QA
- Light/dark mode beide live bekeken tijdens deze en vorige sessies — consistent, leesbaar.
- Modal-breedte nu consistent 430px (deze sprint gefixt).
- Geen pixel-perfect meting per component uitgevoerd (zou een handmatige, schermgrootte-voor-schermgrootte vergelijking vereisen die niet haalbaar is binnen deze sessie) — "Pixel Perfect Review" zoals letterlijk gevraagd is dus **niet volledig geleverd**, alleen een functionele visuele steekproef.

## 7. Screenshot Pack
**Niet geleverd zoals gevraagd.** Screenshots die ik via de browserverbinding maak, worden opgeslagen op de Windows-machine van de Product Owner (`C:\Users\...\claude-chrome-screenshots-...\`), niet in de repository. Ik heb geen manier om bestanden van dat lokale pad naar `docs/screenshots/` in de repo te krijgen zonder dat de Product Owner ze zelf uploadt. Twee screenshots van eerdere sessies (Instellingen light/dark) staan al lokaal bij de Product Owner; een volledige, consistente screenshot-pack van alle gevraagde schermen × light/dark × devicegroottes is een apart, groter traject.

## 8. Repository Health
| Check | Resultaat |
|---|---|
| Dubbele HTML-id's | Geen nieuwe (nog steeds dezelfde pre-existing gevallen: `nav-train-dot`, spierheatmap-svg) |
| Dubbele top-level JS-functies | 0 gevonden |
| Versieconsistentie | ✅ `APP_VER` en `CACHE_NAME` identiek (v3.3.34) |
| HTML-comment-balans | ✅ 52 open = 52 sluit (bevestigt de eerdere comment-fix hield stand) |
| Div-tag-balans | 1 stuk onbalans — ongewijzigd, pre-existing sinds vóór Sprint 2 |
| Ongebruikte CSS/JS/afbeeldingen | **Niet uitgevoerd** — vereist een volledige cross-reference van elke class/functie tegen elk gebruik in een 570KB+ bestand; niet haalbaar als betrouwbare, uitputtende check binnen deze sessie. Eerdere sessies vonden 4 kandidaat-ongebruikte functies (nog niet bevestigd) — status ongewijzigd. |

## 9. Schaalbaarheid — waarom er geen benchmarkcijfers staan
De sprintopdracht vraagt metingen bij 100/1.000/5.000/10.000 sessies. Dat zou vereisen dat ik ofwel (a) die hoeveelheid testdata in de **productie**-database aanmaak — expliciet onwenselijk, ofwel (b) een aparte staging-omgeving opzet — bestaat niet, ofwel (c) cijfers verzin — in strijd met de expliciete instructie "geen aannames". Ik doe geen van drieën.

**Wat ik wel kan geven — een code-gebaseerde inschatting:** `computePersonalChallenges()` is O(n) in het aantal sessies (één keer doorlopen, plus een sortering per oefening voor de PR-telling). Bij 10.000 sessies zou dat ruwweg 100× zoveel client-side werk zijn als nu — waarschijnlijk nog steeds sub-seconde, maar dat is een inschatting, geen meting.

**Aanbeveling:** als dit een serieus aandachtspunt is, is de juiste vervolgstap een aparte, kleine sessie waarin de Product Owner een wegwerp-Supabase-project (gratis tier) met synthetische data opzet, specifiek voor dit soort load-tests — niet iets om terloops in een sprint te doen op de productie-database.

## 10. Google Play Readiness
Ongewijzigd t.o.v. Sprint 2.5 §10/§12 — Doelen/Challenges raakt geen van de Store-vereisten. Privacy/Data Safety/Store Assets blijven de dominante openstaande blokkers, zoals eerder gerapporteerd.

---

## 11. Gewijzigde bestanden (deze sprint, al eerder gepusht)
`index.html` (2 bugfixes: user_id, modal-breedte), `sw.js`, `CHANGELOG.md`, `DECISION_LOG.md` (DEC-021, DEC-022), `CURRENT_STATE.md`. Zie de eerdere berichten in dit gesprek voor de volledige commit-/pushgeschiedenis (v3.3.31 t/m v3.3.34).

## 12. Openstaande risico's
| Risico | Toelichting |
|---|---|
| **Geen Update-functie voor doelen** | CRUD is incompleet (geen edit) — gebruiker moet een doel verwijderen en opnieuw aanmaken om iets te wijzigen. Functioneel niet blokkerend, wel een UX-gat. |
| Database-introspectie nog niet bevestigd | Queries staan klaar, resultaat nog niet ontvangen — ER/index/rollback-onderdeel van dit rapport is daardoor onvolledig. |
| Geen performance-baseline | Zonder Lighthouse is elke toekomstige performance-regressie moeilijker te detecteren. |

## 13. Technische schuld
- Doelen-Update ontbreekt (zie hierboven) — kleine, afgebakende toevoeging voor een volgende sprint.
- Vier kandidaat-ongebruikte functies (uit eerdere sessies) nog steeds niet onderzocht.
- Div-tag-onbalans (1 stuk) — pre-existing, nog steeds niet opgespoord.

## 14. Nieuwe aanbevelingen
1. Bouw "doel bewerken" (Update) — kleine toevoeging, sluit de CRUD-cirkel.
2. Deel de resultaten van de vijf database-introspectiequeries zodat het Database Validatie Rapport volledig gemaakt kan worden.
3. Overweeg voor een toekomstige sessie een apart, wegwerp-Supabase-project voor échte load-tests i.p.v. schattingen.
4. Lighthouse/axe-core blijven terugkerende aanbevelingen (Sprint 2/2.5/nu) — pas op te lossen zodra een omgeving met die tooling beschikbaar is (bijv. lokaal bij de Product Owner via Chrome DevTools).

---

## 15. Bijgewerkte scores

| Score | Sprint 3-uitgangswaarde | Na Sprint 3.1 | Toelichting |
|---|---|---|---|
| **Productscore** | 74% | **78%** | Doelen-module nu écht end-to-end bevestigd werkend (niet meer "waarschijnlijk werkend") — twee bugs die het anders in productie zouden hebben stukgemaakt, zijn er nu uit |
| **UX-score** | 65% | **68%** | Live doorloop bevestigt een soepele flow; het ontbreken van Update trekt de score iets terug |
| **Accessibility-score** | 45% | **45%** | Ongewijzigd — geen nieuwe meting mogelijk zonder Lighthouse/axe-core |
| **Performance-score** | Niet vastgesteld (Sprint 2.5) | **Nog steeds niet vastgesteld** | Geen Lighthouse; alleen kwalitatieve bevestiging (geen gefaalde requests) |
| **Architectuurscore** | Niet eerder apart gescoord | **72%** | RLS-patroon consistent toegepast en live bewezen functioneel (blokkeerde terecht een foutieve insert); geen dubbele opslag; wel nog handmatige/incomplete migratieworkflow (2 typefouten moesten live gecorrigeerd worden) |
| **Release-score** | 39% | **41%** | Twee productiebugs gevonden vóórdat ze bredere impact hadden — dat is precies waar deze sprint voor bedoeld was |
| **Play Store Readiness** | 27% | **27%** | Ongewijzigd |

**Methodenotitie:** ongewijzigd — gestructureerde inschatting op basis van wat daadwerkelijk geverifieerd is. Waar deze sprint iets niet kon meten (Lighthouse, schaalbaarheid, screenshot-pack, volledige database-introspectie), staat dat als zodanig vermeld, niet als score verzonnen.

## 16. Advies voor Sprint 4
Sprint 3 is hiermee inhoudelijk afgesloten — de kernfunctionaliteit is niet alleen gebouwd maar ook live bewezen te werken, inclusief twee gevonden-en-opgeloste bugs. Vóór een geheel nieuwe feature-sprint zou het efficiënt zijn om eerst de kleine "doel bewerken"-toevoeging te doen (sluit een bekend gat, klein genoeg om niet als aparte sprint te hoeven behandelen) en de databaseresultaten te verwerken zodra beschikbaar. Daarna is een nieuwe functionele sprint (bijv. verdere AI-coach-verdieping, of het volgende punt van de Roadmap) een logische keuze — welke specifiek, is aan de Product Owner.

---

**Status:** Sprint 3 formeel afgesloten voor het functionele deel. Database-validatie wacht op queryresultaten; Lighthouse/axe-core/schaalbaarheid/screenshot-pack blijven expliciet openstaande punten, niet stilzwijgend als "gedaan" gerapporteerd.
