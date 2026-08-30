# MS-F8-02_WOMENS_PRIVACY_CONSENT_MODEL.md — Trainingskompas

**Canonieke naam/acceptance:** "Women's Privacy & Consent Model" -- "Sensitive context visibility/retention/sharing rules." P1, dependency MS-F8-01 (CLOSED).

## Data-inventaris
| Veld/tabel | Sensitiviteit | Opslag | Retentie | Toegang | Verwijderbaar | AI | Coach | Team/gym | Social |
|---|---|---|---|---|---|---|---|---|---|
| cycle_periods (start/einddatum) | Hoog | Supabase, RLS eigen-data-alleen | Onbeperkt tot verwijdering | Uitsluitend eigenaar | Ja (bevestigd + gefixt) | Nee (niet gekoppeld) | Nee | Nee | Nee |
| cycle_symptom_logs (severity/note) | Hoog | Supabase, RLS eigen-data-alleen | Onbeperkt tot verwijdering | Uitsluitend eigenaar | Ja (nu gefixt, zie hieronder) | Nee | Nee | Nee | Nee |

## Live, adversarial RLS-verificatie (uitgevoerd op de productiedatabase, binnen een transactie met rollback -- geen data gewijzigd)
**Cross-user-test:** twee gesimuleerde gebruikers (User A, User B) binnen dezelfde transactie. Resultaat: `user_b_ziet_van_user_a: 0`, `user_b_ziet_eigen: 1`. User B kan uitsluitend zijn eigen rij zien, nul rijen van User A.
**Anonieme-toegang-test:** anonieme rol (`anon`) probeert beide tabellen te lezen. Resultaat: `anon_ziet_cycle_periods: 0`, `anon_ziet_symptom_logs: 0`.
**Conclusie: RLS correct afgedwongen voor beide tabellen, zowel tegen cross-user-lekken als anonieme toegang.**

## Coach/team/gym-toegang
Geen enkele Netlify-functie behalve `delete-account.js` bevat een verwijzing naar `cycle_periods`/`cycle_symptom_logs` (repo-brede grep). `delete-account.js` is een legitieme uitzondering: het verwijdert beide tabellen als onderdeel van een volledige accountverwijdering (correct -- voorkomt orphaned records bij accountverwijdering), het leest ze niet uit. Een bestaande coach-relatie geeft dus GEEN toegang tot deze data.

## AI-toegang
`core/coaching.js` (de canonieke AI-payload-builder) bevat geen enkele cyclus-referentie (bevestigd in MS-F8-01). De AI ontvangt vandaag geen cyclus-/symptoomdata.

## Observability/telemetry
Geen enkele `ObservabilityCore`-aanroep in de cyclus-UI-code bevat cyclus-data als argument (repo-brede grep). De bestaande redactie-architectuur (`core/observability.js`) documenteert expliciet "cycle symptoms" als DO-NOT-LOG-categorie.

## Kritieke, gevonden en gerepareerde bevinding: onvolledige verwijdering
**Bevinding:** `cyclusVerwijderAlleData()` verwijderde uitsluitend `cycle_periods`, NIET `cycle_symptom_logs`. Een atleet die "alle cyclusdata verwijderen" koos, dacht alles kwijt te zijn, maar haar symptoomregistraties bleven bestaan -- orphaned sensitive records.
**Fix:** beide tabellen worden nu expliciet, apart verwijderd. Als een van beide verwijderingen faalt, wordt dit zichtbaar gemeld (geen valse "alles verwijderd"-suggestie).

## Consent
Cyclustracking is al opt-in (expliciet optioneel UI-label, geen verplichte onboarding-vraag). Geen granulaire consent-vlag nodig binnen de huidige scope (geen coach/team/AI-toegang bestaat om apart consent voor te vragen).

## Migratie
Geen nieuwe database-migratie nodig voor deze sprint (de fix is uitsluitend client-side verwijderlogica, geen schema-wijziging).

## Tests
`core/fWomensPrivacyConsent.test.js` (nieuw): bevestigt de delete-fix, de afwezigheid van coach-proxy-toegang, de afwezigheid van observability-lekken, en documenteert de live uitgevoerde adversarial RLS-tests.

## MS-F8-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Sensitive context visibility/retention/sharing rules."
**Resultaat: CLOSED.** Visibility (uitsluitend eigenaar, live geverifieerd tegen cross-user en anonieme toegang), retention (atleet-gecontroleerd, nu correct volledig verwijderbaar), en sharing (geen coach/team/gym/AI-toegang vandaag) zijn alle drie expliciet vastgesteld en getest. Eén genuine bug gevonden en gerepareerd tijdens deze audit.
