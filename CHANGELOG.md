# Trainingskompas — Changelog

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
