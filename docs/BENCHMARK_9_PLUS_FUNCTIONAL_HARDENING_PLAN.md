# Benchmark 9+ Functional Hardening Plan

## Waarom in deze sprint niet is doorgebouwd

De grootste, meest kritieke functionele gaps (Team Operations,
Coach/PT) bleken bij onderzoek allebei te vereisen dat een volledig
nieuw scherm wordt gebouwd (er bestaat vandaag helemaal geen UI voor
deze domeinen). Conform de net ingestelde B9-H1-UX-gate ("Claude mag
NIET zelfstandig... nieuwe zichtbare schermstructuur bouwen... zonder
voorafgaande expliciete Product Owner-goedkeuring") en conform sectie
27 van deze opdracht zelf ("Als voor een fix een schermredesign nodig
is: NIET bouwen... markeer BLOCKED UNTIL UX PHASE"), zijn deze twee
grootste gaps daarom bewust **niet geïmplementeerd** in deze sprint --
niet omdat de functionaliteit zelf niet zou passen binnen "functionality
first", maar omdat de enige haalbare implementatie een nieuw scherm
vereist, wat de UX-gate expliciet blokkeert.

De Gym/Club-architectuurambiguïteit (twee parallelle systemen) is
eveneens niet eigenmachtig opgelost -- welk systeem canoniek wordt is
een productbeslissing met grote impact, geen technische bugfix.

Voor de overige domeinen (Social/Nutrition/Running/Cycling/Triathlon/
HYROX) gold: de resterende gaps zijn ofwel bewuste, eerder al
gemotiveerde scope-keuzes (HR-zones/power-zones/TRIMP, P3), ofwel
vereisen ze eerst een eigen, gerichte audit (Women's Performance/
Recovery/Ergometers/Commercial, P2) die binnen het tijdsbudget van
deze ene sessie niet verantwoord, grondig genoeg kon worden uitgevoerd
naast de reeds omvangrijke 13-domeinen-deep-dive zelf.

## Aanbevolen volgorde (herzien, zie dependency graph)

1. **Product Owner-beslissing: Gym/Club-architectuur** (welk systeem
   wordt canoniek) -- dit ontgrendelt Team Operations en Coach/PT.
2. **UX-review voor Team Operations + Coach/PT** (twee nieuwe
   schermen, via de B9-H1-UX-gate: audit → voorstel → mock-up →
   goedkeuring → pas dan implementatie).
3. **Kleine, veilige functionele uitbreidingen zonder nieuw scherm**
   (bijv. B9G-SOC-002, notificatie-uitbreiding) kunnen parallel,
   sneller worden opgepakt.
4. **Gerichte audits** voor Women's Performance/Recovery/Ergometers/
   Commercial (elk een eigen, kleinere deep-dive, vergelijkbaar in
   diepte met de 13 domeinen hierboven).
5. **Devices/Wearables externe validatie** blijft afhankelijk van
   een extern provideraccount/hardware -- buiten softwarematige
   planning.

## Wat NIET in deze sprint is gebouwd, en waarom dat correct is

Geen enkele runtime-code is in deze sprint gewijzigd. Dit is een
bewuste, correcte uitkomst: de twee grootste gaps vereisen een nieuw
scherm (UX-gate), en de overige domeinen vereisen ofwel een eigen
audit ofwel zijn al bewuste scope-keuzes. "Functionality first"
betekent niet "bouw iets, wat dan ook" -- het betekent dat wanneer de
enige weg naar functionaliteit door UX loopt, de UX-gate voorrang
krijgt, precies zoals deze en de vorige opdracht beide expliciet
vereisen.
