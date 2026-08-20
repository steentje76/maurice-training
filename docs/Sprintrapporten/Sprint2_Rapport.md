# Sprint 2 — Instellingen, Onboarding & Branding
**TrainingKompas · v3.3.26 → v3.3.27 · 2 augustus 2026**
**Scope-bevestiging:** geen file-split, geen nieuwe AI-functionaliteit, geen abonnementen/premium, geen grote refactor. Alle wijzigingen additief in de bestaande single-file-architectuur.

---

## 1. Executive Summary

Sprint 2 bouwt vijf ontbrekende schermen uit de Sprint 0-audit (Instellingen, Meldingen, Privacy, Help, Onboarding) en voert de op 1 augustus vastgestelde merkidentiteit (DEC-010) daadwerkelijk door in de code. Alle wijzigingen zijn additief: bestaande functionaliteit is ongewijzigd, de volledige testsuite blijft groen (141/141).

De twee grootste openstaande risico's zijn geen codekwaliteitsissues maar **verificatiegaten**: onboarding en de thema-wissel zijn opgebouwd en syntactisch/logisch gevalideerd, maar nog niet op een echt device gezien — dat vereist een menselijke tester (zie §5).

---

## 2. Uitgevoerde werkzaamheden

### 2.1 Instellingen (8.3)
Volledig scherm: Thema (segmented control light/dark/automatisch, direct toegepast via `data-theme`-attribuut), Taal (informatief — app is NL-only, geen niet-bestaande functionaliteit gesuggereerd), Meldingen (doorverwijzing naar 8.2), Geluid/Trillingen (switches), Privacy (doorverwijzing naar 9.6), Toegankelijkheid (leest `prefers-reduced-motion`-status uit), Offline & opslag (verbindingsstatus, wachtrij-doorverwijzing, cache-verversen-knop), App-informatie (versie, debuginfo, doorverwijzing naar Help/Licenties).

### 2.2 Meldingen (8.2)
5 losse switches (trainingsherinneringen/herstel/AI Coach/updates/systeem), elk met eigen `localStorage`-voorkeur, plus een knop voor browsertoestemming (`Notification.requestPermission()`) met statusweergave (verleend/geblokkeerd/nog niet gevraagd/niet ondersteund).

### 2.3 Privacy (9.6)
Feitelijke tekst over welke data wordt opgeslagen, hoe de AI-coach data gebruikt, en hoe verwijdering werkt — elke bewering is geverifieerd tegen de code (RLS, server-side AI-proxy, account-verwijderfunctie), niet verzonnen. De ontbrekende juridische privacyverklaring/AVG-grondslagenoverzicht is **expliciet als placeholder gemarkeerd** met een duidelijk zichtbaar waarschuwingskader, conform de opdracht "geen juridische teksten verzinnen".

### 2.4 Help (9.4/9.5/9.7)
FAQ (3 vragen, gebaseerd op bestaande functionaliteit), Contact & feedback (placeholder — geen kanaal gedocumenteerd), Over de app (versie, ontwikkelaar), Licenties (Poppins/Google Fonts vermeld, overig als placeholder).

### 2.5 Onboarding
9 stappen: Welkom → Hoe het werkt → Doel → Trainingsniveau → Sport → Meldingen-toestemming → Offline-info → Privacy-akkoord (verplichte checkbox) → Start. Doel/niveau/sport worden opgeslagen in het bestaande `atleet`-object (hergebruik van bestaande velden waar mogelijk; `doel` is een nieuw, minimaal veld vooruitlopend op het toekomstige Doelen-scherm — zie DECISION_LOG). Gate via `localStorage`-vlag in `startAppAfterAuth()`, zodat de wizard precies één keer verschijnt per device (beperking: device-, niet account-gescoped — DEC-013).

### 2.6 Branding
- Google Fonts-link vervangen: Barlow Condensed/Barlow → Poppins (400–900), ook in `sw.js`-precache.
- `--f`-token → Poppins; `--bg`/`--dark`/`--accent`/`--accent2` → officiële merkkleuren (`#E6EBEF`/`#0B1D2A`/`#00B894`/`#0E3B4A`).
- Handmatige thema-override (`html[data-theme="dark|light"]`) toegevoegd naast de automatische Sprint 1-detectie, met hogere CSS-specificiteit zodat een bewuste keuze altijd wint.
- Vroege thema-toepassing via een klein inline `<script>` in `<head>`, vóór de CSS parsed wordt — voorkomt een flits van het verkeerde thema bij page load.
- KOMPAS-afkorting gecorrigeerd naar "Trainingskompas" op **login-** en **dashboardscherm** (de twee plekken waar de afkorting daadwerkelijk voorkwam — geverifieerd via full-text search, geen andere voorkomens gevonden).
- `manifest.json` theme_color/background_color bijgewerkt.
- **Bewust ongewijzigd:** semantische kleuren (waarschuwing-geel `#c8a84b`, foutmelding, spierheatmap/grafiekkleuren zoals `#9C27B0`) — deze staan niet in het vastgestelde 5-kleuren-merkpalet en zijn functioneel, geen merkelement (DEC-014). Ook `manifest.json`'s `short_name: "Kompas"` is ongewijzigd gelaten — dat is een technisch veld voor ruimte-beperkte OS-iconen, geen in-app-afkorting, en dus geen overtreding van de DEC-010-merkregel.

### 2.7 Accessibility (uitbreiding op Sprint 1)
Alle nieuwe switches gebruiken `role="switch"` + `aria-checked` (conform H7 Component Library, niet een kale checkbox). Nieuwe schermtitels krijgen automatisch `role="heading" aria-level="1"` via het bestaande Sprint 1-mechanisme (klasse `.hdr-title`). Het thema-segmented-control gebruikt `role="radiogroup"`/`role="radio"`. **Niet gedaan:** een volledige WCAG-scan (axe-core) op de nieuwe schermen — dat vereist een browseromgeving die niet beschikbaar is in deze sessie; zie §5.

### 2.8 UX-consistentie
Nieuwe schermen hergebruiken uitsluitend bestaande componentklassen (`.card`, `.btn`, `.ibtn`, `.adm-row`-achtig patroon via de nieuwe `.set-row`/`.set-nav-row`, die bewust dezelfde visuele taal spreken als het bestaande Beheer-scherm). Geen nieuwe layoutpatronen geïntroduceerd.

---

## 3. Gewijzigde bestanden

| Bestand | Aard van de wijziging |
|---|---|
| `index.html` | +5 nieuwe schermen (Instellingen, Meldingen, Privacy, Help, Onboarding), nieuwe CSS-componenten (Switch, Segmented Control, set-row-patroon), branding-tokens, thema-override-logica, onboarding-wizard-JS, `APP_VER` v3.3.26→v3.3.27 |
| `sw.js` | Precache-fontlijst Poppins i.p.v. Barlow, `CACHE_NAME`-bump v3326→v3327 |
| `manifest.json` | `background_color`/`theme_color` naar merkkleuren |
| `docs/00_Project_Management/CURRENT_STATE.md` | Bijgewerkt (nieuwe release, wat werkt/niet werkt, bugs, technische schuld, openstaande beslissingen) |
| `docs/00_Project_Management/DECISION_LOG.md` | DEC-013, DEC-014 toegevoegd |
| `docs/12_Roadmap/Roadmap.md` | Onboarding-punt afgevinkt, branding-punten genuanceerd (merkidentiteit-uitrol af, dynamische gym-skin blijft open) |
| `CHANGELOG.md` | v3.3.27-sectie toegevoegd |

**Niet gewijzigd:** Netlify Functions, SQL-migraties, `logic_tests.js` (alleen uitgevoerd).

---

## 4. Testresultaten

```
node --check (hoofdscript, 543KB)   → SYNTAX OK
node --check (head-script, thema)   → SYNTAX OK
node logic_tests.js                 → 141 geslaagd, 0 mislukt (ongewijzigd t.o.v. Sprint 1)
```

**QA-controles uitgevoerd:**
- Geen nieuwe dubbele HTML-id's geïntroduceerd (expliciet geverifieerd: alle nieuwe Sprint 2-id's zijn uniek).
- Twee **vooraf bestaande** issues gevonden en gedocumenteerd, niet door Sprint 2 veroorzaakt (bevestigd door vergelijking met de ongewijzigde `main`-versie): dubbele `id="nav-train-dot"` (12×, komt van de gedupliceerde bottom-nav-blokken) en een div-tag-onbalans van 1.
- Resterende hardcoded hex-kleuren buiten het tokensysteem geïnventariseerd (`#222`, `#D9D9D9`, `#E8E2DC`, `#9C27B0` e.a.) — dit zijn semantische/grafiekkleuren, bewust buiten de branding-scope gelaten (zie §2.6).

**Niet uitgevoerd (vereist een browseromgeving/device, niet beschikbaar in deze sessie):**
- Visuele/interactieve test van onboarding-wizard, thema-wissel, switches
- Responsive-, Android-, tablet-, desktop- en PWA-installatietest
- Geautomatiseerde accessibility-scan (axe-core) of screenreader-doorloop
- Live offline/online-wisseltest

Deze staan expliciet in §5/§6 in plaats van als "getest" te worden gerapporteerd.

---

## 5. Openstaande risico's

| Risico | Toelichting |
|---|---|
| Geen visuele verificatie | Alle nieuwe schermen zijn gebouwd en logisch/syntactisch gevalideerd, maar nooit gerenderd gezien. Kleine layout-issues (bijv. de verkleinde dashboard-titel "Trainingskompas" naast het kompas-icoon) zijn niet uit te sluiten zonder een echte device-test. |
| Onboarding is nieuw gedrag bij elke login zonder de vlag | Als `startAppAfterAuth()` om een andere reden vaker wordt aangeroepen dan verwacht, zou de onboarding onbedoeld opnieuw kunnen verschijnen. Logica is eenvoudig (één vlag-check) maar niet interactief getest. |
| Thema-flits bij eerste load | De vroege inline theme-script vermindert dit sterk, maar een korte flits van het lichte thema vóórdat het script draait is op zeer trage devices theoretisch niet volledig uit te sluiten. |
| Meldingtoestemming-UX | Browsers tonen hun eigen toestemmingsdialoog; het gedrag na "geblokkeerd" (gebruiker moet naar systeeminstellingen) is functioneel correct maar niet visueel getest. |

## 6. Technische schuld
- Twee vooraf bestaande, niet-Sprint-2-issues (zie §4) — aanbevolen voor een dedicated opruim-sprint, geen actie ondernomen conform "klein en veilig, geen ongevraagde fixes buiten scope".
- Onboarding-gate device-gescoped, niet account-gescoped (DEC-013) — acceptabel voor nu, mogelijk later een Supabase-kolom waard.
- `atleet.doel` is een minimaal placeholder-veld, geen volwaardig doelenbeheer — wacht op het Doelen-scherm (7.1).

## 7. Nieuwe aanbevelingen
1. Voer vóór Sprint 3 een handmatige device-test uit van specifiek: onboarding end-to-end, thema-wissel (light/dark/auto), en de dashboard-headertitel op een klein scherm (bijv. iPhone SE-breedte).
2. Plan een axe-core-scan als eerste stap van een toekomstige accessibility-sprint — nu er vijf nieuwe schermen zijn bijgekomen, is de dekking het waard om geautomatiseerd te bevestigen in plaats van alleen structureel (aria/roles) aangenomen.
3. Overweeg de twee vooraf bestaande Repository-Health-Check-bevindingen (dubbele id's, div-onbalans) op te pakken zodra er toch aan `index.html`-structuur gewerkt wordt.

---

## 8. Bijgewerkte scores

| Score | Sprint 1-uitgangswaarde | Na Sprint 2 | Toelichting |
|---|---|---|---|
| **Productscore** | 61% | **68%** | 5 van de 12 ontbrekende H6-schermen nu gebouwd (Instellingen, Meldingen, Privacy, Help, Onboarding) — het grootste deel van de Sprint 0.5-geïdentificeerde schermdekkingsgat is gesloten |
| **UX-score** | 50% | **58%** | Onboarding en Instellingen waren de twee hoogst geprioriteerde UX-verbeteringen uit Sprint 0.5 §10 — nu aanwezig; nog niet visueel bevestigd, vandaar geen grotere sprong |
| **Accessibility-score** | 38% | **45%** | Switch/radiogroup-rollen correct toegepast op nieuwe schermen; geen geautomatiseerde WCAG-scan uitgevoerd (zie §4) — vandaar een gematigde, geen grote stijging |
| **Release-score** | 26% | **34%** | Privacy-scherm bestaat nu (met eerlijk gemarkeerde placeholder i.p.v. 0%); branding app-breed toegepast; nog steeds geen juridische privacytekst, geen Data Safety-formulier |
| **Play Store Readiness** | 19% | **27%** | Privacy-categorie (Sprint 0.5 §12) gaat van 0% naar gedeeltelijk (structuur aanwezig, tekst placeholder); Store Assets/Data Safety/Permissions blijven op 0% |

**Methodenotitie (ongewijzigd):** gestructureerde inschattingen op basis van geverifieerde codedekking, geen gemeten testresultaten. Waar iets niet met zekerheid is vastgesteld, staat dat expliciet vermeld (zie §4, §5).

## 9. Advies voor Sprint 3
Gegeven dat Instellingen/Onboarding/Branding nu staan: een logische volgende stap is **niet** meteen nieuwe functionaliteit, maar (a) de device-test uit §7.1 uitvoeren zodat Sprint 2 als functioneel bevestigd kan gelden, en (b) de axe-core-scan. Pas daarna is het Doelen-scherm (7.1) de meest voor de hand liggende volgende feature, omdat onboarding er nu al naar verwijst ("een volledig Doelen-scherm... volgt in een latere sprint") en `atleet.doel` al klaarstaat als startpunt.

---

**Status:** klaar voor beoordeling door de Product Owner. Wordt hierna naar GitHub gesynchroniseerd conform de vastgestelde Git Flow-werkwijze.
