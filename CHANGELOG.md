# Trainingskompas — Changelog

## Sprint 5.7.3–5.7.6 — 7 augustus 2026 (Personalisatie-consistentie, terminologie, validatie) — geen versiebump
*Afronding van Sprint 5.7, Scientific Integrity & Personalisation Engine. 5.7.3-5.7.5 leverden geen codewijziging op (verificatie bevestigde bestaande consistentie); 5.7.6 voegt permanente testdekking toe.*

### 5.7.3 — Personalisatie Fase1→2→3, onderzocht
Kracht (1RM-ratiomotor) bleek al vóór Sprint 5.7 volledig conform (`RATIO_MIN_OBS`, betrouwbaarheid Laag/Middel/Hoog, bron eigen data/algemene richtlijn). HRV/dagfactor (nieuw in 5.7.1) volgt hetzelfde patroon met eigen, domein-passende terminologie. Herstel blijft bewust Fase1-only (5.7.2-besluit). Trainingsadvies erft de fase automatisch via de bestaande datastroom. Geen wijziging nodig.

### 5.7.4 + 5.7.5 — Referentie/persoonlijk/gemeten & transparantie, onderzocht
Cold-start-predictor ("Startschatting: ~X kg"), 1RM-ratiovergelijking (werkelijk vs. verwacht + bron + betrouwbaarheid) en de HRV/herstel-transparantie uit 5.7.1/5.7.2 bleken de belangrijkste cijferweergaven al correct te labelen. Geen medische claims of absolute gezondheidsuitspraken aangetroffen. De compacte "Gereedheid"-tegel in de hero blijft bewust een kaal cijfer (toelichting zit al één tik verderop in "Waarom vandaag?") — dat aanpassen zou de vaste stat-tegel-layout breken (UX-herontwerp, niet toegestaan). Geen wijziging nodig.

### 5.7.6 — Validatiematrix
Nieuw permanent testblok: volledige keten (HRV-baseline → dagfactor → clip) doorlopen voor alle door de sprint gevraagde persona's — nieuwe gebruiker, weinig historie, ervaren gebruiker met volledige baseline, veel trainingsdata (60 metingen), ontbrekende HRV, ontbrekende slaap, ontbrekend lichaamsgewicht, en een gecombineerd scenario dat bevestigt dat de dagfactor in élke combinatie binnen de 0,85–1,05-band blijft en nooit NaN oplevert.

### Getest
`logic_tests.js`: 154/154 (uit 5.7.1/5.7.2) + 8 nieuwe validatiematrix-tests = **162/162 geslaagd**. `index.html` ongewijzigd deze deelstap (9/9 scriptblokken syntax-OK, ter bevestiging opnieuw gecontroleerd).

### Sprint 5.7 — volledig afgerond
| Werkpakket | Resultaat |
|---|---|
| 5.7.1 HRV-baseline | Geïmplementeerd, live (v4.24.0) |
| 5.7.2 Herstelmodel-transparantie | Geïmplementeerd, live (v4.24.1) |
| 5.7.3 Personalisatie-consistentie | Onderzocht, al consistent — geen wijziging |
| 5.7.4 Referentie/persoonlijk/gemeten | Onderzocht, al consistent — geen wijziging |
| 5.7.5 Transparantie | Onderzocht, al gedekt door 5.7.1/5.7.2 |
| 5.7.6 Validatie | 8 nieuwe tests, 162/162 geslaagd |

---

## v4.24.1 — 7 augustus 2026 (Sprint 5.7.2 — Herstelmodel-transparantie, Scientific Integrity & Personalisation Engine)
*Onderdeel van Sprint 5.7. Uitsluitend transparantie/bronvermelding — geen wijziging aan de herstel-rekenlogica zelf, geen UX-herontwerp, geen nieuwe schermen.*

### Bewuste scope-beslissing
De 48/60/72u-basiswaarden en de RPE-multiplier (`MUSCLE_RECOVERY_HOURS`, `rpeMultiplier`) zijn **niet** herschreven. Een echte fysiologische personalisatie van hersteltijden vereist nieuwe, nu niet vastgelegde signalen en een zelfstandig te ontwerpen algoritme — dat hoort niet thuis onder een "waar mogelijk"-instructie zonder expliciet akkoord op de exacte methode. Voorgesteld en uitgevoerd: transparantie over wat het model wél en niet is. Personalisatie van het herstelmodel zelf blijft een aanbeveling voor een latere sprint.

### Wat wél is aangepast
- Lichaam-tab (per-spiergroep-kaarten): vaste, altijd zichtbare bronregel toegevoegd — *"Vuistregel (48–72u, RPE-afhankelijk) — geen gemeten fysiologische waarde"*.
- "Waarom vandaag?"-paneel (beide bestaande render-paden: de klassieke `dagfactor-detail`-uitklap én de nieuwere v43-hero-uitklap) tonen nu dezelfde disclaimer zodra er spierherstel-percentages worden getoond.
- HRV-baseline-transparantie uit Sprint 5.7.1 bleek via `dagfactorUitleg()` al automatisch door te werken naar beide "Waarom vandaag?"-paden — geen aparte wijziging nodig.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 154/154 geslaagd (geen regressie — er is geen rekenlogica gewijzigd, alleen weergavetekst).

### Gewijzigd (versienummers)
- `APP_VER` v4.24.0 → **v4.24.1**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4241`.

---

## v4.24.0 — 7 augustus 2026 (Sprint 5.7.1 — HRV-baseline normaliseren, Scientific Integrity & Personalisation Engine)
*Onderdeel van Sprint 5.7, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0 (KRITIEK #3: "HRV op absolute drempels zonder persoonlijke baseline"). Uitsluitend de HRV-/dagfactor-rekenmotor — geen UX-herontwerp, geen nieuwe schermen, geen databasewijziging, geen AI Coach-uitbreiding.*

### Wetenschappelijke onderbouwing
HRV-classificatie gebruikte vaste absolute ms-drempels (24/18/14 ms), ongeacht wie de gebruiker is. Vervangen door de **Plews/Buchheit "Smallest Worthwhile Change" (SWC)-methode**, gangbaar in de sportwetenschappelijke HRV-literatuur:
- Ln-RMSSD-transformatie voor statistische stabiliteit (Frontiers in Sports & Active Living, 2025, DOI 10.3389/fspor.2025.1578478).
- 7-daags rollend gemiddelde t.o.v. een persoonlijke SWC (gemiddelde ± 0,5×SD), berekend uit de eigen historische HRV-data van de gebruiker.
- Baselineperiode: **<14 dagen = referentiefase** (geen persoonlijke claim mogelijk), **≥14 dagen = voorlopige baseline**, **≥28 dagen = volledige/stabiele baseline** — drie onafhankelijke, convergerende bronnen (PMC9518028; TrainingPeaks/Kiviniemi-cyclistenstudie; athletedata.health 2026).
- Apart ernst-signaal bij **≥15% daling** t.o.v. het eigen rollend gemiddelde (athletedata.health, 2026).
- **Leeftijd is bewust géén aparte correctiefactor**: de literatuur (o.a. PMC11746954, masters- vs. jonge wielrenners) bevestigt dat absolute HRV weliswaar met leeftijd daalt, maar dat een persoonlijke-baseline-methode dit al automatisch opvangt — een aparte leeftijdscorrectie zou dubbel corrigeren. Losstaand van de bestaande `mastersFactor()` (IPF-krachtstandaarden), die een andere wetenschappelijke context betreft en hier niet is hergebruikt/vermengd.

### Gewijzigd
- Nieuwe functies: `hrvBaseline()`, `hrvRollingRecent()`, `hrvStPersonal()`, `hrvDagFactorPersonal()`.
- `dagfactor()` ontvangt nu een HRV-classificatie-object i.p.v. de losse hrv-ms-waarde (kernformule — slaap-/cyclusfactor, clip 0,85–1,05 — ongewijzigd). Alle 6 aanroeplocaties in de app bijgewerkt (bredere historie-fetch i.p.v. de vorige `limit=1`).
- "Waarom vandaag?"-paneel (bestaand, geen nieuw scherm) toont nu expliciet of de HRV-beoordeling in de referentiefase zit, op een voorlopige, of op een volledige eigen baseline berust (Werkpakket 5.7.4/5.7.5 — nooit meer een gemeten claim suggereren zonder genoeg eigen data).
- Kleine RB1-nazorg (buiten Sprint 5.7, onderweg tegengekomen): laatste resterende "Maurice"-verwijzingen in `logic_tests.js` (bestandsheader, twee testlabels) geneutraliseerd — geen testlogica gewijzigd.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: twee verouderde testblokken (absolute HRV-drempels, oude `dagfactor()`-signatuur) volledig herschreven; 11 nieuwe HRV-baseline-tests + 6 herschreven dagfactor-tests, met vooraf numeriek doorgerekende verwachtingswaarden (geen giswerk). **154/154 geslaagd.**
- Getest: referentiefase (n<4 of <14 dagen), voorlopige baseline (≥14 dagen), volledige baseline (≥28 dagen), stabiele HRV, milde daling (binnen SWC-marge), sterke daling (≥15%), volledig lege historie (geen crash).

### Gewijzigd (versienummers)
- `APP_VER` v4.23.3 → **v4.24.0** (minor i.p.v. patch — kernrekenmotor, niet louter een bugfix); `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4240`.

### Resterende aandachtspunten voor Sprint 5.7 (5.7.2 t/m 5.7.6)
Nog niet uitgevoerd: herstelmodel-transparantie (5.7.2 — voorstel: geen algoritmewijziging aan de 48/60/72u-basiswaarden zelf, wel bron-/disclaimertekst, ter bevestiging), personalisatie-consistentie fase1→2→3 buiten HRV (5.7.3), terminologie-consistentie referentie/persoonlijk/gemeten op resterende schermen (5.7.4), bredere transparantie-toelichtingen (5.7.5), volledige validatiematrix (5.7.6).

---

## Sprint 5.6.4 — 7 augustus 2026 (Controle op verborgen ontwikkelaarsdata, Release Blocker 6) — geen versiebump
*Onderdeel van Sprint 5.6, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend onderzoek — geen codewijziging in deze deelstap.*

### Onderzocht (RB6): testaccounts, testdata, debugwaarden, verborgen demo's, feature flags, oude comments
- Geen testaccounts, hardcoded testdata, feature-flags, `TODO`/`FIXME`/`HACK`-markers, hardcoded credentials of `console.log`-statements aangetroffen.
- Twee bevindingen onderzocht en **bewust ongewijzigd gelaten**, met reden:
  1. **Debug-informatie-scherm** (Instellingen → toont app-versie + eerste 60 tekens van de user-agent van het eigen toestel). Audit classificeert dit al als LAAG. Dit is een expliciet gelabeld ("Debuginformatie"), gebruikersgerichte troubleshooting-functie die alléén het eigen toestel van de gebruiker aan zichzelf toont — geen verborgen ontwikkelaarsfunctie, geen data die het toestel verlaat. Niet verwijderd.
  2. **`PIN_HASH`-constante** (app-lock-pincode + admin-scherm-fallback wanneer de rol-check offline/onbekend is). Bij nader onderzoek: dit is **gedocumenteerde, opzettelijke functionaliteit** (zie bestaande comment: "Team gebruikt bewust nog steeds altijd de gedeelde pincode — extra beveiligingslaag boven op de rol-check"), geen verborgen backdoor. De daadwerkelijke Beheer-acties lopen apart via een server-side rolcheck (`/.netlify/functions/gym-team`). **Observatie voor de Product Owner** (geen wijziging uitgevoerd, buiten scope van een opschoon-sprint): dezelfde PIN-hash bedient zowel de persoonlijke app-lock als de Beheer-scherm-fallback; een 4-cijferige pincode-hash is met browser-devtools binnen milliseconden te brute-forcen. Dit is een architectuurkeuze, geen ontwikkelaars-hardcoding — een eventuele aanscherping (bv. losse geheimen, of alléén server-side gate) is een bewuste beveiligingsbeslissing die apart gepland moet worden, niet iets om terloops in een cleanup-sprint aan te passen.

### Conclusie
Geen codewijziging nodig — de codebase bevatte geen onveilig-te-laten verborgen ontwikkelaarsartefacten binnen RB6's scope. Geen `APP_VER`-bump.

---

## v4.23.3 — 7 augustus 2026 (Sprint 5.6.3 — Namespace-migratie & ontwikkelaarscomments, Release Blocker 1+5)
*Onderdeel van Sprint 5.6, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend namespace/comments — geen UX-herontwerp, geen nieuwe functionaliteit, geen databasewijziging.*

### Opgelost — Release Blocker 1: single-user-erfenis in de kern
- Drie ontwikkelaars-specifieke comments geneutraliseerd (technische inhoud behouden, persoonlijke naamsverwijzing verwijderd): `mastersFactor()`-leeftijdscomment, de sport-blueprint-toelichting, en de DEC-032-bug-postmortem.
- Gedownload backupbestand heette `maurice_backup_....json` (zichtbaar voor élke gebruiker in hun eigen downloadmap) → `trainingskompas_backup_....json`.

### Opgelost — Release Blocker 5: localStorage-namespace opgeschoond
- Alle 20 vaste `maurice_*`-localStorage-sleutels + de dynamische `maurice_1rm_<oefening>`-sleutel hernoemd naar de **al bestaande** `tk_*`-conventie (dezelfde die `tk_wb_*`, `tk_gw_*`, `tk_lib_*` en `tk_vt_meta` al gebruiken — geen nieuwe naamgevingsstijl geïntroduceerd).
- **Automatische, eenmalige migratie** toegevoegd als allereerste code in het document (vóór alle overige scripts, incl. de thema-toepassing): elke oude sleutel wordt gelezen, onder de nieuwe naam teruggeschreven, en pas dán verwijderd. Draait precies één keer per device (`tk_ns_migrated`-vlag), faalt stil bij afwezige localStorage (privémodus) i.p.v. te crashen.
- **Bewust buiten scope:** de IndexedDB-databasenaam van de offline-sync-queue (`OFFLINE_DB_NAME`) blijft `maurice_offline`. Een live IndexedDB-rename vereist het asynchroon overzetten van alle records i.p.v. een synchrone key-copy, en raakt in het slechtste geval nog niet-gesynchroniseerde trainingssessies. Dat risico weegt niet op tegen de cosmetische winst — kandidaat voor een aparte, specifiek geteste migratie-sprint.

### Getest
- `node --check` op alle 9 scriptblokken (was 8 — de migratie is een nieuw, vroeg script): OK.
- `logic_tests.js`: 147/147 (uit 5.6.1+5.6.2) + 4 nieuwe tests = **151/151 geslaagd**.
- Losse, uitgebreide migratiesimulatie (19 scenario's, buiten de reguliere suite gedraaid ter extra zekerheid vóór opname): realistisch bestaand profiel (atleetgegevens, 1RM's, thema, onboarding-status, roeier-instellingen, meldingsvoorkeuren) volledig en correct gemigreerd; nieuwe gebruiker zonder oude data blijft schoon; migratie is idempotent (een tweede load overschrijft nooit opnieuw); niet-gerelateerde bestaande `tk_*`-sleutels (andere features) blijven ongemoeid; privémodus/localStorage-uitval crasht niet.
- Expliciet gecontroleerd: **geen enkele resterende `maurice_`-verwijzing** buiten de migratiecode zelf (die de oude namen bewust nog even nodig heeft) en de bewust uitgezonderde `OFFLINE_DB_NAME`.

### Gewijzigd
- `APP_VER` v4.23.2 → **v4.23.3**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4233` / `trainingskompas-static-v4233`.

---

## v4.23.2 — 7 augustus 2026 (Sprint 5.6.2 — Nieuwe-gebruiker-eerlijkheid, Release Blocker 4)
*Onderdeel van Sprint 5.6, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend bestaande tekst-/filterlogica gecorrigeerd — geen UX-herontwerp, geen nieuwe functionaliteit, geen databasewijziging.*

### Opgelost — Release Blocker 4: geen 'volledig hersteld' zonder trainingsdata
- **Bevinding:** een deel van de app (Lichaam-tab, hero-kaart, "Waarom vandaag?") filterde al correct op `hours!==null` (bestaand DEC-027-patroon "geen verzonnen data"), maar twee andere plekken deden dit niet:
  - `buildCoachAdvice()` — de centrale coachtekst-bron achter `window.homeCoachText`, hergebruikt op 9 plekken (Home, trainingdetail, begeleide training, dashboarddetail) — claimde "Je lichaam is klaar voor belasting... volledig hersteld" voor spieren zonder enige lastHit-data (altijd pct:100 bij afwezigheid van sessies).
  - `DASHUI.recovery()` (oudere, nog actieve dashboardmodule) had exact dezelfde omissie.
- **Fix:** beide functies filteren nu ook op `r.hours!==null`, identiek aan het patroon dat elders al bestond. Een gebruiker zonder trainingshistorie krijgt nu de neutrale/generieke coachtekst ("grootste kans op progressie") i.p.v. een specifieke, ongefundeerde "volledig hersteld"-claim per spiergroep.
- **Bewust niet aangepast:** de rauwe percentage-weergave per spier in "Waarom vandaag?" (`renderDagfactorDetail`) en de Lichaam-tab-kaarten tonen al langer losse cijfers (bv. "Borst 100%") zonder headline-claim; dit is een bestaand, consistent patroon door de hele app en valt buiten de scope van deze sprint (geen nieuwe UI/copy per Design Freeze).

### Getest
- `node --check` op alle 8 scriptblokken: OK.
- `logic_tests.js`: 144/144 (uit 5.6.1) + 3 nieuwe tests voor de RB4-guard = **147/147 geslaagd**.
- Test bevestigt expliciet: bestaande gebruikers met echte trainingsdata zien geen gedragsverandering (dezelfde "volledig hersteld"-claim blijft correct werken zodra er wél lastHit-data is).

### Gewijzigd
- `APP_VER` v4.23.1 → **v4.23.2**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4232`.

---

## v4.23.1 — 7 augustus 2026 (Sprint 5.6.1 — Onboarding & Defaults, Release Blocker 2+3)
*Onderdeel van Sprint 5.6 "Scientific & New-User Integrity", n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend data/defaults/onboarding — geen UX-herontwerp, geen nieuwe functionaliteit, geen databasewijziging.*

### Opgelost — Release Blocker 2: single-user-defaults verwijderd
- Default-atleetprofiel gebruikte de ontwikkelaars-eigen waarden (leeftijd 50, geslacht man, lengte 180, gewichtsklasse 120+) als impliciete fallback voor élke nieuwe gebruiker. Nu neutraal (`null`/leeg) totdat de gebruiker dit zelf invult.
- `expected1RM()` (cold-start-predictor) rekende voorheen door met de default-leeftijd als een gebruiker zijn profiel nog niet had ingevuld, wat een misleidende 1RM-schatting opleverde. Geeft nu expliciet `null` terug zonder volledig profiel (leeftijd + lichaamsgewicht).
- Profiel-bewerkmodal en Profiel-/Coach-schermen toonden `50`/`Man`/`180`/"1.00×ˣ Masters factor" als vooraf ingevulde/berekende waarde i.p.v. een lege staat — gecorrigeerd naar "—"/leeg.
- Tweede, eerder gemiste vindplaats: de cross-account cache-resetfunctie (DEC-032) reset het profiel bij accountwissel op een gedeeld toestel nog naar `geslacht:'man'` — nu ook neutraal.

### Opgelost — Release Blocker 3: onboarding verplicht vóór berekening
- Nieuwe verplichte onboardingstap "Jouw gegevens" (leeftijd, lengte, geslacht) toegevoegd vóór de bestaande doel/niveau/sport-stappen. "Volgende" blijft uitgeschakeld tot alle drie ingevuld zijn — zelfde patroon als de bestaande privacy-akkoordstap.
- Alleen van toepassing op **nieuwe** onboardingsessies; de bestaande onboarding-gate (`maurice_onboarding_done`) is ongewijzigd, dus bestaande accounts zien deze stap nooit en ondervinden geen blokkade.

### Backward compatibility
- Geen wijziging aan de `maurice_atleet`-localStorage-structuur of aan Supabase-schema. Bestaande gebruikers hebben altijd al een opgeslagen waarde (eigen invoer of de oude default); de nieuwe `null`-defaults worden uitsluitend gebruikt wanneer er nog géén opgeslagen profiel bestaat (nieuwe accounts/toestellen).

### Getest
- `node --check` op alle 8 scriptblokken: OK, 0 syntaxfouten.
- `logic_tests.js`: 141/141 (bestaand) + 3 nieuwe tests voor de `expected1RM`-guard = **144/144 geslaagd**.
- Code-trace bevestigt: onboarding-gate-logica (`startAppAfterAuth`) niet aangeraakt → geen regressie voor bestaande accounts.

### Gewijzigd
- `APP_VER` v4.23.0 → **v4.23.1**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4231` (app-shell only, `tk-videos-v1` ongewijzigd conform bestaande conventie).

### Bekend openstaand punt
- `CURRENT_STATE.md` en `DECISION_LOG.md` zijn niet gevonden op de verwachte locaties in de repo (root, `docs/`) — dit changelog-bestand zelf liep al ~80 versies achter (laatste entry v3.3.45 vs. huidige v4.23.0). Kan niet bijwerken wat ik niet kan lokaliseren; zie voortgangsrapport voor navraag bij Product Owner.

---

## v3.3.45 — 2 augustus 2026 (Home Dashboard 2.0 — Premium Morning Experience, deel 1)
*Home van "kaarten onder elkaar" naar een coachend dashboard. Geen nieuwe DB/AI/architectuur; uitsluitend bestaande data (DEC-027).*

### Toegevoegd / verbeterd
- **Verrijkte hero "Training van vandaag"**: premium donkere kaart met naam + **aantal oefeningen** + **spiergroepen** (uit `training_exercises` + `exercises.muscle_primary`) als chips, en een grote accent-**▶ Start training**-knop (48px+ tikvlak). Geen verzonnen duur/calorieën.
- **Stat-kaarten**: **Actieve dagen** (laatste 30) en **Weekvolume** met **%-verschil t.o.v. vorige week** — berekend uit bestaande sessies (weight × reps × sets).
- **Quick Actions**-rij (horizontaal scrollbaar): Plate Calculator (verplaatst), Stats, Logboek, Coach, Profiel — consistente lijn-iconen.
- Informatiehiërarchie: groet → dagfactor (herstel) → training van vandaag → week-stats → programma/doel → snelacties → recente sessies.

### Databron-eerlijkheid (DEC-027)
- Recovery blijft de bestaande **dagfactor** (geen verzonnen "recovery %"-score). Geen geschatte trainingsduur/calorieën. Eén betrouwbare waarheid boven een completer ogende kaart.

### Bewust NIET in dit deel (volgt in deel 2)
- Premium recente-sessie-kaarten (duur/rating), aparte "Coach Advies"-kaart met per-oefening progressie-hint, volledige Material 3-/responsive-/a11y-review en de resterende ~30 micro-polish-details. Eerlijk gerapporteerd: dit is deel 1 van Dashboard 2.0.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render (hero + stats + quick actions) 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.45; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3345`.

---

## v3.3.44 — 2 augustus 2026 (Epic 1 — Morning Experience)
*Home wordt het Morning Report. Geen nieuwe DB/AI/architectuur; uitsluitend bestaande data, presentatie-verbetering.*

### Toegevoegd — Home = Morning Report
- **Persoonlijke ochtendtekst** bovenaan Home: tijdgebonden groet ("Goedemorgen, {naam}") + coach-zin afgeleid uit je eigen dagfactor + de training van vandaag. **Regelgebaseerd uit bestaande data** (dagfactor-motor, volgende vaste training, atleetnaam) — geen nieuwe AI/API-call, instant en offline-veilig (DEC-026).
- **Prominente primaire CTA "Training van vandaag: {training}"** met groot tikvlak (min-hoogte 66px) die de volgende vaste training direct start. Hiërarchie herstel-vóór-prestatie: groet → dagfactor → training van vandaag.
- Dagfactor blijft het dominante, tikbare dag-element met explainable uitleg (Waarom/Data/Logica/Confidence, v3.3.37).

### Premium polish
- Laatste Home-emoji vervangen door lijn-iconen: 🎯 (Doel) en 🗓️ (Programma). Home-scroll-spacing afgestemd op het report-ritme.

### Bewust NIET gedaan (conform opdracht + FASE 0)
- Geen nieuwe database, AI-logica of architectuur. De ochtendtekst gebruikt bewust de bestaande explainable rekenmotoren i.p.v. een AI-call op elke Home-load (zou latency/kosten/offline-risico toevoegen). Een live-AI ochtendbericht kan later als opt-in.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render (ochtendtekst + CTA) 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.44; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3344`.

---

## SECURITY HOTFIX — 2 augustus 2026 (cross-account datalek — migratie_v338)
*Databasewijziging (RLS/data). Geen app-codewijziging — geen nieuwe `index.html`/`sw.js` nodig; alleen `migratie_v338.sql` uitvoeren in Supabase.*

### Probleem (kritiek, privacy)
- Een tweede/nieuwe gebruiker zag bij **Stats → "Geschatte 1RM"** de 1RM-waarden en peakdoelen van de oorspronkelijke gebruiker.

### Oorzaak
- `migratie_v333` (regel 45) backfillde alle bestaande, persoonlijke oefeningen naar `scope='global'`. De RLS-SELECT-policy toont elke `scope='global'`-rij aan iedere ingelogde gebruiker, terwijl per-gebruiker-data (`pr`/1RM, `peak_goal`) OP de oefening-rij staat → die waarden lekten naar alle gebruikers.

### Fix (migratie_v338)
- Alle gelekte `global`-oefeningen teruggezet naar `personal` en toegewezen aan de eigenaar (`created_by`). 72 rijen hersteld; eigenaar behoudt alles, andere gebruikers zien niets meer.

### Brede RLS-audit (uitgevoerd)
- RLS staat aan op **alle 37 publieke tabellen**. 10 tabellen met 0 policies = deny-all (veilig; billing/config Fase 5 + server-side OAuth). 15 persoonlijke tabellen correct met `auth.uid()`. `custom_trainings` gebruikt hetzelfde `scope='global'`-patroon maar is leeg → geen lek. `exercises` was het enige actieve lek, nu gedicht. Zie DEC-025.

### Architectuur-advies (aparte vervolgstap)
- Per-gebruiker-prestatiedata (`pr`/`peak_goal`) hoort nooit op deelbare (`global`/`gym`) rijen. Óf oefeningen per gebruiker houden + schone globale starter-catalogus seeden, óf `pr`/`peak_goal` naar een aparte per-gebruiker tabel. Details in `migratie_v338.sql`.

---

## v3.3.43 — 2 augustus 2026 (Wordmark op het login-scherm + laatste ART-restant weg)
*Volledige wordmark (logo + naam + tagline) op het inlogscherm.*

### Verbeterd
- **Login-scherm**: het oude A·R·T CrossFit-logo én de subtitel "AI TRAININGSCOACH 2026" (laatste merkrestant in de app) vervangen door de officiële **wordmark** ("Trainingskompas — Gericht trainen. Slimmer worden. Sterker blijven.") in een verzorgd, afgerond logo-kaartje dat in licht én donker thema werkt.
- Nieuw asset `logo-wordmark.png` (bijgesneden, geoptimaliseerd, 640px) toegevoegd en opgenomen in de offline-precache van de service worker.

### Upload-let op
- Nieuw binair bestand `logo-wordmark.png` → via **Add file ▸ Upload files** (met `index.html` en `sw.js`).

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · login-scherm gerenderd via lokale server (wordmark laadt, 640×521), 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.43; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3343`; `logo-wordmark.png` toegevoegd + in SW-precache.

---

## v3.3.42 — 2 augustus 2026 (Officieel logo ingebouwd)
*Definitief merklogo (kompas + atleet, navy/teal) doorgevoerd; vervangt de tijdelijke SVG-mark.*

### Verbeterd
- **App-iconen** `icon-192.png` en `icon-512.png` vervangen door het officiële logo (icon-only versie), content gecentreerd met veilige marge — geschikt voor zowel gewone als **maskable** weergave (Play Store/startscherm).
- **Home-header** toont nu het echte logo als een verzorgd, afgerond app-icon-tegeltje i.p.v. de tijdelijke bergpad-SVG.

### Upload-let op
- `icon-192.png` en `icon-512.png` zijn **binaire bestanden**: uploaden via GitHub **Add file ▸ Upload files** (niet via het potlood/plakken). Samen met `index.html` (en `sw.js` voor de cache-refresh).
- WCAG-notitie: logo's/merknamen zijn uitgezonderd van de contrasteis — de teal in het logo is geen probleem, ook niet in de Play Store.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · header-logo laadt (192×192) en gerenderd via lokale server · 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.42; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3342`; `icon-192.png` + `icon-512.png` vervangen.

---

## v3.3.41 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 6: Gerichte toegankelijkheid)
*Gerichte a11y-verbeteringen. Let op: dit is géén gecertificeerde WCAG-AA-audit — daarvoor zijn axe-core/Lighthouse en een echte-toestel-screenreadertest nodig, die in deze omgeving niet beschikbaar zijn (zie ook DEC-023).*

### Verbeterd
- **`aria-label`s toegevoegd aan de trainings-invoervelden**: gewicht ("Gewicht in kg"), herhalingen ("Herhalingen") en RPE ("RPE (ervaren zwaarte)"). Screenreaders benoemen deze nu correct i.p.v. een naamloos veld.

### Al op orde (geverifieerd, geen wijziging nodig)
- `<html lang="nl">` aanwezig · zichtbare focus (`:focus-visible`) · skip-link · `.sr-only`-utility · `prefers-reduced-motion` volledig ondersteund. De in Batch 2 toegevoegde componenten (bevestigingsmodal `role="dialog"`/`aria-modal` + Esc/Enter, dagfactor-uitklap met `aria-expanded`/`aria-controls`, icoonknoppen met `aria-label`) zijn toegankelijk gebouwd.

### Bevinding voor besluit (niet eigenhandig gewijzigd)
- **Contrast merkaccent**: `#00B894` op wit haalt **2,54:1** — onder WCAG AA (4,5:1 voor kleine tekst, 3:1 voor grote/bold). Dit raakt de vastgelegde merkkleur (DEC-010) en kleine accent-teksten/knoppen app-breed. Omdat dit een design-system-besluit is, is het **niet** in deze pass gewijzigd. Opties ter overweging: een iets donkerder teal (bv. `#00997a` = 3,6:1) uitsluitend voor tekst-op-wit, of accent-tekst altijd bold ≥ grote-tekst-grootte. Aanbevolen als apart besluit met de Product Owner.

### Aanbevolen vervolg (buiten deze omgeving)
- Draai Lighthouse + axe-core en een VoiceOver/TalkBack-doorloop op een echt toestel voor een volledige AA-bevestiging.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.41; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3341`.

---

## v3.3.40 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 5: Coach-scherm iconografie)
*Iconografie doorgetrokken naar het Coach-scherm.*

### Verbeterd
- **Coach-header**: 🕘 → geschiedenis-lijnicoon, 🗑 → prullenbak-lijnicoon (consistent met nav/Home-header). Verzendknop (`↑`) ongewijzigd — is al een strak teken.
- **Custom-trainingen**: verwijder-🗑 → prullenbak-lijnicoon, met `aria-label`.

### Bewuste scope-correctie (eerlijk)
- Een **volledige** emoji→lijnicoon-sweep over de héle app is groter dan eerder ingeschat (~50 emoji, veel in kaart-headers/labels waar ze deels decoratief/semantisch functioneren). De premium-kritische oppervlakken (bottom-nav, Home-header, werkset-acties, Coach-header) zijn nu gedaan; een uitputtende sweep is een aparte, grotere klus met lagere ROI en is bewust niet in deze pass meegenomen.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render Coach-header bevestigd, 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.40; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3340`.

---

## v3.3.39 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 4: Merkeigen bevestigingsdialogen)
*Geen functionaliteit gewijzigd; alle native `confirm()`-dialogen vervangen door een merkeigen modal (Handbook/UX Constitution: geen native dialogen).*

### Verbeterd
- **Alle 22 native `confirm()`-aanroepen** vervangen door één herbruikbare `confirmModal()` — een verzorgde, gecentreerde merk-modal met titel, boodschap, "Annuleren" en een actieknop. Destructieve acties (verwijderen/loskoppelen/account) krijgen een **rode danger-knop** (`#B3454C`, H5), niet-destructieve (cache verversen, weken genereren, hervatten) de accent-knop. Elke knop heeft nu een **specifiek werkwoord** (Verwijderen/Loskoppelen/Wissen/Pauzeren/Hervatten) i.p.v. het generieke "OK".
- Betreft o.a.: uitloggen, account verwijderen (dubbele bevestiging), sessie pauzeren, set/opwarmset/oefening/programma/doel/training/apparaat verwijderen, wearable loskoppelen, gesprek wissen, cache verversen, training hervatten, weken her-genereren.

### Toegankelijkheid & interactie
- Toetsenbord: **Esc = annuleren, Enter = bevestigen**; focus springt naar de actieknop; klik op de achtergrond annuleert. `role="dialog"`, `aria-modal`. Nette in/uit-animatie via de motion-tokens; opgeruimd na sluiten.

### Technisch
- `confirmModal(message,{title,okLabel,cancelLabel,danger})` retourneert `Promise<boolean>`; boodschappen ge-escapet (XSS-veilig via `escHtml`). Vijf UI-handlers die voorheen synchroon waren (authSignOut, deleteCustomTraining, showSetMenu, showWarmupMenu, confirmLeave) zijn `async` gemaakt — ze worden alleen vanuit onclick aangeroepen, dus geen effect op aanroepers.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless: modal rendert, OK→`true`, Annuleren→`false`, geen achtergebleven modals, 0 code-fouten. `grep` bevestigt: geen native `confirm(` meer in de code.

### Gewijzigd
- `APP_VER` → v3.3.39; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3339`.

---

## v3.3.38 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 3: Werkset-ergonomie)
*Geen functionaliteit verwijderd; de hoogfrequente werkset-rij ergonomischer en premium gemaakt.*

### Verbeterd
- **Grotere, duidelijkere tikvlakken** in de werkset-rij: set-cirkel 38→42px; de rusttimer- en meer-knop krijgen een tikvlak van ≥36×42px (was ~24px) — beter voor de kernactie "set afvinken" en de masters-doelgroep.
- **⏱ en ⋮ emoji → lijn-iconen** (accent-groene klok voor de rusttimer, net drie-punts-menu), consistent met de nieuwe iconografie. Ook de opwarmset-⋮ meegenomen. `aria-label`s toegevoegd.

### Bewust behouden (geen functieverlies)
- Weight-mode-select (vast/+kg/%), RPE-stepper, rusttimer en meer-menu blijven volledig aanwezig. De RPE-stepper (verticaal) en de mode-select (8px, gedempt) waren al compact; een diepere flow-herstructurering (mode in het menu, ghost-values) is bewust níét in deze veilige pass gedaan wegens de sterk gekoppelde element-IDs — kandidaat voor een aparte, apart geverifieerde stap.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless: echte `buildWorkSetRow()` gerenderd (iconen + tikvlakken correct), 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.38; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3338`.

---

## v3.3.37 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 2: Dagfactor-promotie)
*Geen nieuwe functionaliteit; bestaande dagfactor-motor prominenter en uitlegbaar gemaakt (topaanbeveling Product Excellence Rapport §7/§14).*

### Verbeterd
- **Home: dagfactor gepromoveerd tot dominant, tikbaar dag-element.** Voorheen een kleine goud/tekst-regel onderaan de HRV-kaart; nu een kleur-gecodeerde hero-cirkel (accent-groen ≥1.00 · amber 0.93–0.99 · gedempt rood <0.93) met korte samenvatting bovenaan de kaart. Herstel vóór prestatie in de visuele hiërarchie (H3 P2).
- **Tikbare explainability (H8), zonder extra API-call.** "Waarom? →" klapt de onderbouwing uit met vier vaste velden: **Waarom** (leesbare samenvatting), **Data** (gebruikte HRV/RHR/slaap/cyclus), **Logica** (`factor = HRV × slaap[ × cyclus]`, geclipt 0.85–1.05, met de expliciete melding dat het informatief is en nooit automatisch gewicht aanpast), **Confidence** (Hoog/Middel/Laag op basis van aanwezige signalen).
- HRV/RHR/slaap-trio en de HRV-drempelpills blijven behouden als secundaire detaillaag onder de hero.

### Technisch
- `refreshHome()` HRV-kaart herbouwd; nieuwe `toggleDagfactorDetail()` (in/uitklappen, `aria-expanded` bijgewerkt). Hergebruikt de bestaande `dagfactor()`-motor (`{factor,hrvFactor,slaapFactor,cyclusFactor}`) — geen dubbele logica, geen nieuwe berekening.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless: toggle functioneel (uitleg klapt in/uit), 0 code-fouten, hero + uitleg visueel bevestigd.

### Gewijzigd
- `APP_VER` → v3.3.37; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3337`.

---

## v3.3.36 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 1: Iconografie)
*Geen nieuwe functionaliteit. Emoji-iconen vervangen door een consistente lijn-icon-set (H5), op de primaire schermen.*

### Verbeterd
- **Bottom-navigatie**: emoji (🏠🏋️💬👤📈) → consistente 1,8px lijn-iconen (huis, halter, chatbubbel, persoon, trendgrafiek) op een 24px-raster. Actief item kleurt nu ook qua icoon mee in accent-groen (voorheen alleen het label).
- **Home-header**: 📊 → HRV/dagfactor-puls-icoon; ⚙️ → sliders/beheer-icoon.
- **Plate Calculator-knop**: ⚖️ → halter-lijnicoon.

### Technisch
- DRY-aanpak: één `applyNavIcons()` mapt alle `.ni-icon`'s op basis van het label, i.p.v. de 12× gedupliceerde nav-markup handmatig te bewerken. Iconen erven `currentColor` (grijs → accent bij actief) en schalen mee met het thema.
- `.ibtn`/`.ni-icon` SVG-styling toegevoegd; iconen respecteren dark mode.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render 0 code-fouten · 65 nav-iconen correct geplaatst (13 navs × 5), header + plate-calc visueel bevestigd.

### Nog open in Batch 2
- Overige per-scherm-emoji (Coach 🕘/🗑, Stats ↻, admin-acties) → lijn-iconen; werkset ≤2 tikken; Home volledig Morning Report; 19× native `confirm()` → merkmodals; volledige WCAG-AA + performance-pass.

### Gewijzigd
- `APP_VER` → v3.3.36; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3336`.

---

## v3.3.35 — 2 augustus 2026 (Premium Experience Sprint — Batch 1)
*Geen nieuwe functionaliteit. Doel: bestaande functionaliteit naar premium-niveau brengen — hogere kwaliteit, minder frictie, meer emotie, betere uitstraling. Batch 1 = veilige, hoog-zichtbare afwerking; structurele ingrepen volgen in Batch 2 (zie onderaan).*

### Brand cleanup (zichtbaar)
- **ART CrossFit-logo verwijderd** van het Home-scherm en vervangen door een eigen TrainingKompas-merkmark (bergpad-met-vlag-motief in de merkkleuren `#0B1D2A`/`#00B894`/`#E6EBEF`, conform H5). Live geverifieerd via headless render.
- **Home-subtitel** "AI Trainingscoach 2026" → tijdloze merkbelofte "Slimmer trainen, elke dag" (geen verouderend jaartal meer).
- **Stats-subtitel** "1RM & Peakdoel 15 aug 2026" → "1RM & peakdoel" (hardcoded, verouderende datum verwijderd; `id="stats-peak-sub"` toegevoegd voor toekomstige dynamische vulling).
- **Beheer-subtitel** placeholder "v2.8.5" verwijderd (werd al door JS met `APP_VER` overschreven; toonde kort een stale versie).
- **Systeemprompt** ontdaan van hardcoded persoonsnaam ("… van Latum van Steensel"); coach gebruikt nu `atleet.naam` met neutrale fallback "de atleet". Label "Maurice-specifiek" → "gebruiker-specifiek". Default atleet-`naam` niet meer "Maurice".
- **manifest.json** `short_name` "Kompas" → "Trainingskompas" (schond DEC-010: merknaam altijd zichtbaar).
- **sw.js** cachenamen `maurice-training-*` → `trainingskompas-*`; notificatie-fallbacktitel "Training Coach" → "Trainingskompas".

### Premium micro-interacties (H11-tokens nu daadwerkelijk toegepast)
- Zachte **schermtransitie** (`tk-screen-in`, `--motion-navigation`) bij elke navigatie.
- **PR-badge pop** (`tk-pop`, `--motion-success`) — het emotionele kernmoment krijgt nadruk.
- **Set-voltooid pop** op de set-cirkel (`tk-set-done`, `--motion-fast`) bij afvinken.
- **AI Apply-knop** bevestigingsanimatie (`apply-ok`) bij toepassen van een coach-advies.
- Druk-feedback op `.btn`/`.act-btn`/`.ibtn`. Alles neutraliseert onder `prefers-reduced-motion` (bestaande globale regel).

### Premium AI-chat (alleen presentatie, geen prompt-logica gewijzigd)
- **Markdown wordt nu gerenderd** i.p.v. letterlijke `**` te tonen — via een nieuwe veilige `mdInline()` (eerst HTML-escapen tegen XSS, daarna beperkte subset: vet/cursief/code/bullets).
- **AI- vs. gebruikersbubbel** visueel onderscheiden: coach = petrol `#0E3B4A` (AI-content, conform H5), gebruiker = donkerblauw; eigen bubbelvormen.
- Kale spinner → premium **typing-indicator** (drie pulserende puntjes).
- Foutmeldingen "Fout: …" en "Verbindingsfout. Check internet." → verzorgde, herstelgerichte copy. Status "Denkt na..." → "Coach denkt mee…".

### Premium states
- Zichtbare "Laden..."-placeholders in Stats (PR/volume/herstel) en Profiel-wearable → **skeleton-loaders** (`tk-skel`, shimmer).
- Lege spierbelasting-data → verzorgde empty state (`tk-empty`) met richting i.p.v. kale "Geen data".

### Bewuste, veilige afwijking (dataveiligheid — productprioriteit)
- **localStorage-sleutelprefix `maurice_` NIET hernoemd.** 47 sleutels (`maurice_auth_session`, `maurice_atleet`, `maurice_trainings`, `maurice_onboarding_done`, …) zijn opslag-identifiers; blind hernoemen zou alle bestaande gebruikersdata en de login wissen. Alleen zichtbare branding is opgeschoond; een eventuele sleutelmigratie hoort in een aparte, veilige migratiestap (Batch 2). Vastgelegd als beslissing.

### Getest
- `node --check` op alle ingebedde script-blokken: **OK**.
- `node logic_tests.js`: **141/141 geslaagd, 0 mislukt** — geen regressies.
- Headless boot (Playwright/Chromium): **0 code-fouten**; nieuwe Home-header visueel bevestigd.
- *Niet uitvoerbaar in deze omgeving (geen tooling, eerlijk gemeld):* `npm run lint/typecheck/test` (repo heeft geen `package.json`/npm-toolchain); Lighthouse/axe; volledige before/after van datagedreven schermen (vereisen ingelogde live sessie).

### Gewijzigd
- `APP_VER` → v3.3.35; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3335`.

### Openstaand — Batch 2 (structureel, met voorstel/before-after)
- Emoji-navigatie → consistente lijn-icon-set (H5) + de 12× gedupliceerde bottom-nav dedupliceren (12 dubbele element-id's).
- Werkset-rij naar ≤2 interacties (RPE compacter, weight-mode uit de rij, ghost-values, grotere touch-targets).
- Home volledig als Morning Report met de dagfactor als dominant, tikbaar element (waarom/data/logica/confidence).
- 19× native `confirm()` → merkeigen bevestigingsmodals.
- Volledige WCAG-AA-pass (ARIA/focus/keyboard/contrast/touch-targets) en performance-pass.

---

## Sprint 3.1 — 2 augustus 2026 (Live Validatie, Release Closure & Quality Gate)
*Geen eigen versienummer — sluit v3.3.34 af met live validatie, geen codewijzigingen in dit deel.*

### Live bevestigd
- Doelen-module volledig end-to-end getest: Create/Read/Delete voor zowel PR-doel als eigen doel, Challenges tonen correcte live cijfers, 0 console-fouten over de volledige schermdoorloop (Doelen/Instellingen/Meldingen/Privacy/Help/Profiel/Statistieken/Coach/Dashboard).
- Beide vorige hotfixes (v3.3.33 user_id, v3.3.34 modal-breedte) herbevestigd correct.

### Expliciet niet geleverd (geen aannames/geen tooling)
- Lighthouse- en axe-core-scores — geen tool beschikbaar.
- Schaalbaarheidsbenchmarks (100–10.000 sessies) — zou synthetische data in productie of gefabriceerde cijfers vereisen.
- Screenshot-pack in `docs/screenshots/` — browserscreenshots landen lokaal bij de Product Owner, niet in de repo.
- Volledig Database Validatie Rapport — introspectiequeries klaargezet, resultaat nog niet ontvangen.

### Bekend gat
- Doelen-Update (bewerken) ontbreekt — alleen aanmaken/verwijderen is gebouwd.

Zie `docs/Sprintrapporten/Sprint3.1_Rapport.md` voor het volledige verslag.

---

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
