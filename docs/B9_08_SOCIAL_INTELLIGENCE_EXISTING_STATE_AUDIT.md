# B9-08 Social Intelligence — Existing-State Audit

## Matrix

| Capability | Data bestaat | Canonieke calculation | Decision rule | UI | AI consumer | Privacy-safe | Status vóór B9-08 |
|---|---|---|---|---|---|---|---|
| Social activity summary | Ja (B9-07-tabellen) | Nee | Nee | Nee | Nee | N.v.t. | **NOT IMPLEMENTED** |
| Connection activity | Ja | Nee | Nee | Deels (lijst) | Nee | Ja (RLS) | **BACKEND ONLY** (aggregatie) |
| Group activity | Ja | Nee | Nee | Deels (lidmaatschap) | Nee | Ja (RLS) | **BACKEND ONLY** (aggregatie) |
| Challenge progress | Ja | Ja (`SocialChallengeCore.aggregateProgress`) | Nee | Nee (niet getoond) | Nee | Ja | **BACKEND ONLY** |
| Challenge comparison | Ja (deelnemerslijst) | Nee | Nee | Nee | Nee | N.v.t. | **NOT IMPLEMENTED** |
| Support/encouragement | Ja (reacties/comments) | Nee | Nee | Deels (feed) | Nee | Ja | **BACKEND ONLY** (signaal) |
| Social consistency | Ja (`AdherenceIntelligenceCore`, F7) | Ja, bestaand | Nee | Nee (niet social-context) | Nee | Ja | **IMPLEMENTED** (elders, niet social-geintegreerd) |
| Relevant notifications | Ja | Nee (geen groepering) | Nee | Ja (lijst, ongegroepeerd) | Nee | Ja | **IMPLEMENTED** (basaal) |
| Social recommendations | Deels (open follow-requests/joinbare groepen al zichtbaar) | Nee | Nee | Ja (in B9-07) | Nee | Ja | **NOT DESIRABLE** (los, extra) |
| Athlete-to-athlete comparison | Nee (geen vergelijkbare-metric-contract) | Nee | Nee | Nee | Nee | N.v.t. | **NOT IMPLEMENTED** |

## Bevindingen

- `core/adherenceIntelligence.js` (`AdherenceIntelligenceCore.aggregate()`) bestaat al, canoniek, en is direct herbruikbaar voor een privé, eigen consistency-signaal -- geen tweede adherence-engine nodig.
- `core/socialChallenge.js` (`SocialChallengeCore`) bevat al `aggregateProgress()`/`challengeStatus()` -- volledig herbruikbaar voor challenge-progressie, geen nieuwe berekening nodig.
- Geen bestaande ranking-, leaderboard-, score-, of streak-infrastructuur voor Social gevonden -- er is dus niets om te hergebruiken of te dupliceren op dat vlak.
- `AI Coach`-context (`tkCoachDataBlok()`) bevat geen enkele Social-data op dit moment -- geen bestaande AI-integratie om te auditen of uit te breiden.
- Notificaties (B9-07) worden getoond zonder groepering -- bij meerdere gelijksoortige events zou de gebruiker meerdere, vrijwel identieke kaarten zien.
