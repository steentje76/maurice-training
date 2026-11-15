# Functional >=9 Reality Matrix (beknopt, evidence-based)

Schaal 0-10 per dimensie. Geen blind gemiddelde -- een kritiek zwakke
dimensie (bv. Real Data=0) begrenst de bruikbare interpretatie, ongeacht
hoe hoog andere dimensies scoren.

| Domein | Functionality | Database | Real Data | Security | Testing | Runtime | Blockers to 9 | Safe software work | PO decision |
|---|---|---|---|---|---|---|---|---|---|
| Training Core | 9 | 9 | 9 | 8 | 8 | 9 | geen groot blocker | onderhoud | nee |
| Recovery/Health/Body | 9 | 9 | 8 | 8 | 8 | 9 | geen groot blocker | onderhoud | nee |
| Nutrition (macro-logger) | 6 | 5 | 0 | 7 | 3 | 6 | productdatabase, echte gebruikersdata, tests | tests toevoegen voor bestaande logger | scope: productdatabase ja/nee |
| Samen/Social | 4 | 6 | 0 | 7 | onbekend (niet geverifieerd deze sessie) | 3 (geen scherm) | centraal scherm, messaging, echte data | geen zonder scherm-besluit | scherm-architectuur + messaging-scope |
| Human Coach | 2 | 7 | 0 | 7 | onbekend | 0 (geen UI gevonden) | volledige UI + eerste echte relatie | geen zonder UX-besluit | UX-ontwerp vereist |
| Commercial/Entitlements | 3 | 7 | 0 (transacties) | onbekend (niet geverifieerd) | onbekend | onbekend | echte betaalstroom-validatie | RLS/entitlement-audit los van UI | prijzen/tiers blijven PO |
| Devices/Wearables | 5 | 6 | 2 | onbekend | onbekend | 5 | meer connectors, echte-account-validatie | wiring-audit | welke devices prioriteit |
| Periodisering (macro/meso/microcyclus) | 1 | 8 (schema) | 0 | onbekend | onbekend | 0 | volledige UI + besluit of model actueel is | geen | architectuurkeuze: dit model gebruiken of niet |

**Expliciete disclaimer:** dimensies gemarkeerd "onbekend"/"niet
geverifieerd deze sessie" zijn bewust niet ingevuld met een geraden getal
-- dat zou een schijnzekerheid geven die niet door bewijs is gedekt.
