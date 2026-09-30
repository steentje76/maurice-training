# GAP-P2-008 — Home: training hervatten — closure record

**Status:** `READY_FOR_ACCEPTANCE` — niet `CLOSED_PROVEN`.
**Registratie:** `docs/AUDIT_GAP_REGISTER.json`, GAP-P2-008.
**Implementatiecontract:** `docs/audit/GAP_P2_008_HOME_RESUME_IMPLEMENTATION_CONTRACT.md`.
**Baseline vóór implementatie:** `570bf0455de1305e216db7f91c299c2a8ff7a942`.

## Wat er is opgeleverd

PR [#492](https://github.com/steentje76/maurice-training/pull/492), squash-gemerged als
`9589298498dfefcc89e14b45c9ddde53617feda4`.

| Bestand | Rol |
| --- | --- |
| `core/homeResume.js` | pure, deterministische beslissingskern: hervatbaar ja/nee met expliciete reden, type en bestaande route uit de draft-sleutel |
| `index.html` | hervatkaart in het bestaande v4.3-renderpad (`renderV43Home` → `renderHomeResumeCard`), vóór "Vandaag gepland"; `resumeTrainingFromHome()` navigeert naar de bestaande start-/resume-route |
| `core/fHomeResume.test.js` | 61 asserties die de echte call-chain uitvoeren |
| `core/fReAuditPersistence.test.js` | tien bestaande asserties ongewijzigd; alleen de nieuwe afhankelijkheid beschikbaar gemaakt |

## Bewijs per contracteis

| Contracteis | Bewijs |
| --- | --- |
| Kaart alleen bij geldige, data-bevattende draft | `resolveResumeState()` geeft `NO_DRAFT`, `INVALID_DRAFT`, `NO_LOGGED_DATA`, `STALE_DIFFERENT_DAY`, `ALREADY_ACTIVE` of `RESUMABLE`; getest per geval |
| Geen kaart bij ontbrekende, corrupte, lege of afgeronde draft; geen dataverlies | sandboxtests: lege innerHTML, geen uitzondering, geen aanroep van een start-route; Home wist nooit een draft (getest) |
| Bestaande type-specifieke route per trainingstype | `startT` / `startCustomTraining` / `startProgramBlockTraining`, per type getest met de exacte id |
| Hergebruik `sessionLog`/`sessionExtra`/`activeInstanceId`, geen dubbele instance | dezelfde `instanceId` gaat mee; geen tweede keten aangeroepen (getest); `startT()` herstelt nog steeds de bestaande sessie |
| Kaart verdwijnt na afronden | bij tikken wordt opnieuw beslist; een verdwenen draft levert geen start en lege kaart (getest) |
| Bestaande guard beschermt een andere draft | `guardExistingDraft()` en de bevestigingslogica ongewijzigd; alleen de Home-intentie slaat de dubbele vraag over |
| Tests bewijzen de werkelijke call-chain | `core/fHomeResume.test.js` voert de kern rechtstreeks uit en `renderHomeResumeCard`/`resumeTrainingFromHome` uit `index.html` in een `vm`-sandbox |
| Bestaande resume-, execution- en documentconsistentietests groen | `fProgramResume` 7/7, `fTrainingExecutionFinalClosure` groen, `fDocConsistencyCheckerSemantics` 3/3, volledige core-suite 417 groen |
| Exact-head en post-merge Quality Gate | run `36778341853` success op `b150f0a8a537d1281d1dc44a9c970e9aafe1fb58`; run `36779012347` success op `9589298498dfefcc89e14b45c9ddde53617feda4` |

## Architectuurgrens

`HomeResumeCore` beslist uitsluitend. Er is geen tweede execution- of loggingketen, geen nieuw sessieobject, geen
extra `training_instances`-rij en geen databasewijziging (geen migratie, geen schema- of RLS-aanpassing). De
hervatbare sessie komt uit de bestaande lokale draft van de ingelogde gebruiker; alle auth- en RLS-grenzen zijn
ongewijzigd.

## Waarom niet CLOSED_PROVEN

Het implementatiecontract eist naast code en tests ook een praktijkverificatie. Die is nog niet vastgelegd:

> **OPEN — praktijkverificatie.** De keten training starten → sets loggen → Home → app/browser opnieuw openen →
> hervatten → verder loggen → afronden is nog niet op een echt toestel (Android/PWA) uitgevoerd en vastgelegd.

Zolang dat bewijs ontbreekt blijft GAP-P2-008 `READY_FOR_ACCEPTANCE`. Wordt de praktijkverificatie vastgelegd, dan
volstaat een statuswijziging naar `CLOSED_PROVEN` met die verificatie als extra `closure_evidence`; er is geen
codewijziging meer voor nodig.

## Administratieve correctie in dezelfde wijziging

De `counts` in `docs/AUDIT_GAP_REGISTER.json` zijn mechanisch herberekend uit de `gaps`-array. De opgeslagen waarde
`open = 49` telde `REVIEW_REQUIRED` (5) en `SUPERSEDED` (2) mee en liep één status achter. Feitelijke verdeling over
68 entries: `open = 41`, `closed_proven = 19`, `ready_for_acceptance = 1`, `review_required = 5`, `superseded = 2`.
Geen enkele andere gapstatus is gewijzigd.
