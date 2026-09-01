# Benchmark 9+ Functional Dependency Graph

**Methodologie:** gebaseerd op de daadwerkelijke, tijdens de deep-dive
bevestigde repo-architectuur (database-schema, gedeelde canonieke
modules) -- niet blind de hypothese uit de opdracht overgenomen.

## Bevestigde afhankelijkheden

```
Team Operations
   ├─ deelt datamodel-fundament met → Gym/Club (organizations/teams)
   └─ vereist → Coach/PT (wie mag events/programma's beheren)

Coach/PT
   ├─ vereist → Team Operations (gedeeld fundament)
   └─ kan hergebruiken → AdherenceIntelligenceCore (F7, al canoniek,
      geen nieuwe calculation nodig voor coach-athlete-adherence-
      overzicht)

Gym/Club
   └─ ARCHITECTURELE AMBIGUÏTEIT bevestigd: twee parallelle systemen
      (users.gym_id/gym_role via gym-team.js VERSUS organizations/
      teams/gyms, volledig backend-only) -- dit moet EERST worden
      opgelost (welk systeem is canoniek) vóór Team Operations/Coach-PT
      hierop kunnen voortbouwen. Dit is een BLOKKERENDE afhankelijkheid
      die niet in de oorspronkelijke hypothese-schets stond.

Devices/Wearables
   └─ voedt (via bestaande, bevestigde architectuur) → Running/Cycling/
      Recovery/Ergometers, met wearable-energie/HR altijd als schatting
      behandeld (B9-11-precedent), nooit als waarheid.

HYROX en Triathlon
   └─ delen HETZELFDE datamodel (race_segments/training_instances,
      bevestigd tijdens B9-06) -- een fix aan de een (bijv. race-
      versus-training-onderscheid) is direct herbruikbaar voor de
      ander. Dit is een STERKERE, directere afhankelijkheid dan de
      oorspronkelijke hypothese suggereerde.

Social/Nutrition Intelligence
   └─ delen beide het patroon "hergebruik bestaande engine, geen
      tweede systeem" (SocialChallengeCore/AdherenceIntelligenceCore/
      NutritionFoundationCore) -- geen directe functionele
      afhankelijkheid tussen de twee domeinen zelf, wel een gedeeld
      architectuurprincipe.

Commercial (Entitlements)
   └─ raakt indirect ALLE domeinen (elke nieuwe productlaag -- vooral
      Team Operations/Coach/PT/Gym -- zal moeten bepalen welke
      entitlement-tier toegang geeft, conform het bestaande
      "ENTITLEMENTS =/= SECURITY"-precedent uit coach.js).
```

## Herziene bouwvolgorde-conclusie

De oorspronkelijke hypothese (Wave 1: Team+Coach+Gym samen) is
**grotendeels bevestigd correct**, met één belangrijke toevoeging: de
Gym/Club-architectuurambiguïteit (twee parallelle systemen) moet
**eerst** expliciet worden opgelost, vóór Team Operations of Coach/PT
functioneel kunnen worden gebouwd op een duidelijk, ene fundament.
Zonder die keuze zou een nieuwe Team/Coach-laag op het verkeerde, of
op beide, systemen kunnen worden gebouwd -- een architectonisch risico.
