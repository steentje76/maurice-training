# B9-H3A Cross-Sport Device Architecture (aanbeveling, niet geïmplementeerd)

## Bevestigde, herbruikbare foundation

`core/deviceIntegration.js` se `normalizeMetric()`/`normalizeWorkout()`/
`normalizeSeries()`-patroon (spec-gebaseerd, provider-onafhankelijk)
is **al** het juiste "Provider Adapter + Canonical Metric Mapper"-
patroon dat sectie 33 van de opdracht vraagt. Een toekomstige,
tweede cloud-provider (bijv. Garmin) zou dit patroon kunnen hergebruiken
door een eigen `spec`-object te definiëren (analoog aan `CONCEPT2_MAP`),
zonder de kernfunctie te wijzigen.

## Ontbrekende laag: Sport Capability Registry

Er bestaat geen centrale plek die vastlegt "welke canonieke sport
hoort bij welke provider-activity-type, en welke metrics zijn voor
die combinatie geldig". Aanbeveling voor een toekomstige sprint:

```
SPORT_CAPABILITY_REGISTRY = {
  running:  { requiredMetrics: ['duration'], optionalMetrics: ['distance','pace','hr','cadence','elevation'] },
  cycling:  { requiredMetrics: ['duration'], optionalMetrics: ['distance','speed','power','cadence','hr'] },
  rowing:   { requiredMetrics: ['duration'], optionalMetrics: ['distance','power','strokeRate','hr'] },
  ...
}
```

Dit zou de bestaande, canonieke Calculation Engines (Critical Speed/
Power, HYROX, Triathlon) ongewijzigd laten -- de registry bepaalt
uitsluitend welke, reeds bestaande calculation een geïmporteerde
activity mag consumeren.

## Waarom dit niet in deze sprint is gebouwd

Een generieke registry zonder een tweede, echte provider om tegen te
valideren zou **speculatieve architectuur** zijn -- precies het risico
dat sectie 56 van de opdracht wil vermijden ("Test extensibility").
Zonder een tweede provider is er geen manier om te bewijzen dat de
registry daadwerkelijk correct generaliseert. Deze aanbeveling wordt
daarom vastgelegd als ontwerp-richting voor de eerste, toekomstige
provider-toevoeging, niet als voltooide architectuur.
