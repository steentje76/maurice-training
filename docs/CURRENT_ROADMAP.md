# CURRENT_ROADMAP.md — actuele roadmap Trainingskompas

**Vastgesteld** 19 augustus 2026 · **Versie** v4.48.0 (RC0)
**Bijgewerkt** 26 augustus 2026 — POST-V1-status ververst (punten 1/2/3/5/6 deels
afgerond, punt 8 afgerond). Zie de bijgewerkte regels hieronder voor exacte PR's/
main-SHA's; de rest van dit document is ongewijzigd.

> Dit document is vanaf nu de **enige actuele roadmap**. De oudere versies
> (`docs/12_Roadmap/Roadmap.md`, de roadmapdelen in `CURRENT_STATE.md` en in de
> sprintrapporten) blijven bestaan als historisch archief en worden **niet herschreven** —
> ze beschrijven correct wat er op hún moment gold. Waar zij afwijken van dit document,
> geldt dit document.

---

## Waarom deze herziening

De eerdere roadmaps spraken elkaar tegen over wat "af" was. Dat kwam doordat ze op
verschillende momenten zijn geschreven en elk hun eigen faseindeling gebruikten. De
werkelijke stand is opnieuw vastgesteld uit de code, de productiedatabase en de testsuite,
niet uit die documenten. Waar een oud document iets "afgerond" noemde dat de audit niet kon
bevestigen, staat dat hieronder expliciet.

---

## PHASE 0 — FOUNDATION 🟢 afgerond

Applicatiefundament, single-file-architectuur met `core/*.js`-modules, service worker,
PWA-manifest, Netlify-hosting, Supabase-schema.

## PHASE 1 — DATA / CONTENT 🟢 afgerond

Oefeningencatalogus (302 kB), oefening-intelligentie (8,3 MB), 206 techniekvideo's,
apparatuurcatalogus, spiergroepmodel, hersteltijden per spiergroep.

**Correctie op de oude roadmap:** de video's werden tot RC0 integraal in het Android-artefact
meegebundeld (437 MB). Dat is nooit opgemerkt omdat er nooit een release-build is gemaakt.
Ze worden nu on-demand opgehaald en gecachet — hetzelfde gedrag als op het web.

## PHASE 2 — SECURITY / MULTI USER 🟢 afgerond (v4.47.0, bevroren 19-08-2026)

Supabase Auth, RLS op alle 65 tabellen, per-user scheiding, offline sync-wachtrij,
gym-breed leespad met het 3-laags zichtbaarheidsmodel, levenscyclus van
`training_instances`, security hardening v447.

**Correctie op de oude roadmap:** "per-user scheiding" was op cachesleutels getest, maar
tien geschreven `localStorage`-sleutels ontbraken in die lijst — waaronder de vlag die
bepaalt of de intake wordt getoond. Een tweede sporter op één toestel sloeg daardoor zijn
hele profielopbouw over. Opgelost in RC0; er is nu een testcontrole die elke nieuwe sleutel
dwingt te classificeren.

## PHASE 3 — UNIFIED EXPERIENCE 🟢 afgerond (v4.41.0 – v4.46.0)

Relationship Discovery Engine (`relationship.v1`), Verbanden-experience, Unified Athlete
Intelligence (`athlete.v1`, `load.v1`, `performance_index.v1`), Coach Intelligence
(`coach_intelligence.v1`), bewijsspoor per set (`evidence_snapshot.v1`).

**Correctie op de oude roadmap:** het bewijsspoor stond als afgerond, maar werd alleen
geschréven — er was nul zichtbaarheid in de interface. Opgelost in RC0.

## RC0 — RELEASE CANDIDATE 🟢 dit document (v4.48.0)

Vijf P0's en elf P1's opgelost; Android-configuratie releasegereed; privacyverklaring,
accountverwijdering compleet, bewijsspoor zichtbaar, terug-navigatie, sessieherstel.
Volledige verantwoording in `docs/RELEASE_READINESS.md`.

**Openstaand voor RC-afronding:** één lokale verificatiebuild van de API 36-configuratie.

## V1.0 — PLAY STORE 🔵 wacht op de eigenaar

| Stap | Wie |
|---|---|
| Verificatiebuild + `bundleRelease` | Eigenaar, lokaal (SDK vereist) |
| Upload-keystore aanmaken en veiligstellen | Eigenaar |
| Play Console-account en app aanmelden | Eigenaar |
| Screenshots en feature graphic | Eigenaar (draaiende app nodig) |
| Supportadres invullen (`SUPPORT_EMAIL` + Console) | Eigenaar |
| Datavragenlijst en content rating | Eigenaar, voorbereid in `PLAY_STORE_READINESS.md` |
| `auth_leaked_password_protection` aanzetten | Eigenaar, één schakelaar in Supabase |
| Juridische toets van de privacyverklaring | Eigenaar |

## POST V1 — COACH / DATA / INTEGRATIONS ⚪

Op volgorde van opbrengst per eenheid werk:

1. **`duration_s` per sessie vastleggen.** 🟡 raw data vastgelegd (PR #37, main
   `d777b4a`) — de bestaande live-klok (`trainStart`/`pausedAccumMs`) wordt nu bij elke
   sessieafronding weggeschreven naar de al bestaande `sessions.duration_s`-kolom.
   **Nog niet gedaan:** de registry-vlag (`core/relationship.js`, variabele `duur`,
   `beschikbaarheid:'toekomstig'`) en `athlete.unifiedLoad()`'s eigen gate blijven
   bewust op hun huidige stand. Activeren zonder echte, gevulde productiedata om de
   nieuwe relaties tegen te verifiëren zou ongeverifieerde uitkomsten opleveren.
   Stand 26-08-2026: 116 sessies totaal, 0 met een gevulde `duration_s` (de fix is
   te recent gemerged; nog geen enkele training sindsdien afgerond).
2. **Rustduur per set vastleggen** in `sets_detail`. 🟡 raw data vastgelegd (PR #38,
   main `1dc1e13`) — zelfde patroon en dezelfde reden om de registry-vlag (`rust`)
   nog niet te activeren.
3. **Weer per sessie vastleggen** — ontsluit temperatuur, luchtvochtigheid en wind.
   🟡 raw data vastgelegd (PR #39, main `516f93a`) — hergebruikt de bestaande
   weerinfrastructuur volledig. Zelfde reden om de drie registry-vlagen
   (temperatuur/luchtvochtigheid/wind) nog niet te activeren.
4. **Cardio-split als relatiebron** — wacht op een productbesluit over de machine-sleutel:
   een split per 500 m is pas vergelijkbaar binnen hetzelfde apparaat.
5. **Prestatiepunten uit de Supabase-adviseur** — 82 × `auth_rls_initplan`, 43 ontbrekende
   FK-indexen. 🟡 deel 1 afgerond (PR #40, main `83db456`): alle 43 (feitelijk 44)
   ontbrekende FK-indexen aangemaakt, puur additief. **Deel 2 (RLS-herschrijving)
   bewust aangehouden:** raakt toegangscontrole op vrijwel elke tabel; bij het huidige
   datavolume (enkele honderden rijen) geen meetbare winst tegenover een reëel risico
   zonder de eigenaar direct beschikbaar voor verificatie. Zinvol vanaf enkele
   duizenden sessies, zoals hieronder al stond.
6. **Accessibility-sprint** — zoomen weer toestaan, contrast en tekstgroottes doorlopen.
   🟡 deel 1 afgerond (PR #41, main `bab9ead`): pinch-zoom terug toegestaan
   (`user-scalable=no`/`maximum-scale=1` verwijderd uit de viewport-meta, geen
   gedocumenteerde reden gevonden voor de eerdere restrictie). **Deel 2 (contrast/
   tekstgroottes) vereist een echte, visuele browsercontrole** — honderden losse,
   vaste px-font-sizes door de hele app; niet blind/zonder visuele verificatie
   uit te voeren.
7. **Menstruatiecyclus-tracking** als volwaardige UI. 🟢 MVP afgerond (PR #44, main
   `f92ebfb`) — dedicated `cycle_periods`-tabel, `core/cycle.js` (cyclusdag/geschatte
   fase/geschatte volgende menstruatie), nieuw subscherm Lichaam → Cyclus. Hergebruikt
   bewust de al bestaande, protected `CalcCore.cyclusDagFactor()`-vocabulaire. **Audit +
   PMS/symptoomregistratie afgerond** (PR #45, main `32f4f65`): overlap-preventie
   gerepareerd (server-side controle ontbrak), `cycle_symptom_logs`-tabel toegevoegd
   (neutrale patroondetectie, drempel ≥3 cycli, geen causale taal), privacygat in de
   accountverwijderlijst gedicht. Zie `Trainingskompas_Womens_Performance_Blueprint_v1.0.md`
   voor het volledige featurekader.
   **DECISION REQUIRED (niet gebouwd, expliciete productbeslissingen nodig — zie
   `docs/Womens_Performance/`):** zwangerschapscontext, postpartum/return-to-training,
   perimenopauze/menopauze-terminologie, anticonceptie-als-context. Elk document bevat
   opties A/B/C met aanbeveling; geen van deze vier is autonoom gebouwd, conform het
   blueprint (sectie 27).
   **Nog niet gedaan (lagere prioriteit, niet geblokkeerd):** cyclus↔training-correlatie
   (blueprint sectie 9), Women's Performance-dashboard (sectie 10).
8. **HYROX race-splits en triathlon-brick.** 🟢 afgerond (PR #31/#33/#34/#35/PR #36
   architectuuraudit) — dedicated `race_segments`-tabel met expliciete `race_type`,
   Context Engine-koppeling. Zie `migratie_v490.sql`/`migratie_v491.sql`.
9. **Extra wearable-providers** (Apple HealthKit, Health Connect, Garmin, Whoop, Oura) —
   Google Health/Fitbit-integratie bestaat al volledig (provider-onafhankelijk
   databaseontwerp, OAuth-flow, sync, normalisatie met provenance — bevestigd getest,
   79/79 + 43/43). Garmin: Developer Program momenteel volledig opgeschort (geen
   registratie mogelijk). Oura/WHOOP: technisch haalbaar (standaard OAuth2), vereist
   een nieuwe developer-app-registratie door Maurice. Apple HealthKit/Health Connect:
   uitsluitend native, on-device SDK's (geen cloud-API) — vereist aparte native
   ontwikkeling, geen credential-blokkade maar een architecturaal andere opgave.
   Niet autonoom verder uitvoerbaar zonder een van deze externe stappen.

## FUTURE — COMMERCIAL / SOCIAL / WHITE LABEL ⚪

Gym- en teamchallenges (vereist cross-user aggregatie), abonnementen en credits (de tabellen
`plans`, `plan_features`, `credit_packs`, `discounts` en `user_credit_purchases` staan al
leeg in het schema), white-label, uitgebreid beheer, coachrelaties tussen accounts.

Niet aan beginnen zolang V1 niet bij echte gebruikers draait.

---

## Wat expliciet NIET gebeurt

- Geen nieuwe correlaties toevoegen omdat ze berekenbaar zijn. Zie
  `docs/RELATIONSHIP_AUDIT.md` §8 voor de negen voorwaarden die de engine zelf afdwingt.
- Geen AI-bevoegdheden uitbreiden. De AI interpreteert; hij rekent niet.
- Geen grote refactor zonder releasewaarde.
