# CURRENT_NAVIGATION_TREE.md

```
START (niet-ingelogd)
└── s-auth (login/registratie)
    ├── s-auth-newpass (wachtwoord-reset)
    └── (na registratie) → s-intake → s-onboarding → s-home

BOTTOM NAVIGATIE (5 tabs, altijd zichtbaar na onboarding)
├── 🏠 Home → s-home
│   ├── programma-kaart → s-programma-detail
│   ├── vandaag-CTA → s-train-detail
│   └── coach-advies-kaart → s-coach (AI Coach chat)
│
├── 🏋️ Training → s-train-mgr (of s-train-<sport> indien actieve sport)
│   ├── s-running
│   │   ├── s-running-insights
│   │   └── (workout) → s-guided / s-builder
│   ├── s-cycling
│   │   └── s-cycling-insights
│   ├── s-hyrox
│   │   └── s-hyrox-perf
│   ├── s-programma → s-programma-detail
│   ├── s-kalender
│   ├── s-library (oefeningenbibliotheek)
│   ├── s-hist (trainingshistorie)
│   ├── s-train-mine ("mijn trainingen")
│   └── s-train-detail (dagdetail)
│
├── 🧍 Lichaam → s-lichaam
│   ├── s-lich-gegevens
│   │   └── s-lich-metingen → s-lich-metric
│   ├── s-lich-health (Recovery: HRV/RHR/slaap)
│   │   └── (wearable-koppeling, geen apart scherm — kaart binnen dit scherm)
│   ├── s-lich-cyclus (Women's Performance)
│   ├── s-lich-spieren → s-lich-spier → s-lich-oefeningen
│   └── s-lich-verbanden → s-lich-verband
│
├── 🤖 Coach → s-coach (AI Coach-chatinterface, NIET Human Coach/PT-beheer)
│
└── 📈 Voortgang → s-stats
    └── s-doelen

BUITEN DE BOTTOM-NAV (bereikbaar via andere routes/knoppen)
├── s-social (Social-hoofdscherm)
├── s-nutrition (Voeding)
├── s-profiel → s-settings → s-privacy
├── s-meldingen
├── s-help
└── s-admin (via s-admin-pin, gym-beheer)

NIET BEREIKBAAR VIA ENIGE NAVIGATIE (geconstateerd, niet opgelost)
├── Team Operations — 0 schermen bestaan
├── Coach/PT (human coach-athlete-relatiebeheer) — 0 schermen bestaan
│   (s-coach is de AI Coach-chat, geen relatiebeheer)
└── Gym/Club (canonieke organizations/teams) — s-admin gebruikt de
    oudere users.gym_id-laag, geen scherm voor de nieuwere
    organizations/memberships-architectuur (B9-H2A/B)
```
