# TEST_VERIFICATION.md — Trainingskompas (canonieke, actuele versie)

**Laatst herbouwd:** 28 augustus 2026, tegen `main` @ `201385d2d7c6dbc3c1dcd093411aed7619d429c1`.
**Uitgevoerd met:** node v22.22.2, geïsoleerde sandbox (geen productie/DB-impact).

## CURRENT STATUS

| Gate | Dekking | Status |
|---|---|---|
| **Lokale gate** (`node core/release-gate.js`, ook `npm test`) | Discovery-based v2: ontdekt automatisch alle `core/*.test.js` | ✅ Comprehensive sinds PR #64 (was: 10 hardcoded bestanden — HISTORISCH, zie onderaan) |
| **CI Quality Gate** (`.github/workflows/quality-gate.yml`, vereiste check op `main`) | Eigen bash-lus (`tests=(core/*.test.js)`) die alle testbestanden draait | ✅ Comprehensive sinds commit `65e71bd` (18 augustus 2026) — **al vóór de audit**, zie correctie hieronder |

**Actuele cijfers:** 78 testbestanden in `core/` ontdekt, + `logic_tests.js` + 2 statische checks (syntax, purity) = 81 stappen. **80 automatisch uitgevoerd, 1 zichtbaar geskipt** (`fAndroidRelease.test.js`, reden: ontbrekende Android-buildmap in deze sandbox — draait wél in echte CI via `npm run cap:copy`), **0 gefaald**.

---

## HISTORICAL RECORD — hoe dit is vastgesteld

### 1. Oorspronkelijke bevinding (audit, vóór PR #64)
`core/release-gate.js` (v1) voerde een hardcoded lijst van 10 testbestanden uit. De overige ~65 testbestanden (Women's Performance, Device, Relationship, HYROX/Triathlon, enz.) draaiden bij handmatige uitvoering wel groen, maar maakten geen deel uit van die lokale gate.

**Cijfers van dat moment:** Release gate (officieel, v1) 10/10 geslaagd · overige core-tests 65/67 geslaagd (2 afwijkingen, beide omgevingsgebonden: `fAndroidRelease.test.js` en een inmiddels verwijderd `sw-guard.test.js`-duplicaat op repo-root) · totaal 75/77.

### 2. Correctie tijdens de P0-closure (belangrijk — voorkomt een verkeerde ernst-inschatting)
Bij het aanmaken van PR #64 bleek dat `.github/workflows/quality-gate.yml` **al sinds 18 augustus 2026** (commit `65e71bd`, dus vóór deze audit) een eigen, van `core/release-gate.js` onafhankelijke bash-lus bevat die alle `core/*.test.js`-bestanden draait. `main` is een protected branch met deze Quality Gate als vereiste check.

**Betekenis:** de daadwerkelijk door GitHub afgedwongen merge-bescherming was al die tijd comprehensive. Alleen het lokale gemakscommando (`npm test` → `core/release-gate.js` v1) was incompleet — verwarrend voor lokale ontwikkeling, maar **geen reëel gat in de merge-bescherming** zoals aanvankelijk (te zwaar) gerapporteerd.

### 3. Fix (PR #64)
`core/release-gate.js` herbouwd naar v2 (discovery-based): ontdekt automatisch alle `core/*.test.js`-bestanden in plaats van een hardcoded lijst. Bewezen dat de gate ook echt kan falen via een tijdelijke, volledig teruggedraaide sabotage-assertie in `fCycle.test.js` (`git diff` leeg bevestigd na terugdraaien). Verouderd `sw-guard.test.js`-duplicaat op repo-root verwijderd (git-history gecontroleerd vóór verwijdering: kleinere/oudere `CORE_FILES`-lijst, nergens gerefereerd). 5 nieuwe testbestanden toegevoegd als onderdeel van P0-002 (security): `fGymsRlsSecurity`, `fCoachProxySecurity`, `fGymTeamSecurity`, `fWearableAuthSecurity`, `fDeleteAccountSecurity` — samen 64 nieuwe assertions.

**STATUS: CLOSED.** Geen open actie resterend op dit punt.

---

## Huidig volledig testoverzicht

```
🟢 logic_tests (regressie)                250/250
🟢 core/adaptiveCoaching.test              15/15
... (78 core/*.test.js-bestanden, automatisch ontdekt)
🟡 core/fAndroidRelease.test               SKIPPED — reason: vereist gesynchroniseerde Android-buildmap
🟢 syntax index.html (10 scripts)          ok
🟢 Calculation/Decision Core purity        geen DOM/DB/network
──────────────────────────────────────────────────────────
Testbestanden ontdekt in core/: 78 (+ logic_tests.js, + 2 statische checks)
Automatisch uitgevoerd: 80  |  Geskipt (zichtbaar): 1  |  Gefaald: 0
🟢 RELEASE GATE GROEN
```

| Categorie | Aantal | Geslaagd | Geskipt | Gefaald |
|---|---|---|---|---|
| Discovery-based lokale + CI-gate | 81 stappen (78 testbestanden + logic_tests + 2 statisch) | 80 | 1 (Android, met reden) | 0 |
