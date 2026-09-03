# UX_CURRENT_TARGET_GAP_MATRIX.md

| CURRENT SCREEN | TARGET DEST. | CURRENT FAMILY | TARGET FAMILY | NAV CHANGE | COMPONENT GAPS | ACCESSIBILITY GAPS | MIGRATION RISK | PO REVIEW | STATUS |
|---|---|---|---|---|---|---|---|---|---|
| s-home | Vandaag | bestaand `.card`/`.today-cta` | Vandaag v0.11 | Ja (bottom-nav-herstructurering) | Quick Action Registry ontbreekt | onbekend | MEDIUM | JA | NOT STARTED |
| s-train-mgr/-mine/-detail, s-running/-cycling/-hyrox, s-guided/-builder | Trainen | bestaand | Trainen v0.2 | Ja (bottom-nav) | kalender-statusmodel ontbreekt | onbekend | MEDIUM | JA | NOT STARTED |
| s-lich-*, s-stats, s-doelen | Inzicht | bestaand, verspreid over 2 huidige tabs | Inzicht v0.1 | Ja (samenvoeging Lichaam+Voortgang) | datavisualisatiepalet ontbreekt | onbekend | HOOG (grootste herstructurering) | JA | NOT STARTED |
| s-coach (AI-chat) | Coach (AI-deel) | bestaand | Coach v0.2 | Nee (blijft eigen tab) | AI-sparkle-identiteit ontbreekt visueel | onbekend | LAAG | JA | NOT STARTED |
| (geen scherm) | Coach (Human-deel) | n.v.t. | Coach v0.2 | Nieuw | volledig scherm + coach-notes-backend | n.v.t. | HOOG (nieuw) | JA | NOT STARTED |
| s-social | Samen | bestaand | Samen v0.1 | Nee (blijft eigen concept, ander label) | berichtenplatform-uitbreiding | onbekend | MEDIUM | JA | NOT STARTED |
| (geen scherm) | Samen (Team) | n.v.t. | Samen v0.1 | Nieuw | volledig scherm | n.v.t. | HOOG (nieuw) | JA | NOT STARTED |
| s-admin | Samen (Gym/Club-context) + apart webportaal | legacy `users.gym_id`-UI | Samen v0.1 + webportaal | Ja | canonical-UI + admin-PIN-vervanging (Track A) | onbekend | HOOG (dual-model) | JA | NOT STARTED (backend Track A/B al CLOSED) |
| s-profiel/-settings/-privacy | Profiel | bestaand, verspreid | Profiel v0.1 | Ja (samenvoeging, uit bottom-nav naar avatar-only) | avatar-component ontbreekt volledig | onbekend | MEDIUM | JA | NOT STARTED |
| Devices-kaart (in Lichaam) | Profiel (apparaten) | bestaand, kaart-only | Profiel v0.1 | Ja (verplaatsing) | geen | onbekend | LAAG | JA | NOT STARTED |
| (geen scherm) | Profiel (abonnement) | n.v.t. | Profiel v0.1 | Nieuw | scherm ontbreekt, backend/resolver al TESTED+INTEGRATED | onbekend | MEDIUM | JA (+ prijzen PO-beslissing) | NOT STARTED |

**Belangrijkste conclusie:** voor geen enkel scherm is de implementatie al gestart. Alle rijen: IMPLEMENTATION STATUS = NOT STARTED, PO REVIEW = JA. Dit is verwacht en correct voor deze fase (Design System-canonicalisatie, geen implementatie).
