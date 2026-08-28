# BACKUP_RETENTION_CONTRACT.md — Trainingskompas (MS-F1-05)

**Auditmethode:** live DB-query naar alle `bak_p_*`-tabellen (rijaantal, RLS-status, policies), volledige FK-graaf-scan (in beide richtingen), repo-brede code-search (`index.html`, alle Netlify Functions, root-migratiebestanden), vergelijking met corresponderende canonieke (niet-`bak_`) tabellen, en een check in `docs/00_Project_Management/DECISION_LOG.md` naar een eerder vastgelegd besluit (geen gevonden).

## Bevinding: herkomst
Elke `bak_p_*`-tabel heeft een corresponderende, canonieke tabel zonder `bak_`-prefix die vandaag actief in gebruik is (`exercise_equipment`, `exercise_goals`, `exercises`, `goals`, `program_block_exercises`, `sessions`, `training_exercises`, `training_instances`). Dit patroon — samen met de naamgeving (`bak_p_` = "backup, personal") — bevestigt dat dit pre-migratie-snapshots zijn uit de eerdere legacy-canonicalisatie (F0.7D-reeks, zie `claude_F0_7D-*`-rapporten in project knowledge), genomen als veiligheidskopie vóórdat de oude "p_"-tabellen werden omgezet naar de huidige schema-structuur.

## Classificatie per tabel

| Tabel | Rijen | RLS | FK-referenties | Code-referenties | Corresponderende canonieke tabel | Classificatie |
|---|---|---|---|---|---|---|
| `bak_p_exercise_equipment` | 1 | enabled, 0 policies (deny-all) | 0 | 0 | `exercise_equipment` | **SAFE TO ARCHIVE** |
| `bak_p_exercise_goals` | 13 | enabled, 0 policies | 0 | 0 | `exercise_goals` | **SAFE TO ARCHIVE** |
| `bak_p_exercises` | 73 | enabled, 0 policies | 0 | 0 | `exercises` | **SAFE TO ARCHIVE** |
| `bak_p_goals` | 2 | enabled, 0 policies | 0 | 0 | `goals` | **SAFE TO ARCHIVE** |
| `bak_p_program_block_exercises` | 154 | enabled, 0 policies | 0 | 0 | `program_block_exercises` | **SAFE TO ARCHIVE** |
| `bak_p_sessions` | 93 | enabled, 0 policies | 0 | 0 | `sessions` | **SAFE TO ARCHIVE** |
| `bak_p_training_exercises` | 15 | enabled, 0 policies | 0 | 0 | `training_exercises` | **SAFE TO ARCHIVE** |
| `bak_p_training_instances` | 6 | enabled, 0 policies | 0 | 0 | `training_instances` | **SAFE TO ARCHIVE** |

**Geen enkele tabel is geclassificeerd als "SAFE TO REMOVE".** Ondanks 0 FK's en 0 code-referenties (die daadwerkelijke verwijdering technisch veilig zouden maken), bevatten deze tabellen historische trainingsdata (mogelijk Maurice's eigen vroege ART CrossFit-trainingsgeschiedenis als eerste/enige athlete-user). Data verwijderen is onomkeerbaar; het risico van een verkeerde inschatting weegt zwaarder dan de opslagkosten van acht kleine tabellen (max. 154 rijen). Conform opdracht §20: **"als onzeker: NIET verwijderen."**

## Blocker-classificatie
**`POLICY_DECISION_REQUIRED`** voor daadwerkelijke verwijdering of archivering buiten de database. Dit is geen technische blokkade — de audit zelf is compleet en eenduidig — maar een retentiebeslissing die de Product Owner moet nemen: hoe lang blijft historische, niet langer actief gebruikte trainingsdata bewaard, en in welke vorm (in de DB laten staan als goedkope, RLS-beschermde archiefkopie, exporteren naar een los bestand en dan verwijderen, of direct verwijderen)? Dit raakt mogelijk ook Maurice's eigen persoonlijke trainingshistorie, wat het extra een persoonlijke afweging maakt, geen zuiver technische.

**Geen termijn verzonnen** — conform opdracht §21, geen concrete retentieperiode vastgelegd zonder productbeslissing.

## Retentiebeleid — status per categorie (opdracht §21, definitief vastgelegd waar mogelijk)

| Categorie | Status |
|---|---|
| Operational observability (MS-F1-02) | Geen persistente eigen opslag; gebonden aan Netlify's eigen logretentie. Zie `docs/OBSERVABILITY_CONTRACT.md`. |
| Audit logs (`gym_audit_log`) | Blijft staan, geen expliciete retentietermijn vastgelegd — **POLICY DECISION REQUIRED** indien een maximale bewaartermijn ooit gewenst is. |
| Backup tables (`bak_p_*`) | Zie classificatietabel hierboven — **POLICY DECISION REQUIRED** voor verwijdering/archivering. Tot een besluit: blijven onaangeroerd, RLS-beschermd, geen actieve exposure. |
| Temporary sync data (wearable duplicate-detection) | Buiten scope van deze sprint — geen aparte temp-tabellen aangetroffen tijdens deze audit. |
| Deleted-user remnants | Buiten scope van deze sprint (valt onder `delete-account.js`, reeds apart security-getest in P0-002-closure — geen aparte retentie-audit hier uitgevoerd). |
| Future scientific exports | Nog niet gebouwd (F14, Scientific Platform) — retentiebeleid daarvoor hoort bij die toekomstige mastersprint, niet hier. |

## MS-F1-05 acceptance-checklist
- [x] Audit uitgevoerd: `bak_*`, backup tables, historical migrations (geen aparte historische migratiebestanden buiten de reguliere `migratie_v*.sql`-reeks gevonden die zelf archivering behoeven)
- [x] Voor elke kandidaat een classificatie (ACTIVE DEPENDENCY / RECOVERY REQUIRED / SAFE TO ARCHIVE / SAFE TO REMOVE / UNKNOWN) — alle 8 vielen op SAFE TO ARCHIVE
- [x] Geen backup-tabel verwijderd puur op basis van de naam
- [x] Geen destructive cleanup uitgevoerd bij onzekerheid
- [x] Retentiebeleid per categorie vastgelegd waar mogelijk, `POLICY DECISION REQUIRED` waar een termijn een productbeslissing vereist
- [x] Documentatie bijgewerkt

**Resultaat:** de audit- en classificatiecomponent van MS-F1-05 is volledig afgerond. De daadwerkelijke opruim-/archiveringsactie is een expliciete productbeslissing en blijft open.
