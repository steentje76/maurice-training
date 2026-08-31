# F13 Post-Audit — P1-14/P1-15 Documentation Integrity & Migration Reproducibility

## P1-14 — Documentation Integrity

**Bevinding uit de opdracht:** "Audit vond tegenstrijdige CURRENT_STATE/
testtellingen en rode consistency gate." **Herbeoordeling:** de
consistency-check (`node tools/check-doc-consistency.js`) toonde
gedurende deze hele sessie consequent "1 consistentieprobleem gevonden"
-- eerder in de sessie behandeld als een "bekende false positive" zonder
grondig onderzoek. Conform de opdracht se expliciete verbod ("geen
whitelist gebruiken om ongemakkelijke waarheid te verbergen") is dit nu
grondig onderzocht.

**Root cause gevonden:** de check "CLOSED roadmap-items die mogelijk nog
als open gap in GAP_ANALYSIS_V2.md staan" gebruikte een "grove
heuristiek" (letterlijk zo genoemd in het eigen commentaar): matchte
uitsluitend op de AANWEZIGHEID van een CLOSED roadmap-ID ergens vóór de
"CLOSED GAPS / HISTORICAL"-sectie, zonder de semantische context van de
vindplaats te beoordelen. Twee treffers bleken bij handmatige verificatie
GEEN echte inconsistentie: (1) `MS-F12-01`t/m`04` stonden in een
`**Target:**`-oplossingsketen die beschrijft welke sprints een ANDER,
apart gap-item (GAP-P2-007) hebben opgelost -- geen claim dat die sprints
zelf nog open zijn; (2) `MS-F11-03` stond in de zin "niet-blokkerend voor
MS-F11-03 CLOSED" -- bevestigt juist expliciet de CLOSED-status.

**Fix:** de checker zelf verbeterd (conform de opdracht: "verbeter de
checker zodat hij semantisch het juiste documenttype begrijpt"). De check
beoordeelt nu per REGEL waarin een CLOSED-ID voorkomt of het woord
"CLOSED" in de nabijheid staat, of de regel een `**Target:**`-
oplossingsketen is (meerdere MS-ID's via een pijl →). Getest met een
echte, kunstmatige sabotage (een CLOSED-ID die daadwerkelijk als "nog
niet gebouwd" wordt geclaimd, zonder CLOSED-bevestiging of keten-context)
-- correct gedetecteerd, geen loophole gecreeerd.

**Resultaat:** voor het eerst in deze sessie draait
`node tools/check-doc-consistency.js` volledig groen (0 problemen),
zonder een whitelist of onderdrukking -- de onderliggende logica is
daadwerkelijk correct gemaakt.

## P1-15 — Repository Reproducibility

### A. Migration reproducibility (P1, binnen scope van deze remediation)

Live `supabase_migrations.schema_migrations` opgevraagd: **62 uitgevoerde
migraties**, tegenover **49 repo-bestanden** (`migratie_v328.sql` t/m
`migratie_v527.sql`).

**Root cause:** repo-migraties zijn GECONSOLIDEERDE eindtoestanden per
mastersprint, niet een 1-op-1 afspiegeling van elke individuele, live
`apply_migration`-aanroep die tijdens die sprint plaatsvond. Voorbeeld:
`migratie_v522.sql` (MS-F12-01) dekt vier aparte, live migraties
(`f12_01_critical_fix_credit_usage_self_mutation`,
`f12_01_critical_fix_credit_purchase_insert_value_spoof`,
`f12_01_plans_features_readonly_rls`, `f12_01_credit_purchase_idempotency`)
als één, samengevoegd bestand.

**Geautomatiseerde dekkingsanalyse** (kernwoorden uit elke live-migratie-
naam gezocht in de gecombineerde inhoud van alle repo-bestanden): van de
62 live migraties hadden er 60 een directe, sterke tekstuele match. De 2
resterende, met een lage automatische score, zijn handmatig geverifieerd:
- `f12_04_fix_user_id_type`: het eindresultaat (`target_user_id uuid`)
  staat al correct in `migratie_v524.sql` -- de correctie zelf is
  geconsolideerd in de eindtoestand, niet apart zichtbaar als een losse
  "fix"-stap.
- `f13_post_audit_p1_09_relax_notnull_and_clear_plaintext`: false
  positive van het automatische script (zocht op het aaneengeschreven
  woord "notnull"); de daadwerkelijke inhoud (`alter column access_token
  drop not null`) staat wel degelijk, volledig, in `migratie_v527.sql`.

**Conclusie:** GEEN live migratie ontbreekt volledig in de repo. Het
patroon van consolidatie (meerdere live stappen → één repo-bestand) is
een bestaand, functioneel-neutraal patroon (het EINDRESULTAAT is
reproduceerbaar vanaf een verse database), maar biedt geen stap-voor-stap
audit-trail van elke tussenliggende, live toestand. Vanaf deze F13
Post-Audit-sprint is de conventie gewijzigd: elke live `apply_migration`
krijgt DIRECT, in dezelfde sessie, een eigen, apart repo-bestand (zie
`migratie_v525.sql`, `migratie_v526.sql`, `migratie_v527.sql` -- elk
correspondeert 1-op-1 met de bijbehorende live migratie(s) van dat
cluster). Geen retroactieve reconstructie van de 49 bestaande bestanden
uitgevoerd (conform de opdracht: "NIET oude live migraties opnieuw
uitvoeren, NIET schema destructief gelijk trekken") -- het bestaande
schema is intact en correct, alleen de granulariteit van de historische
documentatie wijkt af.

### B. Repository media weight (P2, expliciet niet-blokkerend conform de opdracht)

`videos/` bevat 437 MB aan MP4-oefeningsvideo's (206 bestanden) -- exact
de in de opdracht genoemde bevinding. Conform de opdracht se eigen
classificatie ("P2 tenzij CI werkelijk blokkeert"): de release-gate en
alle CI-stappen draaien in deze sessie zonder enige blokkade door deze
media. Geen actie ondernomen (geen media-history-rewrite, geen force
push) -- buiten scope van deze P1-gerichte remediation-sprint.

### C. Losse `.patch`-bestanden in de root

Twee `.patch`-bestanden (`0001-feat-lichaam-...patch`,
`0002-feat-lichaam-...patch`, van 18 augustus 2026) bevestigd als
volledig verwerkte, vergeten artefacten -- de functionaliteit die ze
beschrijven (`s-lich-spier`-scherm) bestaat al, met 151 voorkomens in de
huidige `index.html`. Veilig verwijderd (forward-only `git rm`, geen
geschiedenis-herschrijving).

### D. Stale `NEXT_SESSION_CONTEXT.md`

Bevestigd: het document dateerde van 1 augustus 2026 (v3.3.12), tegenover
de huidige v4.69.29 -- bijna een maand, tientallen versies verouderd.
Volledig herschreven naar de actuele, geverifieerde staat van deze F13
Post-Audit-sessie.
