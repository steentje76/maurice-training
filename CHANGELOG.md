# Trainingskompas — Changelog

## v3.3.34 — 2 augustus 2026 (Hotfix — modals te breed op desktop)

### Opgelost
- **Alle modals (~50 stuks) app-breed** — `.modal-bg`/`.modal` misten een breedtebegrenzing, waardoor modals op brede (desktop-)vensters de volle breedte van het scherm besloegen i.p.v. de 430px app-kolom. Live gemeld door de Product Owner tijdens een testsessie. Geen echte-telefoon-impact (viewport daar altijd <430px) — puur een desktop-testartefact, nu voor iedereen consistent opgelost (DEC-022).

### Gewijzigd
- `APP_VER` → v3.3.34, `CACHE_NAME` → maurice-training-v3334.

---

## v3.3.33 — 2 augustus 2026 (Hotfix — goals user_id ontbrak)

### Opgelost
- **`saveNewGoal()` stuurde geen `user_id` mee** — de RLS-policy op `goals` blokkeerde daardoor elke insert (42501 "new row violates row-level security policy"). Live gevonden via een end-to-end test in de browser (na migratie v337).
- **Live bevestigd correct na de fix:** testdoel aangemaakt (PR-doel op Hexabar Deadlift), opgeslagen, correct weergegeven (240/300 kg, 80%), daarna zelf weer gearchiveerd. Doelen-module is hiermee voor het eerst end-to-end bevestigd werkend, niet langer alleen code-gevalideerd.
- **Mobiele `100vh`-hotfix (v3.3.29) bevestigd** door Product Owner op een echt toestel.

### Gewijzigd
- `APP_VER` → v3.3.33, `CACHE_NAME` → maurice-training-v3333.

---

## v3.3.32 — 2 augustus 2026 (Hotfix — zichtbare HTML-commentaartekst)

### Opgelost
- **Live gemeld door Product Owner (telefoonscreenshots):** een stuk HTML-commentaar werd zichtbaar als gewone tekst onderaan het Instellingen-scherm, onder de bottom-navigatie. Oorzaak: bij het invoegen van het Doelen-scherm in Sprint 3 werd een bestaand commentaarblok per ongeluk doormidden geknipt — de laatste 3 regels ervan (incl. sluitende `-->`) bleven zonder openende `<!--` staan. Hersteld; comment-balans in het hele bestand geverifieerd (52/52).

### Gewijzigd
- `APP_VER` → v3.3.32, `CACHE_NAME` → maurice-training-v3332.

---

## v3.3.31 — 2 augustus 2026 (Hotfix — migratie v337 typefout)

### Opgelost
- **Migratie v337 faalde bij eerste uitvoering:** `goals.exercise_id` was aangemaakt als `bigint`, terwijl `exercises.id` in werkelijkheid `text` is — foreign key kon niet worden aangelegd. Gecorrigeerd naar `text`. Bijbehorende JS (`saveNewGoal()`) aangepast: stuurde `exercise_id` voorheen als `Number(...)`, nu als tekst.
- Migratie v337 succesvol uitgevoerd door Product Owner na deze fix.

### Gewijzigd
- `APP_VER` → v3.3.31, `CACHE_NAME` → maurice-training-v3331.

---

## v3.3.30 — 2 augustus 2026 (Sprint 3 — Doelen, Challenges & Persoonlijke Voortgang)

### Toegevoegd
- `migratie_v337.sql`: nieuwe `goals`-tabel (RLS, per gebruiker) — **nog niet uitgevoerd in Supabase**.
- Doelen-scherm (7.1): 9 doeltypes (gewicht/vetpercentage/spiermassa/PR/frequentie/volume/conditie/uithoudingsvermogen/eigen), elk met live berekende voortgang en een SMART-check.
- Persoonlijke Challenges (7.2): 100 trainingen, 30 dagen actief, 100 km roeien, 500 ton volume, 10 PR's — allemaal 100% herleid uit bestaande sessiedata, niets nieuws opgeslagen.
- Dashboard-integratie: compacte doelenkaart met voortgangsbalk.
- Profiel-integratie: nieuw toegangspunt "Doelen & Challenges".
- "Vraag de coach"-knop per doel — hergebruikt de bestaande AI-coach-chatfunctie (`sendMsg()`), geen nieuwe AI.

### Bewust niet toegevoegd
- Gym-/Team-challenges (DEC-018) — vereist cross-user aggregatie-infrastructuur die niet bestaat.
- "Perfecte trainingsweek" (DEC-018) — geen eenduidige bestaande definitie van "perfect".

### Opgelost (tijdens bouwen ontdekt en gecorrigeerd, nooit live geweest)
- Twee dubbele-backslash-escapefouten in stringliterals (`\\'` i.p.v. `\'`) die de syntax-check lieten falen — gecorrigeerd vóór commit.
- Eerste opzet van de "nieuw doel"-modal gebruikte niet-bestaande CSS-klassen/functienamen (`sbInsert` i.p.v. `sbPostQ`, verzonnen modal-structuur i.p.v. het bestaande `.modal-bg`/`.modal`-patroon) — rechtgezet door het bestaande patroon eerst op te zoeken.

### Gewijzigd
- `APP_VER` → v3.3.30, `CACHE_NAME` → maurice-training-v3330.

### Bekende problemen
- **Functioneel nog niet gevalideerd** — migratie v337 moet eerst uitgevoerd worden, daarna volgt een live doorloop van alle doeltypes.

---

## v3.3.29 — 2 augustus 2026 (Hotfix — mobiel 100vh-probleem)

### Opgelost
- **Kritiek, live gemeld door Product Owner (met telefoonscreenshot):** Terug/Volgende-knoppen op het onboarding-scherm vielen buiten het zichtbare gebied op een echt Android-toestel. Oorzaak: `height:100vh` op mobiele browsers rekent met de adresbalk mee, waardoor content onderaan buiten beeld valt. Fix: `height:100dvh` toegevoegd als progressive enhancement op `.scr` en `.pin-screen` (DEC-016).
- Geverifieerd geen regressie op desktop (waar `100dvh` gelijk is aan `100vh`).
- **Nog te bevestigen:** hertest op het echte toestel van de Product Owner.

### Gewijzigd
- `APP_VER` → v3.3.29, `CACHE_NAME` → maurice-training-v3329.

---

## v3.3.28 — 2 augustus 2026 (Sprint 2.5 — Validatie, Polish & Release Readiness)

### Toegevoegd
- `migratie_v336.sql`: `doel`-kolom op `atleet_profiel` (verplicht uit te voeren in Supabase — zie CURRENT_STATE.md).

### Opgelost
- **Kritiek (live gevonden):** onboarding kon de gekozen `doel`-waarde niet naar Supabase syncen — schema miste de kolom. Device-lokaal werkte het al (geen dataverlies), sync faalde stil op de achtergrond.
- **Pre-existing (live gevonden, niet Sprint 2):** `refreshStats()` crashte bij elk bezoek aan het Beheer-scherm, waardoor twee admin-secties (Roeiers, Custom-oefeningen) daar nooit ververst werden. Defensieve null-check toegevoegd.

### Gevalideerd (live, op productie)
- Alle 5 Sprint 2-schermen (Instellingen, Meldingen, Privacy, Help, Onboarding) bevestigd aanwezig en renderend op maurice-art.netlify.app.
- Dark mode visueel bevestigd leesbaar (donkerblauw/petrol-tokens).
- Onboarding privacy-checkbox-gate bevestigd functioneel (Volgende-knop correct disabled tot aanvinken).
- Geen gebroken netwerkverzoeken (fonts, Supabase REST, Netlify Functions — alle 200 OK).
- Dashboard-headertitel "Trainingskompas" bevestigd zonder overloop naast het kompas-icoon.

### Gewijzigd
- `APP_VER` → v3.3.28, `CACHE_NAME` → maurice-training-v3328.

### Bekende problemen / niet gevalideerd
- Geen Lighthouse-score, geen axe-core-scan, geen echte-devicetest (Android/tablet) — zie Sprint2.5_Rapport.md voor de volledige lijst van wat wél/niet kon worden vastgesteld.
- Migratie v336 nog niet uitgevoerd — tot die tijd blijft de onboarding-Supabase-sync falen voor `doel`.

---

## v3.3.27 — 2 augustus 2026 (Sprint 2 — Instellingen, Onboarding & Branding)

### Toegevoegd
- Instellingen-scherm (8.3): thema (light/dark/automatisch), taal (informatief), meldingen-doorverwijzing, geluid/trillingen-switches, privacy-doorverwijzing, offline-status + cache-verversen, app-informatie/debuginfo.
- Meldingen-scherm (8.2): 5 losse voorkeuren (training/herstel/coach/updates/systeem) + browsertoestemming-aanvraag.
- Privacy-scherm (9.6): feitelijke, code-geverifieerde uitleg + expliciet gemarkeerde placeholder voor de juridische privacyverklaring.
- Help-scherm (9.4/9.5/9.7): FAQ, contact (placeholder), over de app, licenties.
- Onboarding: volledige 9-staps wizard (welkom/intro/doel/niveau/sport/meldingen/offline-info/privacy-akkoord/start), verschijnt eenmalig na login.
- Nieuwe CSS-componenten: Switch (`role="switch"`, conform H7) en Segmented Control, hergebruikt over Instellingen/Meldingen/Onboarding.
- Handmatige thema-override (`data-theme`) naast de automatische `prefers-color-scheme`-detectie uit Sprint 1.

### Verbeterd
- Merkidentiteit doorgevoerd: Poppins-font (Barlow Condensed verwijderd, ook uit sw.js-precache), officiële kleuren `#0B1D2A`/`#0E3B4A`/`#00B894`/`#E6EBEF` op alle light-theme-tokens.
- Bestaande rusttimer-trilling respecteert nu de Trillingen-instelling.

### Gewijzigd
- KOMPAS-afkorting op login- en dashboardscherm gecorrigeerd naar "Trainingskompas" (DEC-010).
- `manifest.json`: `background_color`/`theme_color` bijgewerkt naar merkkleuren.
- `APP_VER` → v3.3.27, `CACHE_NAME` → maurice-training-v3327 (sw.js).

### Opgelost
- Geen functionele bugs gevonden tijdens QA; twee vooraf bestaande, niet door Sprint 2 veroorzaakte issues gedocumenteerd (dubbele `nav-train-dot`-id's, klein div-tag-onbalans) — zie CURRENT_STATE.md, Technische schuld.

### Bekende problemen
- Onboarding en thema-wissel nog niet getest op een echt device/browser (geen device beschikbaar tijdens deze sprint).
- Onboarding-gate is device-gescoped, niet account-gescoped (DEC-013).
- Privacy- en Help-schermen bevatten bewust gemarkeerde placeholders — geen verzonnen juridische tekst.
- Geluid-instelling heeft nog geen functioneel effect (geen audio-functionaliteit in de app).

---

## v3.3.26 — 2 augustus 2026 (Sprint 1 — Fundament, Accessibility & Stabilisatie)

### Toegevoegd
- Accessibility-fundament (WCAG 2.2 AA-basis): `role="navigation"` + label op alle bottom-navigaties, `aria-current="page"` op het actieve navigatie-item, `role="heading" aria-level="1"` op alle schermtitels, `role="dialog"`/`aria-modal` + focus-trap op modals, focus-verplaatsing bij schermwissel (`go()`), skip-link, `:focus-visible`-stijl, `.sr-only`-utility, aria-labels op alle icoon-only knoppen (`.ibtn`).
- Motion Framework: CSS-tokens conform Handbook H5/H11-naamgeving (`--motion-fast`, `--motion-standard`, `--motion-success` e.a.) + volledige `prefers-reduced-motion`-ondersteuning.
- Dark Mode-fundament: kleurtokens + automatische detectie via `prefers-color-scheme`, incl. dynamische `theme-color`-meta voor light/dark.

### Verbeterd
- Geen restyle van bestaande light-mode-kleuren — alle bestaande waarden ongewijzigd.

### Gewijzigd
- Label "Instellingen" op het Beheer-scherm (`s-admin`) gecorrigeerd naar "Beheer" — verwarde met het (nog te bouwen) Instellingen-scherm (H6, 8.3).
- `APP_VER` → v3.3.26, `CACHE_NAME` → maurice-training-v3326 (sw.js).

### Opgelost
- Geen functionele bugs gevonden tijdens de offline-/performance-/QA-controle van Sprint 1 (sw.js network-first: correct bevestigd; geen memory-leak-patronen; geen dode/dubbele functies aangetroffen).

### Bekende problemen
- Instellingen-scherm (8.3) blijft functioneel smal (alleen rusttimer-instelling) — geen Sprint 1-scope, gepland voor een volgende sprint.
- Accessibility-fundament is toegepast op herbruikbare componenten en kernnavigatie; een scherm-voor-scherm WCAG-doorloop (met name complexere formulieren/heatmaps) is nog niet uitgevoerd.
- Dark mode is alleen tokenmatig aanwezig — visuele restyle volgt in een aparte, expliciet gescopede sprint.

---

## v3.3.25 en eerder
Zie DECISION_LOG.md (DEC-001 t/m DEC-010) en CURRENT_STATE.md voor de volledige geschiedenis vóór dit CHANGELOG-bestand is gestart.
