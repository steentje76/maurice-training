# CURRENT_ROADMAP.md — actuele roadmap Trainingskompas

**Vastgesteld** 19 augustus 2026 · **Bijgewerkt** 19 augustus 2026 · **Versie** v4.50.0

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

## v4.49.0 — MASTERSPRINT 🟢 afgerond

Autonome roadmap-executie vanaf RC0. Twaalf P0's en veertien P1's opgelost, waaronder:
bewijsspoor dat bij een correctie werd gewist, een AI die een onmogelijk voorschrift kon
wegschrijven, een offline-wachtrij zonder eigenaar, elke mislukte token-refresh die uitlogde,
alle Netlify-functies stuk in de Android-app, opgeslagen XSS via oefeningsnamen en een
AI-toestemming die in vijf van de zes aanroepen werd overgeslagen. Nieuwe contracten:
`srpe.v1`, `session_volume.v1`, `evidence_preserve.v1`, `prescription_guard.v1`,
`conflict.v1`. Artefact 14 MB → 5,1 MB.

## v4.50.0 — EERLIJKE APP & CLOSED LOOP 🟢 afgerond

| Punt | Uitkomst |
|---|---|
| A1 quotum op de AI-coach | 🟢 server-side, atomair, fail-open bij infrastructuurfouten. Vereist `migratie_v450.sql`. |
| A2 gepauzeerde training hervatten | 🟢 hervat-kaart op Home |
| B1 eerlijke datastatus | 🟢 zes onderscheiden uitkomsten in plaats van één lege lijst |
| B2 coachinglus | 🟢 `coaching_loop.v1`, zonder migratie; restontwerp in `docs/ONTWERP-COACHINGLUS.md` |
| C3 `migratie_v447.sql` | ⚪ niet verifieerbaar zonder databaseverbinding |
| C4 accountopruiming | 🟢 één gedeelde routine + toegangscontrole op de dagelijkse taak |

Verantwoording: `docs/MASTERSPRINT-STATUS.md`.

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

1. ~~**`duration_s` per sessie vastleggen.**~~ 🟢 **afgerond in v4.49.0.** De rekenregel
   `srpe.v1` (Foster session-RPE) is gebouwd en de kolom `sessions.duration_s` is door de
   eigenaar in de productiedatabase aangebracht. `athlete.unifiedLoad` levert nu een
   AU-reeks zodra elke dag in het venster volledig meetbaar is.
2. **Rustduur per set vastleggen** in `sets_detail`.
3. **Weer per sessie vastleggen** — ontsluit temperatuur, luchtvochtigheid en wind.
4. **Cardio-split als relatiebron** — wacht op een productbesluit over de machine-sleutel:
   een split per 500 m is pas vergelijkbaar binnen hetzelfde apparaat.
5. **Prestatiepunten uit de Supabase-adviseur** — 82 × `auth_rls_initplan`, 43 ontbrekende
   FK-indexen. Zinvol vanaf enkele duizenden sessies.
6. **Accessibility-sprint** — zoomen weer toestaan, contrast en tekstgroottes doorlopen.
7. **Menstruatiecyclus-tracking** als volwaardige UI.
8. **HYROX race-splits en triathlon-brick.**
9. **Extra wearable-providers** (Apple HealthKit, Health Connect, Garmin, Whoop, Oura) —
   geblokkeerd op een geregistreerde OAuth-app per provider; niet autonoom uitvoerbaar.

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
