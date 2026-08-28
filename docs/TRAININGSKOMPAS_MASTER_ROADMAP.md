# TRAININGSKOMPAS_MASTER_ROADMAP.md — 2.0

**Vastgesteld:** 28 augustus 2026, op basis van CODE/DB/TEST VERIFIED consolidatie tegen `main` @ `60eac70`.
**Vervangt:** `docs/CURRENT_ROADMAP.md` als het meest complete toekomstplan (dat document blijft bestaan voor de kortetermijn-POST-V1-status; deze Master Roadmap is het bredere, meerjarige kader).

---

## Producttracks

1. **Training Core** — programma's, builder, preview, executie, historie
2. **Endurance & Multisport** — running/cycling/rowing/HYROX/triathlon/intervallen
3. **Calculation Engine** — deterministische metrics
4. **Context Engine** — sport/fase/cyclus/weer/uitrusting-context (bevestigd first-class genoeg voor een eigen track — 6 eigen modules, apart van Decision)
5. **Decision & Evidence** — regels + externe wetenschappelijke onderbouwing
6. **AI Coach** — uitleg, samenvatting, aanbeveling binnen regelgrenzen
7. **Recovery & Health** — HRV/RHR/slaap/readiness/lichaamssamenstelling
8. **Women's Performance** — cyclus, zwangerschap, postpartum, menopauze, anticonceptie, bekkenbodem
9. **Wearables & Devices** — Google Health, Concept2 PM5
10. **Analytics & Athlete Intelligence** — trends, relaties, stagnatie
11. **Social & Community** — peer-sharing, team-performance (bewust laag geprioriteerd)
12. **Coach/PT Platform** — coach-athlete-relaties, programmering
13. **Gym/Club/Team Platform** — multi-tenant, rollen, licenties
14. **Commercial & Entitlements** — plans, features, credits, billing-UI
15. **Platform/Production** — release, security, offline, monitoring
16. **Scientific Platform** — research-ready export, consent

---

## Fasering

**F0 — Verified Baseline** ✅ AFGEROND (deze mastersprint-serie: DOCUMENTATION_INVENTORY, CAPABILITY_REGISTRY, TEST_VERIFICATION, DB_VERIFICATION, SECURITY_FINDINGS, GAP_ANALYSIS, P0-closure, PRODUCT_ARCHITECTURE, BENCHMARK_REGISTRY)

**F1 — Foundation Closure** ⏳ IN UITVOERING
- Handbook H6/H9/H12 bijwerken (GAP-P1-001)
- Phase 3-RLS-scoping vóór data (GAP-P1-004)
- `bak_p_*`-cleanup (GAP-P2-002)
- Observability-basis (GAP-P2-003)

**F2 — Athlete Core Excellence**
- Commercial-UI (GAP-P1-002) — nodig vóór multi-gym-groei
- AI-outputcontract (GAP-P1-003)
- Verdere Training Core-UX-polish (niet in deze audit gedetailleerd doorgelicht op UX-niveau)

**F3 — Calculation / Context / Evidence Excellence**
- Volledige coverage-audit van alle metrics tegen evidencelevels A-E (in deze sprint alleen architectuur-niveau gedaan, niet metric-voor-metric — zie Open Items)
- Context Engine als erkende eigen track verder verstevigen

**F4 — Coach Intelligence**
- AI-adaptive-programmering-gat t.o.v. Hevy Trainer dichten met TK's evidence-voorsprong (GAP-P1-005)
- Stagnatie/deload-signalen (DEC-036-patroon) uitbreiden naar meer domeinen

**F5 — Connected Athlete**
- Concept2/wearable DEVICE VALIDATION afronden (nog open uit v1-audit)

**F6 — Endurance & Multisport Excellence**
- HYROX/Triathlon-positie is al DIFFERENTIATED (benchmark) — verder uitbouwen, niet opnieuw funderen

**F7 — Longitudinal Athlete Intelligence**
- Analytics/relationship-engine bestaat (`core/relationship.js`, 679 regels, uitgebreid getest) — productniveau-UX-audit nog niet gedaan

**F8 — Women's Performance**
- Wacht op 5 productbesluiten (GAP-P2-001) — **niet inplannen vóór besluiten er zijn**

**F9 — Social & Community**
- Bewust laag (P4) — alleen bij expliciete koerswijziging

**F10 — Coach/PT**
- Schema aanwezig (`coach_athlete_relationships`, correct RLS-gescoped), UI ontbreekt

**F11 — Gym/Club/Team**
- Vereist F1's RLS-scoping-fix eerst (harde dependency)

**F12 — Commercial**
- Vereist F2's Commercial-UI eerst

**F13 — Production & Scale**
- Release gate nu comprehensive (P0-003-fix); Android-buildvalidatie blijft CI-only

**F14 — Scientific Platform**
- Evidence-laag (`scientificEvidence.js`) is een sterke basis; consent-flow ontbreekt nog

**F15 — Beyond Benchmark**
- De evidence-transparantie t.o.v. "unvalidated black box"-concurrenten (Benchmark Registry) is al een reëel beyond-benchmark-punt — vermarkten, niet per se nieuw bouwen

---

## Dependency-graph (kern)

```
Training:   Identity → Athlete Profile → Training Definition → Preview → Execution → Logging → History → Analytics → Coaching
Intelligence: Raw Data → Normalization → Calculation → Context → Decision → Evidence → Coaching
Gym/Coach:  Identity → RBAC → Organization → Membership (RLS-fix vereist!) → Coach Relationship → Team → Programming → Dashboard → Licensing
Commercial: Identity → Product Tier → Entitlement → Billing-UI (ontbreekt) → Seat/License → Feature Gate
```

**Harde regel bevestigd in deze roadmap:** Track 13 (Gym/Club/Team) mag niet met echte data starten vóór GAP-P1-004 (RLS-scoping) gesloten is — dit is dezelfde soort fout als het inmiddels gesloten `gyms`-lek, nu preventief geblokkeerd in plaats van reactief gevonden.

---

## Huidige positie
**F0 afgerond, F1 in uitvoering** (Handbook-updateplan en Phase 3-RLS-fix zijn de eerstvolgende concrete stappen, nog niet uitgevoerd in deze sprint per de expliciete "geen fixes"-scope-regel).

Zie `docs/ROADMAP_INDEX.json` voor de machine-leesbare versie en `GAP_ANALYSIS_V2.md` voor de volledige onderbouwing per gap.
