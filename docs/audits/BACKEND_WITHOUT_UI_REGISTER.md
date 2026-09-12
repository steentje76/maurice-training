# Backend Without UI Register

Capabilities met aantoonbare backend (schema+RLS, vaak ook CRUD-code)
maar zonder een normale, centrale athlete-facing entry point.

| Capability | Backend status | Security | Data | Missing UI | Target screen | Priority | PO decision | Safe to implement |
|---|---|---|---|---|---|---|---|---|
| Social connections (vrienden) | werkende CRUD bevestigd | RLS aan, bevestigd | 0 rijen | geen centraal Samen-scherm | Samen v0.1 | P1 | ja -- welk scherm eerst | nee (nieuw scherm) |
| Social groups | werkende CRUD bevestigd | RLS aan | 1 rij | idem | Samen v0.1 | P1 | ja | nee |
| Social challenges | werkende CRUD bevestigd | RLS aan | 0 rijen | idem | Samen v0.1 | P1 | ja | nee |
| Moderatie (block/report) | werkende CRUD bevestigd | RLS aan (target ziet report nooit) | 0 rijen | geen gebruikersgerichte flow gevonden | Samen v0.1 | P2 | ja | nee |
| Human coach relationships/scopes | volledig schema | RLS aan | 0 rijen | geen enkele UI-aanroep gevonden in deze sessie | Coach v0.2 | P1 | ja | nee |
| Periodisering (macro/meso/microcyclus) | volledig, gelaagd schema | RLS aan | 0 rijen | geen enkele UI-aanroep gevonden | Trainen (Programma's) | P2 | ja -- of dit model nog actueel is | nee (architectuurkeuze) |
| Team/Location/Event (MS-F11) | volledig schema | RLS aan | 0 rijen | geen gebruikersgerichte flow gevonden | Samen (Team/Gym) | P2 | ja | nee |
| ai_usage tracking | schema, service-role-only | RLS aan | 0 rijen | n.v.t. (interne telling) | n.v.t. | P3 | nee, technisch | ja -- wiring controleren of de schrijfstap actief is |

**Belangrijk onderscheid:** dit register bevat uitsluitend capabilities
waar écht CRUD-code/schema bestaat. Het ontbreken van een scherm is hier
NIET hetzelfde als "missing capability" -- het is een bewuste of
onbewuste bouwvolgorde-keuze die de Product Owner moet bevestigen.
