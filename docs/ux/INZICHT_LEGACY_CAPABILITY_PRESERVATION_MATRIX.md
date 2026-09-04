# Inzicht v0.1 — Legacy Capability Preservation Matrix

Status: LICHAAM en VOORTGANG blijven volledig, functioneel intact.
Inzicht v0.1 is een AANVULLEND overzichtsscherm met entry points naar
bestaande, ongewijzigde functionaliteit — geen vervanging.

Forensisch geverifieerd op HEAD `ae6b432f8a411b26e624bb8c52b60f4cd8390df4`
(vóór deze audit) via code-inspectie (grep/view), niet alleen documentatie.

| Legacy capability | Legacy route | Function | Data source | Calculation | Write | Detail | Status | Target Inzicht domain | Target route | Runtime migrated | Tested | PO approved | Safe to deprecate | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Anatomisch poppetje (voor/achter) | s-lichaam | renderMuscleRecoveryHeatmap, toggleMuscleRecoveryHeatmapView | hrv_log, sessions | v43OverallRecovery, computeMuscleRecoveryPct | nee (read-only viz) | s-lich-spier | PRESERVED, ongewijzigd | Herstel | s-lich-health (via Domeinen-tegel) | nee (entry point only) | ja (bestaande suites) | nee | **NO** | Voor+achter beide bevestigd aanwezig; SafeToRemove blijft NO tot PO expliciet akkoord geeft op definitieve UX-bestemming |
| Spierdetail | s-lich-spier | openSpierDetail | sessions, MUSCLE_RECOVERY_HOURS | computeMuscleRecoveryPct | nee | zichzelf | PRESERVED | Herstel | via Lichaam | nee | ja | nee | **NO** | Bereikbaar via bestaande, ongewijzigde route |
| HRV/RHR/Slaap check-in | s-lichaam (lich-checkin) | openModal('m-hrv') | hrv_log | dagfactor, hrvDagFactorPersonal | JA (schrijft check-in) | m-hrv modal | PRESERVED | Herstel | s-lich-health | nee | ja | nee | **NO** | Write-actie (check-in) volledig ongewijzigd |
| Lichaamsmetingen (gewicht e.a.) | s-lich-metingen | renderBodyMeasurements | weight_log/body metrics | geen (raw) | JA (m-bc modal, openModal('m-bc')) | s-lich-metric | PRESERVED | Lichaam | s-lich-metingen | nee | ja | nee | **NO** | Add/edit-modal (m-bc) ongewijzigd bereikbaar vanaf s-lichaam header |
| Metric-detail (HRV/RHR/Slaap/gewicht) | s-lich-metric | renderLichaamMetricDetail, openLichaamMetric | hrv_log | dc.healthSeries/Stats/Trend | nee | zichzelf | PRESERVED | Herstel/Lichaam | via metric-knoppen | nee | ja | nee | **NO** | Dynamische route via TK_LICH_METRIC_ROUTE, functioneel bevestigd |
| Women's Performance / Cyclus | s-lich-cyclus | (bestaande render) | hrv_log (cyclus_fase) | dagfactor (cyclus-aware) | ja (indien bestaand) | zichzelf | PRESERVED | PO DECISION OPEN | PO DECISION OPEN | nee | bestaande suites (fB9_H5WomensPerformanceHardening) | nee | **NO** | Geen nieuwe Inzicht-entry gebouwd; expliciet PO-besluit vereist vóór migratie |
| Verbanden/associaties | s-lich-verbanden, s-lich-verband | (bestaande render) | sessions/health | bestaande correlatie-logica | nee | s-lich-verband | PRESERVED | Verbanden | via Domeinen-tegel | nee | ja | nee | **NO** | Correlatie != causaliteit-guardrail ongewijzigd |
| Doelen | s-doelen | renderDoelenScreen | program_blocks, sessions | loadGoals, adherence | JA (indien bestaand: create/edit) | zichzelf | PRESERVED | Doelen | via Domeinen-tegel | nee | ja | nee | **NO** | Inzicht-tegel is uitsluitend entry point, geen vervanging |
| Prestaties/Stats (PR/1RM/volume/sport-specifiek) | s-stats | (bestaande render) | sessions, activities | CalcCore (1RM/e1RM/volume) | nee | detailviews binnen s-stats | PRESERVED | Prestaties | via Domeinen-tegel + "Bekijk details" | nee | ja | nee | **NO** | Alle sport-specifieke analytics (HYROX/running/cycling/rowing) ongewijzigd |
| Herstel & Belasting (recovery/load) | s-lichaam premium-secties | renderLichaamPremium, tkCoachBelasting | hrv_log, sessions | AthleteCore (rollingSum, acuteChronic) | nee | zichzelf | PRESERVED | Herstel/Belasting | via Domeinen-tegels | Inzicht toont uitsluitend een samenvattend cijfer (Krachtvolume), volledige breakdown blijft op s-lichaam | ja | nee | **NO** | ACWR-taalguardrail (geen blessurevoorspeller) ongewijzigd |

## Legacy Navigation Decommission Checklist

**LEGACY LICHAAM REMOVAL ALLOWED = NO**
**LEGACY VOORTGANG REMOVAL ALLOWED = NO**

Vereisten vóór een toekomstig verwijderingsbesluit (per capability hierboven):
1. Bewezen, functioneel-gelijkwaardige entry point in de definitieve Inzicht/nieuwe-navigatie-architectuur.
2. Runtime-tests die de nieuwe entry point bevestigen (niet alleen source-inspectie).
3. Expliciete Product Owner-goedkeuring per capability (niet per scherm in het geheel).

Tot dan blijft de bestaande, legacy bottom navigation (Home/Training/Lichaam/Coach/Voortgang) ongewijzigd, en blijven alle bovenstaande routes/functies volledig bereikbaar en functioneel.
