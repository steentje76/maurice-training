# Sprint 3 — Doelen, Challenges & Persoonlijke Voortgang
**TrainingKompas · v3.3.29 → v3.3.30 · 2 augustus 2026**
**Karakter:** eerste complete Premium gebruikersmodule. Code afgerond en gevalideerd (syntax + testsuite); **live functionele validatie staat nog open** omdat de bijbehorende migratie nog niet is uitgevoerd.

---

## 1. Executive Summary

Sprint 3 bouwt Doelen (7.1) en Challenges (7.2) volledig op bestaande data — er is precies één nieuwe tabel nodig (`goals`, en die bevat uitsluitend het doel zelf, geen gekopieerde meetdata). Van de zes Challenge-voorbeelden uit de sprintopdracht zijn er vijf gebouwd; twee (Gym-/Team-challenges, "Perfecte trainingsweek") zijn expliciet **niet** gebouwd omdat ze niet met bestaande data/architectuur te onderbouwen waren — conform de instructie "niet verzinnen" is dat als besluit gedocumenteerd (DEC-018) in plaats van stilzwijgend een aanname te maken.

Tijdens het bouwen zijn twee eigen fouten ontdekt en gecorrigeerd vóórdat er iets gecommit werd: een verkeerd geraden modal-structuur en twee escape-fouten in stringliteralen. Dit wordt hieronder transparant gemeld, niet verzwegen.

---

## 2. Nieuwe functionaliteit

### 2.1 Doelen (7.1)
9 doeltypes, elk met live berekende actuele waarde (nooit gedupliceerd opgeslagen):

| Type | Bron van de actuele waarde |
|---|---|
| Gewicht | `weight_log` (bestaand) |
| Vetpercentage / Spiermassa | `body_comp` (bestaand) |
| PR-doel | `exercises.pr` / `exercises.peak_goal` (bestond al, nu pas gekoppeld aan een doelenoverzicht) |
| Trainingsfrequentie | `sessions` (afgelopen 7 dagen, geteld) |
| Trainingsvolume | `sessions` (sets×reps×gewicht, sinds startdatum doel) |
| Conditie / Uithoudingsvermogen | `sessions.distance` (sinds startdatum doel) |
| Eigen doel | Handmatig bijgehouden (geen automatische bron — inherent, want per definitie niet elders te vinden) |

Elk doel toont een voortgangsbalk, een SMART-badge (Specifiek/Meetbaar/Tijdgebonden automatisch getoetst; Acceptabel/Realistisch bewust altijd "waar" omdat dit subjectief is en geen harde drempel verzonnen is), en een "Vraag de coach"-knop.

### 2.2 Challenges (7.2) — uitsluitend persoonlijk
| Challenge | Berekening |
|---|---|
| 100 trainingen | `count(sessions)` |
| 30 dagen actief | `count(distinct sessions.date)` laatste 30 dagen |
| 100 km roeien | `sum(sessions.distance)` waar oefeningnaam "roei" bevat |
| 500 ton volume | `sum(sets×reps×gewicht)` alle sessies |
| 10 PR's | Chronologische doorloop per oefening, telt elk nieuw-record-moment — volledig herleid uit bestaande sessiedata, geen aparte PR-log nodig |

**Niet gebouwd (DEC-018):** Gym-/Team-challenges (cross-user aggregatie ontbreekt), "Perfecte trainingsweek" (geen bestaande definitie van "perfect").

### 2.3 Integratie
- **Dashboard:** compacte kaart met het meest recente actieve doel + voortgangsbalk (geen kaart als er geen doelen zijn).
- **Profiel:** nieuw toegangspunt "Doelen & Challenges", analoog aan het bestaande Instellingen-toegangspunt.
- **AI Coach:** "Vraag de coach"-knop per doel bouwt een contextrijk bericht (huidige/streefwaarde, einddatum, motivatie) en stuurt dit via de al bestaande `sendMsg()`-functie — exact hetzelfde patroon als het bestaande `askCoachProfiel()`. Geen nieuwe AI-functionaliteit gebouwd.
- **Statistieken:** PR-doelen hergebruiken dezelfde 1RM-schattingslogica als het bestaande Statistieken-scherm (`refreshStats()`) — geen dubbele berekening.

---

## 3. Gewijzigde/nieuwe bestanden
| Bestand | Wijziging |
|---|---|
| `index.html` | Nieuw scherm `s-doelen`, modal `m-goal-add`, ~230 regels datalaag/rendering-JS, 2 nieuwe toegangspunten, Dashboard-integratie |
| `migratie_v337.sql` | **Nieuw** — `goals`-tabel + RLS-policies, nog niet uitgevoerd |
| `docs/00_Project_Management/CURRENT_STATE.md` | Bijgewerkt (incl. v3.3.29-hotfix die er nog niet in stond) |
| `docs/00_Project_Management/DECISION_LOG.md` | DEC-017, DEC-018 |
| `docs/12_Roadmap/Roadmap.md` | Doelen/Challenges afgevinkt; niet-gebouwde onderdelen expliciet vermeld |
| `CHANGELOG.md` | v3.3.30-sectie |

---

## 4. UX Review
- Doelen-kaarten en Challenge-kaarten hergebruiken uitsluitend bestaande componenten (`.card`, `.prog-wrap`/`.prog-fill` uit Statistieken, `.btn`/`.ibtn`) — geen nieuwe visuele taal.
- Empty state aanwezig ("Nog geen doelen" met duidelijke call-to-action).
- Loading-state aanwezig ("Doelen laden..." / "Challenges berekenen...").
- Success-state: Challenges tonen een groene "✓ BEHAALD"-badge zodra het doel bereikt is.
- **Niet gevalideerd:** het daadwerkelijke gevoel/de flow bij het doorlopen van de add-goal-modal op een echt scherm — vereist live testen (zie §9).

## 5. Accessibility Review
- Nieuwe schermtitel krijgt automatisch `role="heading" aria-level="1"` via het bestaande Sprint 1-mechanisme (`.hdr-title`-klasse).
- Modal hergebruikt de centrale `openModal()`/`closeModal()`-functies uit Sprint 1 — krijgt dus automatisch `role="dialog"`, focus-trap, en Escape-afsluiting, zonder dat daar in Sprint 3 iets voor hoefde te worden herbouwd.
- Nieuwe knoppen hebben `aria-label` waar de tekst niet vanzelfsprekend is (bijv. "Doel verwijderen").
- **Consistente, niet-nieuwe beperking:** formuliervelden (`<select>`/`<input>` in de add-goal-modal) gebruiken hetzelfde `.irow`/`.ilbl`-patroon als de rest van de app, dat **geen** programmatische `for`/`id`-koppeling tussen label en veld heeft. Dit is een al bestaande, app-brede beperking (niet nieuw in Sprint 3) — apart op te pakken in een toekomstige accessibility-sprint, niet hier ad hoc inconsistent gefixt.

## 6. Testresultaten
```
node --check (hoofdscript, 559KB)   → SYNTAX OK (na 2 gevonden en gecorrigeerde escapefouten)
node logic_tests.js                 → 141 geslaagd, 0 mislukt
```
Duplicate-id-check: 1 vals-positieve treffer (`goal-doelwaarde` komt tweemaal voor in de broncode, maar in twee wederzijds uitsluitende conditionele JS-templates — nooit gelijktijdig in de DOM). Geen echte nieuwe dubbele id's.

**Niet uitgevoerd (vereist migratie + live omgeving):**
- Functionele test van alle 9 doeltypes aanmaken/bewerken/verwijderen
- Live weergave van Challenges met echte data
- Responsive/device-test van het nieuwe scherm
- Offline-gedrag van `sbPostQ('goals',...)` (zou moeten queuen, patroon is identiek aan bestaande offline-aware calls, maar niet apart getest)

## 7. Repository Health
Geen nieuwe dubbele bestanden, geen nieuwe ongebruikte functies geïntroduceerd. Twee bestaande, pre-existing issues (dubbele `nav-train-dot`-id's, klein div-onbalans) ongewijzigd — buiten Sprint 3-scope.

## 8. GitHub-activiteiten
Volgt direct na dit rapport: feature branch → commit → merge naar `main` → tag `v3.3.30` → verificatie via Contents API → branch opgeruimd (zelfde Git Flow als voorgaande sprints).

## 9. Openstaande risico's
| Risico | Toelichting |
|---|---|
| **Migratie v337 nog niet uitgevoerd** | Tot die tijd toont het Doelen-scherm alleen de lege staat — geen crash (sbGet faalt stil), maar ook geen functionaliteit. |
| Geen live functionele validatie | Alle bovenstaande logica is code-gevalideerd (syntax, tests), niet interactief getest tegen een echte database. Eerste live test zou moeten volgen zodra migratie v337 is uitgevoerd. |
| PR-telling kan traag worden bij veel sessies | `computePersonalChallenges()` haalt tot 2000 sessies op en verwerkt die client-side — geen probleem bij het huidige datavolume, mogelijk aandachtspunt op zeer lange termijn (jaren aan data). Geen actie nu, wel genoteerd. |

## 10. Technische schuld
- Formulierlabels zonder programmatische `for`/`id`-koppeling — bestaand, app-breed, niet Sprint-3-specifiek (zie §5).
- Geen nieuwe schuld geïntroduceerd door Sprint 3 zelf.

## 11. Nieuwe aanbevelingen
1. **Voer migratie v337 uit**, daarna een korte live-doorloop van elk doeltype (kan in dezelfde sessie als de volgende Sprint-kick-off).
2. Bepaal met de Product Owner een concrete definitie van "perfecte trainingsweek" vóór dit alsnog gebouwd wordt.
3. Overweeg voor een latere sprint een lichte cross-user aggregatie-view (bijv. een Postgres-view met alleen geaggregeerde, niet-persoonlijke cijfers) als basis voor toekomstige Gym-challenges — dat is een kleinere architectuurstap dan volledige cross-user querying vanuit de client.

---

## 12. Bijgewerkte scores

| Score | Sprint 2.5-uitgangswaarde | Na Sprint 3 | Toelichting |
|---|---|---|---|
| **Productscore** | 70% | **74%** | Eerste complete Premium-module toegevoegd; score stijgt gematigd i.p.v. sterk omdat live functionele validatie nog ontbreekt |
| **UX-score** | 62% | **65%** | Nieuwe module volgt bestaande patronen consistent; geen sprong omdat de daadwerkelijke gebruikservaring nog niet live gezien is |
| **AI-score** | 55% (Sprint 0.5) | **57%** | Eén nieuwe, contextrijke coach-integratie (per doel), volledig op de bestaande AI-infrastructuur — kleine, zuivere uitbreiding |
| **Release-score** | 38% | **39%** | Nieuwe functionaliteit voegt geen Store-blokkers toe, maar lost er ook geen op (Privacy/Data Safety blijven dominant) |
| **Play Store Readiness** | 27% | **27%** | Ongewijzigd — deze sprint raakte geen Store-vereisten |

**Methodenotitie:** ongewijzigd t.o.v. eerdere sprints — gestructureerde inschatting op basis van geverifieerde codedekking. De Productscore/UX-score zijn bewust behoudend gehouden omdat "code compleet" hier nadrukkelijk niet hetzelfde is als "live bevestigd werkend".

## 13. Advies voor Sprint 4
Niet meteen doorbouwen op een nieuwe module. Eerst: migratie v337 uitvoeren + live valideren (klein, snel, sluit het enige harde risico van deze sprint). Daarna is, gegeven dat Doelen nu bestaat, het Statistieken-scherm een logische kandidaat om doelen-voortgang dieper te integreren (bijv. een doelen-trendlijn naast de bestaande 1RM-grafieken) — maar dat is een suggestie, geen aanname dat dit de volgende sprintopdracht wordt.

---

**Status:** klaar voor beoordeling door de Product Owner. **Belangrijkste actiepunt: migratie v337 uitvoeren in Supabase**, daarna live testen. Wordt hierna naar GitHub gesynchroniseerd.
