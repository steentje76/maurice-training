# Sprint 2.5 — Validatie, Polish & Release Readiness
**TrainingKompas · v3.3.27 → v3.3.28 · 2 augustus 2026**
**Karakter:** kwaliteitssprint, geen features. Twee bugfixes uitgevoerd, uitsluitend omdat ze aantoonbaar zijn (live console-fouten), conform de opdracht.

---

## 1. Executive Summary

Deze sprint kreeg halverwege een cruciale wending: browsertoegang kwam beschikbaar en de productie-app bleek nog ingelogd te staan in een actieve sessie van de Product Owner. Daardoor kon een aanzienlijk deel van de sprint **echt, op de live app** worden uitgevoerd in plaats van uitsluitend statisch — inclusief het vinden van **twee reële bugs die met code-inspectie alleen niet aan het licht waren gekomen.**

Tegelijk moet er eerlijk gezegd worden wat **niet** is gedaan: er was geen apart testaccount, dus is er uit voorzichtigheid met de bestaande sessie gewerkt (read-only navigatie/inspectie, geen destructieve acties). Een aantal punten uit de sprintopdracht — een echte Lighthouse-score, een axe-core-scan, native Android/tablet-tests — vereisen tooling die niet beschikbaar is in deze omgeving en zijn dus **niet uitgevoerd**, in plaats van benaderd of verzonnen.

---

## 2. Device Test Resultaten

**Uitgevoerd (via Claude in Chrome, live op maurice-art.netlify.app):**

| Scherm | Resultaat |
|---|---|
| Dashboard (Home) | ✅ Renderend, echte data zichtbaar (HRV/RHR/slaap/dagfactor), "Trainingskompas"-titel past zonder overloop naast het icoon |
| Instellingen (8.3) | ✅ Renderend, alle kaarten (Thema/Taal/Meldingen/Privacy/Offline/App-info) zichtbaar |
| Meldingen (8.2) | ✅ Renderend |
| Privacy (9.6) | ✅ Renderend, placeholder-kader zichtbaar zoals bedoeld |
| Help (9.4/9.5/9.7) | ✅ Renderend |
| Onboarding (stap 1, 3, 8) | ✅ Renderend; privacy-checkbox-gate bevestigd functioneel (Volgende-knop `disabled` tot aanvinken) |
| Dark mode | ✅ Visueel bevestigd leesbaar op Help-scherm (donkerblauw/petrol-achtergrond, lichte tekst) |

**Niet uitgevoerd:**
- Echte Android-/tabletdevice-test (alleen desktop-Chrome beschikbaar)
- Landscape-oriëntatie (niet zinvol te testen op desktop-breedte)
- Native mobiele viewport (<430px, fluid-layout-pad) — `resize_window` bleek het daadwerkelijke browservenster op dit systeem niet betrouwbaar te verkleinen tot telefoonbreedte; de 430px-vaste-breedte-weergave op desktop is wél getest en toont geen problemen
- Keyboard-/tab-order-doorloop, touch-target-metingen — geen tijd binnen deze sprint na de bugfixes; aanbevolen voor een vervolgsessie

## 3. Accessibility Resultaten
- Structurele controles uit Sprint 1/2 (roles, aria-labels, focus-management) blijven onveranderd van kracht — visueel niets gebroken aangetroffen tijdens navigatie.
- **Niet uitgevoerd:** axe-core-scan, Lighthouse Accessibility-score, screenreader-doorloop. Geen van de beschikbare tools in deze omgeving kan dit leveren; hier geen cijfer verzonnen.

## 4. UX Resultaten
- Geen inconsistenties aangetroffen bij het doorlopen van Instellingen/Meldingen/Privacy/Help/Onboarding-stappen 1/3/8.
- Loading/empty/success-states niet stuk voor stuk uitgelokt (zou destructieve/langdurige acties op het echte account vereisen) — niet gevalideerd.

## 5. Design Review
- Kleurgebruik, typografie (Poppins) en componentconsistentie (cards/switches/segmented control) visueel bevestigd conform de Sprint 2-implementatie, in zowel light als dark.
- Geen redesign uitgevoerd, conform opdracht.

## 6. Lighthouse Resultaten
**Niet beschikbaar in deze omgeving** — er is geen Lighthouse-tool aangesloten. In plaats daarvan is een benaderende performance-controle gedaan via netwerkverzoeken (§7).

## 7. Performance Resultaten
- Alle kernresources (HTML, manifest, Poppins-fonts ×4, iconen, Supabase REST-calls, Netlify Functions) laadden met **statuscode 200**, geen gefaalde requests.
- Geen console-gerapporteerde memory-leak-patronen waargenomen tijdens deze sessie.
- **Niet gemeten:** exacte laadtijd, JS-bundle-parseertijd, CSS-render-blocking-analyse — vereist Lighthouse/DevTools Performance-paneel, niet beschikbaar via de huidige tools.

## 8. Repository Health
| Bevinding | Status |
|---|---|
| Dubbele HTML-id's | Ongewijzigd t.o.v. Sprint 2 (pre-existing: `nav-train-dot` ×12, spierheatmap-svg-onderdelen) — geen nieuwe dupes |
| Ongebruikte afbeeldingen | Geen — beide iconbestanden worden gebruikt (manifest + HTML) |
| Mogelijk ongebruikte functies | 4 kandidaten gevonden bij een grove telling (`isCardioEx`, `pb`, `pp`, `setExPickerFilter`) — **niet bevestigd als daadwerkelijk dood**, kunnen ook uit inline-attributen aangeroepen worden die de grove telling mist. Aanbevolen voor gerichte controle in een aparte sessie, niet blind verwijderd. |
| Verouderde documentatie | Geen gevonden — CURRENT_STATE/ROADMAP/CHANGELOG/DECISION_LOG allemaal bijgewerkt t/m deze sprint |
| Versieconsistentie | ✅ `APP_VER` en `CACHE_NAME` identiek (v3.3.28 / maurice-training-v3328) |

## 9. Test Resultaten
```
node --check (hoofdscript)   → SYNTAX OK
node logic_tests.js          → 141 geslaagd, 0 mislukt (ongewijzigd, geen regressies door de bugfixes)
```
Geen nieuwe geautomatiseerde tests toegevoegd — de twee bugfixes zijn defensieve/schema-wijzigingen zonder nieuwe berekeningslogica, dus buiten het bereik van de DOM-loze `logic_tests.js`-aanpak.

## 10. Google Play Readiness
Geen wijziging t.o.v. Sprint 2 — Privacy/Help bestaan nu wél (met bewust gemarkeerde placeholders), maar de kern-blokkers blijven open:

| Onderdeel | Status |
|---|---|
| Privacy (beleidstekst) | 🟡 Structuur aanwezig, juridische tekst nog placeholder |
| Data Safety | 🔴 Formulier nog niet opgesteld |
| Permissions | Niet van toepassing zolang er geen native wrapper is |
| Branding | 🟢 Doorgevoerd (Sprint 2) |
| Accessibility | 🟡 Structureel aanwezig, niet geautomatiseerd geverifieerd |
| Store Assets (Feature Graphic, Screenshots, App description) | 🔴 Niet aanwezig — buiten scope van wat in deze sessie te produceren is (vereist grafisch ontwerpwerk, geen codetaak) |
| Launcher Icon | 🟢 Aanwezig (icon-192/512.png) |

## 11. Screenshot Overzicht
Twee screenshots opgeslagen tijdens de live sessie (Instellingen-scherm, light en dark mode) — deze staan lokaal op het systeem van de Product Owner:
- `screenshot-1785683254007-13.png` (Instellingen, light mode)
- `screenshot-1785683254009-14.png` (Instellingen, dark mode)

**Niet gegenereerd:** screenshots van Splash/Login/Training/AI Coach/Onboarding-stappen als losse exportbestanden, en geen vergelijkingsset voor Store-gebruik — dat is een apart, groter traject (meerdere schermen × light/dark × devicegroottes) dat een gerichte sessie verdient, niet iets om binnen deze validatiesprint "erbij" te doen.

## 12. Gewijzigde bestanden
| Bestand | Wijziging |
|---|---|
| `index.html` | Bugfix `refreshStats()` defensieve null-check, `APP_VER` → v3.3.28 |
| `sw.js` | `CACHE_NAME` → v3328 |
| `migratie_v336.sql` | **Nieuw** — `doel`-kolom op `atleet_profiel` (nog uit te voeren) |
| `docs/00_Project_Management/CURRENT_STATE.md` | Bijgewerkt, inclusief actiepunt migratie |
| `docs/00_Project_Management/DECISION_LOG.md` | DEC-015 toegevoegd |
| `CHANGELOG.md` | v3.3.28-sectie |

## 13. Openstaande risico's
- **Migratie v336 nog niet uitgevoerd** — tot dat gebeurt, blijft elke onboarding-afronding een stille Supabase-syncfout geven (device-lokaal blijft wel werken).
- Live validatie gebeurde op een **bestaand, actief account**, niet een neutraal testaccount — bevindingen zijn representatief, maar edge cases (nieuwe-gebruiker-onboarding vanaf nul, lege-staat-schermen) zijn niet apart getest.
- Geen enkele meting van Lighthouse/axe-core — de Play Store-/performance-scores hieronder blijven daardoor inschattingen, niet gemeten cijfers.

## 14. Technische schuld
- 4 mogelijk ongebruikte functies (§8) — nader onderzoek nodig vóór opschonen.
- Store-assets (screenshots, feature graphic, beschrijvingsteksten) volledig ontbrekend — dit is geen codeschuld maar een apart contentdeliverable voor Fase 5.

## 15. Nieuwe aanbevelingen
1. **Voer `migratie_v336.sql` zo snel mogelijk uit** — dit is de enige actie die nu al gebruikers raakt.
2. Maak een apart wegwerp-testaccount aan (DEC-015) zodra device-validatie een vast onderdeel van de werkwijze wordt, zodat toekomstige sessies niet afhankelijk zijn van een toevallig actieve sessie.
3. Plan een aparte "Store-assets"-sessie (screenshots per scherm/thema/device, feature graphic, beschrijvingsteksten) — geen codetaak, andere aanpak nodig dan een sprint.
4. Onderzoek de 4 kandidaat-dode functies gericht (bijv. met een simpele grep op onclick-attributen) vóór ze eventueel te verwijderen.

---

## 16. Bijgewerkte scores

| Score | Sprint 2-uitgangswaarde | Na Sprint 2.5 | Toelichting |
|---|---|---|---|
| **Productscore** | 68% | **70%** | Twee reële bugs gedicht (één daarvan al vóór Sprint 2 aanwezig) — kleine maar zuivere kwaliteitswinst |
| **UX-score** | 58% | **62%** | Live bevestigd dat de Sprint 2-schermen daadwerkelijk werken zoals bedoeld, inclusief de privacy-gate-logica — dit was voorheen alleen aangenomen |
| **Accessibility-score** | 45% | **45%** | Ongewijzigd — geen geautomatiseerde scan uitgevoerd, dus geen nieuwe onderbouwing voor een hogere score |
| **Performance-score** | Niet eerder gescoord | **Niet vastgesteld** | Geen Lighthouse/DevTools-meting mogelijk — een cijfer geven zou een aanname zijn |
| **Release-score** | 34% | **38%** | Eén kritieke live bug (doel-kolom) opgelost zodra migratie draait; Store-assets/Data Safety blijven de dominante blokkerende factor |
| **Play Store Readiness** | 27% | **27%** | Ongewijzigd — deze sprint loste app-bugs op, geen Store-vereisten |

**Methodenotitie:** waar deze sprint wél live kon meten (rendering, netwerk, console-fouten), is dat als harde bevinding gerapporteerd. Waar meting niet mogelijk was (Lighthouse, axe-core, native device), staat dat expliciet vermeld in plaats van ingevuld.

## 17. Advies voor Sprint 3
Gegeven dat de kritieke live-bug nu bekend is: eerst **migratie v336 laten uitvoeren** door de Product Owner vóór er iets nieuws gebouwd wordt — dat is een blokkerende afhankelijkheid, geen keuze. Daarna is, net als in het Sprint 2-rapport al geadviseerd, het Doelen-scherm (7.1) de logische volgende stap, nu ook nog eens extra relevant omdat de `doel`-kolom er letterlijk al ligt te wachten.

---

**Status:** klaar voor beoordeling door de Product Owner. **Belangrijkste actiepunt: migratie v336 uitvoeren in Supabase.** Wordt hierna naar GitHub gesynchroniseerd.
