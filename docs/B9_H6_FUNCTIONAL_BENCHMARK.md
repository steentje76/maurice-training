# B9-H6 Functional Benchmark

| Dimension | Concept2 ErgData (referentie) | Trainingskompas |
|---|---|---|
| Connection reliability | Volwassen, jarenlang battle-tested | Software-getest (95+10), real-device-validatie open |
| Realtime data | Ja | Ja, met correcte per-machine paceBasis (nu ook voor BikeErg correct) |
| Sport-differentiatie (RowErg/SkiErg/BikeErg) | Ja | Ja, met proactieve mismatch-detectie -- een meerwaarde t.o.v. een simpele PM5-uitlezing |
| Cross-sport-integratie (met bredere athlete intelligence) | Nee (ErgData is Concept2-only) | Architecturaal mogelijk (canonieke `activities`), maar Concept2-data loopt momenteel nog via de oudere `sessions`-tabel, dus deze meerwaarde is nog niet gerealiseerd |
| Provenance | Beperkt | Aanwezig op machine-niveau |
| Error recovery | Onbekend (geen publieke evidence) | Getest (mid-workout-isolatie) |
| Privacy/security | Onbekend | Live, adversariaal bevestigd |

**Conclusie:** Trainingskompas is functioneel gelijkwaardig aan of
sterker dan ErgData op sport-differentiatie en security, maar mist nog
de potentiële meerwaarde van cross-sport-integratie omdat Concept2-
data een aparte architectuurweg volgt (`sessions` i.p.v. `activities`).
