# Overdracht — Trainingskompas v4.50.0 → volgende sprint

**Sprint** MASTER CLAUDE SPRINT A — "Eerlijke App & Closed Loop"
**Branch** `mastersprint/v4.50.0` · **Basis** `14c7d8c` (v4.49.0) · **Kop** `c08e5e9`
**Datum** 19 augustus 2026
**Toestand** alle tests groen, niet gepusht (zie blocker 1), niet gedeployed

> Lees dit document niet als waarheid. Controleer elk punt tegen de code en de
> productiedatabase voordat je erop doorbouwt — precies zoals deze sprint dat met het vorige
> overdrachtsdocument heeft gedaan, waarbij bleek dat één punt erger was dan gemeld en één
> punt al opgelost.

---

## 1. Wat deze sprint heeft gedaan

| Punt | Status | Waar |
|---|---|---|
| A1 — geen limiet op de AI-coach | 🟢 opgelost | `migratie_v450.sql`, `netlify/functions/coach.js` |
| A2 — gepauzeerde training onbereikbaar | 🟢 opgelost | `index.html` (`peekActive`, `renderGuidedResumeCard`) |
| B1 — "geen gegevens" ≠ "er ging iets mis" | 🟢 opgelost | `index.html` (`tkMarkeerStatus` / `tkDataStatus` / `sbGet`) |
| B2 — coachinglus niet gesloten | 🟢 opgelost (deel 1) | `core/decision.js` (`coaching_loop.v1`), `docs/ONTWERP-COACHINGLUS.md` |
| C3 — `migratie_v447.sql` uitgevoerd? | ⚪ niet verifieerbaar | — |
| C4 — twee opruimlijsten | 🟢 opgelost | `netlify/functions/_userData.js` |
| Onafhankelijke release-audit | 🟡 8 van 11 hersteld | commits `00f5cfe`, `c08e5e9` |

Volledige verantwoording per fase: `docs/MASTERSPRINT-STATUS.md`.

## 2. Commits (exact, op volgorde)

```
b600c2a  feat(p0): quotum per gebruiker op de AI-coach en een bereikbare hervat-knop
98dab7f  fix(p1): "geen gegevens" en "er ging iets mis" zijn niet langer hetzelfde
dbb5f84  v4.50.0 Fase 3 — C4: één gedeelde opruimroutine + toegangscontrole
2f1d49a  v4.50.0 Fase 4 — B2: de coachinglus sluiten zonder migratie (coaching_loop.v1)
9d02105  v4.50.0 Fase 5 — versienummer op alle vier de plaatsen + documentatie
00f5cfe  v4.50.0 Fase 6 — herstel van zeven bevindingen uit de onafhankelijke release-audit
c08e5e9  v4.50.0 Fase 6 — Home spreekt zichzelf niet meer tegen (audit-bevinding 7)
```

Let op bij het lezen van de historie: deze commits zijn één keer opnieuw opgebouwd om een
onbedoelde regeleinde-omzetting (CRLF → LF) op `index.html`, `core/decision.js` en
`core/fRC0.test.js` ongedaan te maken. De inhoud is identiek aan wat er getest is; de
oorspronkelijke reeks staat nog als `backup/v4.50.0-crlf`. Diff de branch als geheel
(`git diff 14c7d8c..HEAD`) — dat is een kleine, leesbare diff.

## 3. WAT DE EIGENAAR MOET DOEN VOOR DEZE RELEASE LEEFT

1. **`migratie_v450.sql` draaien** in de Supabase SQL-editor (project `mhfxhzkdmgkaplicdszg`).
   Tabel `ai_usage` + `ai_usage_registreer` + `ai_usage_tokens`. Het script is idempotent en
   eindigt met een verificatiequery; die moet **twee keer `f`** tonen bij
   `anon_mag_registreer` / `anon_mag_tokens`. Staat daar `t`, dan is de revoke niet aangekomen
   en is het quotum omzeilbaar — niet deployen tot dat klopt.
   Zolang de migratie niet gedraaid is werkt de coach gewoon door, maar **zonder limiet**
   (bewuste fail-open).
2. **`CLEANUP_SECRET` zetten** in Netlify. Zolang die leeg is staat
   `cleanup-unverified-accounts` open voor handmatige aanroepen (mét waarschuwing in de log).
   Netlify blokkeert directe URL-aanroep van scheduled functions, dus dit is een tweede slot.
3. **Optioneel:** `AI_QUOTA_PER_DAG` / `AI_QUOTA_PER_MAAND` als je andere grenzen wilt dan
   60/900. `0` betekent nu écht nul (alles blokkeren).
4. **GitHub-schrijftoegang** regelen — zie blocker 1.

## 4. Blockers

### Blocker 1 — pushen naar GitHub · 🔴 onveranderd sinds v4.49.0

```
remote: access denied by the git proxy: steentje76/maurice-training is not in this
session's authorized repository set
```

Alle commits staan lokaal op `mastersprint/v4.50.0` en zijn als patch geleverd. GitHub Actions
kan pas ná de push gecontroleerd worden; de workflow is lokaal één-op-één nagebootst en groen.

### Blocker 2 — C3 niet verifieerbaar · ⚪

`migratie_v447.sql` (vaste `search_path` + REVOKE op acht SECURITY DEFINER-functies) staat in
de repo, maar of hij in productie gedraaid heeft is zonder databaseverbinding niet vast te
stellen. Er is bewust niets gewijzigd en geen productie-SQL uitgevoerd. **Eerste actie voor de
volgende sprint:** dit vaststellen, want het bepaalt of er nog een openstaand securitygat is.

## 5. Wat de volgende sprint zou moeten oppakken

Op volgorde van opbrengst:

1. **C3 vaststellen** (zie blocker 2). Goedkoop, en het is een securityvraag.
2. **De 429 van het quotum netjes afhandelen buiten het chatscherm** (audit-bevinding 9b).
   Nu tonen de programmagenerator ("Fout in week N: …"), de intake, de terugblik en de
   uitleg-aanroep de limietmelding niet of onherkenbaar. Vier aanroepplaatsen, elk met eigen
   foutafhandeling. Let op: de generator doet één aanroep per week, dus een programma van 12
   weken kost 12 van de 60 dagaanroepen — overweeg of dat één aanroep moet worden of een
   eigen, ruimere grens verdient.
3. **Tijdzone van het quotum** (audit-bevinding 10). `current_date` is UTC. Productbesluit:
   UTC laten staan, of een vaste tijdzone per installatie.
4. **Coachinglus deel 2** — `docs/ONTWERP-COACHINGLUS.md` §4. De sessiebrede conclusie
   (`buildCoachConclusion`) wordt nog steeds getoond en weggegooid; die is niet uit
   `sets_detail` af te leiden en vraagt een tabel `training_advice` + migratie. Cardio en
   sessies zonder RPE vallen buiten de lus omdat er dan géén beslissing genomen is — een lus
   daarvoor vraagt eerst een nieuwe, expliciete regel.
5. **Restpunten uit v4.49.0** — 48 geclassificeerde punten staan in
   `docs/MASTERSPRINT-STATUS.md` onder de v4.49.0-verantwoording.

## 6. Wat je NIET opnieuw moet bouwen

- `sessions.duration_s` en `srpe.v1` — de kolom staat in productie, de regel is gebouwd.
- De offline-wachtrij, het bewijsspoor, `prescription_guard.v1`, de CORS-laag, `FN_BASE`,
  `attrArg` — allemaal v4.49.0, geverifieerd.
- De tabellenlijst voor accountverwijdering. Eén lijst, in `_userData.js`. Voeg een nieuwe
  tabel dáár toe, nergens anders.
- De datastatus. Gebruik `tkDataFout(rows)` / `tkFoutKaart(rows, sleutel)`; ga geen 55e
  aanroepplaats van een eigen foutafhandeling voorzien.

## 7. Regels die deze sprint heeft gehanteerd en die blijven gelden

- Geen tests verwijderd of verzwakt. Aangepaste asserties zijn strenger geworden en dragen in
  de code de reden waarom.
- Geen productie-SQL uitgevoerd. Migraties zijn geschreven en expliciet gemeld.
- AI is nooit de bron van waarheid; de lus en de datastatus zijn pure, versioneerde
  core-functies.
- Geen fake functionaliteit: waar de app iets niet weet, zegt hij dat — leeg blijven is beter
  dan een gereconstrueerd advies.
- `CORE_SIG` + `CACHE_NAME` + `CACHE_STATIC` bumpen bij elke core-wijziging (afgedwongen door
  `core/sw-guard.test.js`).
