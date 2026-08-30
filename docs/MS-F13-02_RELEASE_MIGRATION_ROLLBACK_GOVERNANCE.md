# MS-F13-02_RELEASE_MIGRATION_ROLLBACK_GOVERNANCE.md — Trainingskompas

**Baseline main SHA:** `cc7fcc0013b316bad529f27c5dab30545efa29ee`. Datum: 30 augustus 2026.

## Existing-state audit
46 sequentiële migraties (`migratie_v320.sql` t/m `migratie_v524.sql`) bestaan al, allemaal forward-only in de praktijk. `docs/RELEASE_HISTORY.md` is uitsluitend een chronologische versie-index (CHANGELOG-samenvatting) — er bestond nog geen formeel, expliciet vastgelegd deploy/migratie/rollback-beleid als eigen governance-document, hoewel de praktijk het al consistent toepast.

**Bestaande, goede praktijk gevonden (niet nieuw gebouwd, hier voor het eerst geformaliseerd):** `migratie_v501.sql` bevat een `-- ROLLBACK (afgeraden na productiegebruik -- verliest audit-geschiedenis): -- DROP TABLE IF EXISTS ...`-commentaarblok — een expliciete, veilige rollback-instructie die bewust NOOIT automatisch wordt uitgevoerd, met een waarschuwing over dataverlies. Dit is precies het patroon dat MS-F13-02 nu als verplichte conventie vastlegt voor toekomstige migraties.

**Bevestigd (repo-brede scan):** geen enkele van de 46 migraties bevat een daadwerkelijk uitgevoerde `DROP TABLE`/destructieve `ALTER COLUMN TYPE` buiten commentaar — alle wijzigingen zijn additief (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).

## Deploy-volgorde (bestaande, impliciete conventie — nu expliciet vastgelegd)
1. Database-migratie wordt eerst, apart, tegen de live Supabase-database uitgevoerd en live geverifieerd (adversarial getest waar security-relevant).
2. Pas daarna wordt de bijbehorende app-code (`index.html`/`core/*.js`/`netlify/functions/*.js`) gecommit, gepushed, en via Netlify's auto-deploy-bij-merge naar productie gebracht.
3. Dit voorkomt dat nieuwe app-code draait tegen een schema dat nog niet bestaat.

## Forward-only-beleid (formeel vastgelegd)
- Migraties worden nooit herschreven nadat ze live zijn toegepast — een correctie krijgt altijd een nieuw, hoger versienummer.
- Elke migratie is idempotent waar mogelijk (`IF NOT EXISTS`/`CREATE OR REPLACE`), zodat een per ongeluk dubbele uitvoering veilig is.
- Een rollback-pad wordt, waar zinvol, als commentaar gedocumenteerd (nooit automatisch uitgevoerd) — met een expliciete waarschuwing als de rollback dataverlies zou betekenen. Dit is vanaf deze sprint een **verplichte conventie** voor elke nieuwe migratie die een tabel of kolom toevoegt die praktisch gezien verwijderbaar zou zijn.

## Failed migration recovery
Bij een mislukte migratie-uitvoering (bijv. een syntaxfout die halverwege een transactieblok faalt): Supabase's SQL-editor wrapt de volledige migratie in een enkele transactie — een gedeeltelijke uitvoering wordt automatisch teruggedraaid (reeds bekend en gedocumenteerd gedrag, zie `docs/00_Project_Management/CURRENT_STATE.md`: "Supabase SQL editor wraps everything in a single transaction — partial execution failures are safe"). Geen aanvullende architectuur nodig; dit is al veilig.

## Provider integration rollback
Voor de nieuwe MS-F12-04-billingintegratie geldt een aanvullende regel: een rollback van `migratie_v524.sql` (`billing_events`/`reconcile_billing_event()`) mag nooit de reeds vastgelegde, financiële audit-geschiedenis in `billing_events` verwijderen — een eventuele toekomstige rollback-instructie voor deze migratie moet, conform de nu vastgelegde conventie, expliciet als afgeraden commentaar staan, nooit als uitgevoerde DROP.

## Release evidence
Elke sprint in deze repository levert al reproduceerbaar bewijs op: exacte `main`-SHA vóór/na, PR-nummer, Quality Gate-resultaat, en een volledig commitbericht met sprint-evidence (targeted tests, sabotagebewijs, regressieresultaten). Dit voldoet al aan de kern van "release evidence" — hier expliciet bevestigd als de canonieke, blijvende werkwijze, geen nieuwe tooling nodig.

## Feature flags
Niet toegepast in deze sprint: de bestaande, sprint-per-sprint PR-workflow met Quality Gate fungeert al als een impliciete feature-gate (niets bereikt `main` zonder groene tests). Een aparte feature-flag-laag zou op dit moment onnodige complexiteit toevoegen zonder een aantoonbare behoefte (geen sprint tot nu toe vereiste een gefaseerde rollout binnen een reeds gemergde main).

## Conclusie
Geen structurele wijziging nodig — het bestaande proces was al veilig en forward-only. De toegevoegde waarde van deze sprint is het formaliseren van deze conventies als expliciet, doorzoekbaar governance-document, plus een regressietest die borgt dat geen enkele toekomstige migratie een niet-gedocumenteerde, destructieve operatie bevat.
