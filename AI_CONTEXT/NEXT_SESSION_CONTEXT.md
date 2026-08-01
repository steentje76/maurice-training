# NEXT_SESSION_CONTEXT — Trainingskompas

> Bijgewerkt aan het eind van de sessie van 1 augustus 2026 (branding-rename + gym-breed
> oefeningen delen + grote bugfix-ronde, v3.3.3 → v3.3.12).

## Project
Trainingskompas (was "Maurice Training Coach") — governance-niveau B (Middenweg).

## Huidige status
App-versie v3.3.12. Vier nieuwe SQL-migraties (v331, v332, v333, v334) gedraaid en
geverifieerd. Grote hoeveelheid bugs gevonden en gefixt, waaronder twee kritieke
security-issues. Niets van de JS-fixes is nog live getest in de app zelf — alleen
logic_tests.js (127/127) en syntax-checks zijn groen.

## Wat er vandaag is gebouwd/gefixt (chronologisch)
1. **Branding-rename**: "Maurice Training Coach" → "Trainingskompas" (manifest, titel,
   splashscreen, header — "KOMPAS" in krappe UI-spots).
2. **Migratie v331**: gym-breed oefeningen delen (coach+ mag toevoegen binnen eigen gym),
   loste ook een RLS-regressie op `exercises` op (insert faalde stil sinds 31 juli).
3. **v3.3.5 — cross-account datalek (privacy)**: persoonlijke localStorage-caches
   (atleetprofiel, custom trainings, PR's) waren niet per gebruiker gescoopt. Fix:
   `resetPersonalCacheIfNewDeviceOwner()` + wipe bij uitloggen.
4. **v3.3.6/v3.3.7 — dubbele saves**: `opslaanProgramma()`, `heergenereerResterendeWeken()`,
   `finishSession()` hadden geen bescherming tegen dubbel tikken → dubbele database-rijen.
   Alle drie gefixt met in-flight guards + knop-disable.
5. **Migratie v332**: `exercise_equipment` (machine-instellingen) — RLS-regressie gefixt,
   ontwerp: persoonlijk per atleet (user_id-scoped), NIET gym-breed gedeeld.
6. **Migratie v333 — 3-laags zichtbaarheidsmodel**: `exercises` en `custom_trainings`
   krijgen `scope` (`personal`/`gym`/`global`) + nieuwe generieke `content_shares`-tabel
   (peer-to-peer delen met specifieke personen). Vervangt v331's gym-only model volledig.
   **UI voor dit model is NIET gebouwd** — alleen schema/RLS staat klaar (zie hieronder).
7. **Accountverwijdering-gaten gedicht**: `exercises` (scope=personal) en `public.users`
   ontbraken in de opruimlijst van `delete-account.js` → zombie-data resp. spookleden in
   Team-lijst na accountverwijdering.
8. **gym-team.js — autorisatiebug**: een manager kon de rol van een owner degraderen
   (alleen de NIEUWE rol werd tegen het eigen niveau gecheckt, nooit de HUIDIGE rol van
   het doelwit). Gefixt.
9. **Migratie v334**: gym-leden tellen pas mee in de Team-ledenlijst na e-mailbevestiging
   (`email_confirmed_at`-spiegelkolom + trigger).
10. **Nieuwe scheduled function** `cleanup-unverified-accounts.js` (draait `@daily` via
    netlify.toml) — verwijdert accounts die na 30 dagen nog niet bevestigd zijn.
11. **v3.3.9 — v333-regressie**: "+ Eigen oefening" (coach+) en het Beheer-scherm stuurden
    geen `scope` mee, vielen terug op de nieuwe default `'personal'` i.p.v. `'gym'`/`'global'`
    — stille betekenisverandering. Gefixt.
12. **v3.3.10 — XSS, fase 1**: `escHtml()`-helper toegevoegd, hoogst-blootgestelde plekken
    gefixt (oefeningpicker, trainingsnamen). **~115 plekken resteren**, zie Openstaand.
13. **KRITIEKE FIX — coach.js**: had als ENIGE van de 8 Netlify Functions geen
    JWT-verificatie. Volledig open, onbeperkte Claude-API-proxy op Maurice's kosten,
    bereikbaar zonder in te loggen. **Nog niet gecheckt of dit al misbruikt is** — Product
    Owner moet Anthropic-dashboard (console.anthropic.com, gebruik/facturering) checken
    op ongebruikelijke pieken vóór vandaag.
14. **v3.3.12**: AI-coach kreeg nooit de daadwerkelijke huidige datum mee in de
    system-prompt (alleen het gewenste FORMAT) — verklaarde gemelde datumfouten in
    coach-antwoorden. Gefixt in `buildCtx()`.

## Openstaande, bekende bugs/werk (expliciete scope voor de volgende sessie)
1. **XSS-remediatie, fase 2** — ~115 resterende `innerHTML`-plekken zonder escaping.
   Twee categorieën, verschillende technieken:
   - Tekst-inhoud in innerHTML → `escHtml()` (zelfde patroon als fase 1)
   - Namen ín `onclick="..."`-attributen (met name Beheer-scherm: rest-tijd, peak goal,
     ratio-anchor, YT-koppeling) → `escHtml()` werkt HIER NIET (browser decodeert HTML-
     entities vóór JS-executie) — heeft de `JSON.stringify()`-aanpak nodig (staat al
     correct bij de spiergroepen-editor, als voorbeeld).
   - Ook `addMsg()` (coach-chatweergave, regel ~6598) — lager risico (persoonlijk, niet
     gym-gedeeld) maar zelfde categorie.
2. **UI voor het v333 3-laags-model** — scope-kiezer bij oefening/training aanmaken,
   "deel met persoon"-knop (content_shares), Beheer-scherm-toegang herzien voor
   gym-owners (nu nog PIN-gate, niet gym_role_level-gate).
3. **`equipment_types`-feature** (apparatuur-catalogus) — apart besluit genomen 1 aug:
   twee delen (bestaande instellingsvelden-lijst blijft + nieuwe apparatuur-catalogus met
   uitleg/gebruik/spiergroep, gym-owner-beheerd voor aangesloten leden, zelf samen te
   stellen voor losse atleten). Nog geen architectuur/migratie uitgewerkt.
4. **Generieke dubbel-klik-bescherming** op ~20 overige Opslaan-knoppen — laag risico
   (snelle single-record writes, niet de lange lussen die vandaag wél gefixt zijn), maar
   technische schuld.
5. **AI-samenhang tussen gesprekken** — `buildCtx()` bouwt per context (algemeen vs.
   per-oefening) een aparte `chatHist` op, geen gedeeld geheugen. Bewuste keuze tot nu toe,
   nog niet heroverwogen — productvraag, geen bug.
6. **Onboarding-flow** — nog niet uitgewerkt, komt aan bod na de bugfix-ronde.
7. **Wearable-data**: nog steeds niet herbevestigd of de sync daadwerkelijk data ophaalt
   (propagatie-vertraging Fitbit→Google Health, of veldnamen-mismatch — zie de
   "TE VERIFIËREN"-comment in `wearable-sync.js`).

## Belangrijkste bestanden
- `docs/00_Project_Management/DECISION_LOG.md` — nog bij te werken met DEC-010 e.v. voor
  vandaag se besluiten (scope-model, wie mag wat delen, equipment_types-toegang)
- `migratie_v331.sql` t/m `migratie_v334.sql` — alle vier gedraaid en geverifieerd
- `netlify/functions/coach.js` — kritieke security-fix, extra aandacht bij volgende wijzigingen
- `netlify/functions/cleanup-unverified-accounts.js` — nieuw, nog niet bevestigd dat de
  schedule daadwerkelijk draait (Netlify Pro-plan, zou moeten werken — checken in
  function-logs na 24u)

## Volgende actie
Product Owner wil dit in een NIEUWE chat oppakken: eerst de bekende openstaande bugs
(zie lijst hierboven) afwerken vóórdat er nieuwe features/UI bovenop komen. Aanrader:
begin met live testen in de app (inloggen, training doen, oefening delen, programma
genereren) om te zien welke van de vandaag gemaakte fixes ook echt werken zoals bedoeld —
dat geeft concretere prioriteit dan blind verder statisch doorzoeken.

## Belangrijke instructies voor AI
- Governance-niveau B blijft leidend.
- Bestaande werkwijze: view/grep → str_replace → node --check → volledige logic_tests.js-run
  → versiebump (APP_VER + sw.js CACHE_NAME) → push via GitHub API → verifiëren via de
  Contents API (niet raw.githubusercontent.com, CDN-cache geeft valse negatieven).
- SQL-migraties: eerst in Supabase draaien, dan pas app-bestanden pushen — was vandaag
  soms andersom (migratie na de code gepusht) omdat de Product Owner de SQL zelf in
  losse stukken moest plakken op mobiel; dat werkte, maar hou de volgorde-regel aan waar
  mogelijk.
- Nieuwe GitHub-token nodig bij sessiestart voor schrijftoegang (kortstondig, self-service
  door Product Owner verstrekt, nooit een oud token aannemen als nog geldig).
- Bij elke nieuwe RLS/policy-wijziging: expliciet nalopen of ALLE client-side writes naar
  die tabel nog kloppen (v3.3.9 was nodig omdat dit bij v333 niet volledig was gedaan).
