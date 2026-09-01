# B9-H3A Device Functional Benchmark

| Ecosystem | Patroon | TK-status |
|---|---|---|
| Garmin Connect | Volledige activity-cloud-sync, multi-sensor | Niet geïmplementeerd |
| Apple Health | Cross-app health-aggregatie | Niet geïmplementeerd (geen iOS-wearable-pad) |
| Fitbit (via Google Health) | HRV/RHR/sleep | **Geïmplementeerd en getest** |
| WHOOP | Recovery-score | Niet geïmplementeerd; TK bouwt bewust geen provider-score-doorgeefluik naar Decision Engine (architectuurprincipe reeds gehandhaafd in Recovery-domein, geen wijziging nodig) |
| Concept2 ErgData | Real-time ergometer-logging | **Geïmplementeerd en getest**, functioneel gelijkwaardig aan ErgData qua real-time betrouwbaarheid (reconnect-scenario's getest) |
| Strava | Social activity-sharing na import | N.v.t. (TK heeft een eigen, aparte Social-laag, B9-07/08, geen externe afhankelijkheid) |

**Geen feature-count-conclusie:** TK is functioneel sterk voor de twee
assen die het wél ondersteunt (recovery-metrics, Concept2), en
transparant over de assen die het niet ondersteunt (cross-sport cloud-
activity-import). Dit is geen zwakte die verborgen moet worden -- het
is de eerlijke, huidige productgrens.
