# Trainingskompas Target Product Architecture — Research & Scientific Product Layer

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** functionele targetarchitectuur voor wetenschappelijke evidence, research participation, onderzoeksdatasets, cohortanalyse en externe research/enterprise use. Geen claim dat onderzoeksprojecten, ethische goedkeuringen of externe validaties al bestaan.

## 1. Doel
Trainingskompas moet wetenschappelijke onderbouwing in het product kunnen gebruiken én later verantwoord data voor onderzoek kunnen ondersteunen, zonder productgebruik automatisch tot onderzoek te maken.

Harde regel:
`PRODUCT USE != RESEARCH PARTICIPATION`.

## 2. Twee gescheiden lagen
A. Scientific Product Evidence: bronnen/evidence achter calculations, decisions en claims.
B. Research Product: vrijwillige deelname aan een concreet onderzoeksdoel/protocol.

Deze mogen technisch koppelen, maar juridisch/productmatig niet worden vermengd.

## 3. Evidence Registry
Elke wetenschappelijke claim/calculation/decision waar relevant verwijst naar versioned Evidence Registry met evidence level A-E, bronnen, scope, populatie, beperkingen, reviewdatum en toegestane interpretatie.

## 4. Calculation Registry koppeling
Calculation Registry blijft source of truth voor formule/algoritme. Research/evidence mag Calculation Engine informeren via formeel versieproces; AI of onderzoeker verandert geen productieformule ad hoc.

## 5. Decision Registry koppeling
Decision Rules verwijzen naar relevante evidence en versie. Nieuwe onderzoeksbevinding verandert productiegedrag pas na review, besluit, versie en tests.

## 6. Evidence updates
Nieuwe literatuur leidt conceptueel tot: discovery -> appraisal -> registry update proposal -> domain review -> decision -> version -> regression tests -> release. Geen stille wijziging.

## 7. Research Study
Canonical study bevat minimaal study_id, sponsor/owner, purpose, protocol/version, population criteria, data scope, duration, consent version, ethics/legal status waar vereist, retention, withdrawal policy, outputs en status.

## 8. Study participation
Participation is aparte relatie met INVITED/ELIGIBLE/CONSENTED/ACTIVE/WITHDRAWN/COMPLETED/EXCLUDED waar passend. Normaal TK-account creëert geen participation.

## 9. Consent
Research consent is specifiek, informed, versioned, revocable waar toepasselijk en gescheiden van algemene privacyvoorwaarden, marketing, coach consent en product analytics.

## 10. Data minimization
Study krijgt alleen velden die protocol/purpose nodig heeft. Geen brede database-export omdat data beschikbaar is.

## 11. Research dataset
Datasets worden uit canonical data via governed export/pipeline opgebouwd. Dataset bewaart schema version, extraction timestamp, study/protocol, transformations, provenance en quality flags.

## 12. Pseudonymization
Onderzoeksidentiteit wordt waar mogelijk gescheiden van direct account identity. Mapping is beschermd en minimaal toegankelijk. `PSEUDONYMIZED != ANONYMOUS`.

## 13. Anonymization
Alleen `anonymous` claimen als re-identification risico passend is beoordeeld en data daadwerkelijk niet redelijk terug te koppelen is. Geen marketinggebruik van het woord anoniem voor pseudonieme data.

## 14. Withdrawal
Withdrawal stopt toekomstige research processing volgens protocol/legal basis. Wat met reeds gebruikte/geaggregeerde data gebeurt moet vooraf transparant zijn. Productaccount hoeft niet verwijderd te worden om researchdeelname te stoppen.

## 15. Product deletion
Account deletion en research withdrawal zijn verschillende acties maar moeten consistent reconciliëren volgens consent/legal/retention policy.

## 16. Cohorts
Research cohorts worden bepaald door protocol/query, niet door AI vrije interpretatie. Inclusion/exclusion criteria versioned en reproduceerbaar.

## 17. Derived variables
Research derived metrics moeten formula/version/provenance hebben. Product Calculation outputs kunnen worden gebruikt; research-only derived variables worden niet automatisch product calculations.

## 18. Missingness
`NOT MEASURED != ZERO`. Research exports behouden missing reason waar mogelijk: unavailable, declined, device gap, not applicable, invalid/quality rejected.

## 19. Data quality
Per relevant datapunt/metric: source, device/provider, timestamp, freshness, quality/confidence, manual correction, calculation version.

## 20. Device validity
Wearable/device values worden niet automatisch als klinisch of gold-standard behandeld. Device/source limitations horen in dataset metadata en analyses.

## 21. AI in research
AI mag datasets/documentatie helpen samenvatten of analyses uitleggen binnen governance, maar mag geen ontbrekende observations verzinnen, p-values/resultaten fabriceren, causaliteit claimen zonder ontwerp/evidence of protocol wijzigen.

## 22. Scientific claims in athlete UX
Athlete-facing claim moet passen bij evidence level en scope. D/E evidence mag niet als bewezen causaliteit worden gepresenteerd.

## 23. Research-facing portal
Later mogelijke Research/Enterprise client gebruikt dezelfde governed backend, niet directe unrestricted production database access.

## 24. Access control
Researcher roles/scopes apart van coach/gym/admin. Researcher krijgt geen athlete account browsing buiten approved study/dataset scope.

## 25. Export controls
Exports zijn auditable, time-limited waar passend, schema-defined en least-privilege. Geen secrets/auth tokens/raw unnecessary identifiers.

## 26. Data residency/processors
Per research deployment moeten processors, storage region, contracts en legal basis expliciet worden vastgesteld. Architectuur mag dit niet hardcoderen als reeds opgelost.

## 27. Ethics
Waar onderzoek ethische toetsing vereist, wordt approval/reference/status onderdeel van study governance. Trainingskompas claimt geen IRB/METC/ethische goedkeuring zonder werkelijk bewijs.

## 28. Observational versus intervention
Study type wordt expliciet onderscheiden. Een product recommendation die voor research wordt gemanipuleerd kan intervention zijn en vereist afzonderlijke governance; geen verborgen A/B experiment op training safety.

## 29. Product experimentation
UX/product analytics experiment != scientific research by default, maar privacy/ethics boundaries blijven. Safety-critical Calculation/Decision behavior wordt niet willekeurig A/B getest.

## 30. Reproducibility
Research output moet calculation/rule/schema/dataset versions kunnen reconstrueren. Later gewijzigde engine mag historische study data niet stil veranderen.

## 31. Audit
Audit minimaal study/version, consent event, dataset extraction, actor/access, export, transformation version, withdrawal, deletion/restriction events.

## 32. Publication support
Indien later publicaties: dataset snapshot/version en method metadata kunnen reproduceerbaarheid ondersteunen. Publicatieclaim blijft verantwoordelijkheid van onderzoeksteam; TK genereert geen auteurschap/validiteit automatisch.

## 33. Benchmark/validation studies
Trainingskompas kan eigen calculations/devices laten valideren tegen referentiemethoden. Resultaten worden evidence input, niet automatisch marketingclaim.

## 34. External partners
Universiteit/ziekenhuis/sportinstituut/bedrijf krijgt alleen contractueel en technisch afgebakende study/dataset access. Partnerstatus geeft geen globale tenant bypass.

## 35. Commercial separation
Research/Enterprise entitlement bepaalt tooling/access tot approved research capabilities; het vervangt geen consent/legal authorization.

## 36. Security
RLS/tenant isolation, encryption, audit, least privilege, export controls, secrets management en incident response gelden ook voor research layer. Research is geen backdoor naar production data.

## 37. Functional >=9 criteria
Pas >=9 wanneer Evidence/Calculation/Decision version links werken; product use en research participation gescheiden zijn; study-specific consent/withdrawal werkt; minimization/pseudonymization governed zijn; datasets reproduceerbaar/versioned zijn; missingness/quality/provenance behouden blijven; researcher authorization least-privilege is; exports audited zijn; AI geen fabricated science produceert; device limitations meegaan; deletion/withdrawal reconciliëren; ethics status eerlijk is; adversarial cross-study/cross-athlete tests groen zijn.

## 38. UX governance
Research uitnodiging, consent, study status, withdrawal en research portal worden later pas visueel ontworpen na Product Owner review.

## 39. Harde regels
`PRODUCT USE != RESEARCH CONSENT.`
`PSEUDONYMIZED != ANONYMOUS.`
`RESEARCH DOES NOT BYPASS RLS OR CONSENT.`
`NEW EVIDENCE CHANGES PRODUCT LOGIC ONLY THROUGH VERSIONED GOVERNANCE.`
`AI DOES NOT CREATE SCIENTIFIC TRUTH.`