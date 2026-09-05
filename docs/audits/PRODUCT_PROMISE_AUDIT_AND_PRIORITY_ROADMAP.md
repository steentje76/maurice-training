# Product Promise Audit (Vandaag/Coach/Samen/Profiel) + Priority Roadmap

## Product Promise Audit

Per zichtbaar mockup-element: UI promise vs. bevestigde, echte
onderliggende capability (database-niveau, deze en eerdere sessies).

### VANDAAG

| UI element | Onderliggende capability | Status | Data | Safe to build now | PO decision |
|---|---|---|---|---|---|
| Herstel/Dagfactor/Gereedheid/Slaap-tegels | bestaande, bewezen Calculation/Context Engine | FULL STACK | echt (hrv_log:73) | ja | nee |
| "Volgende actie" trainingskaart | training_instances | FULL STACK | echt (150 rijen) | ja | nee |
| Weer-strip | externe weer-integratie | niet in deze sessie geverifieerd | onbekend | nee zonder verificatie | technische her-audit nodig |
| Garmin/Voeding/Coach Mark status-chips | devices (partial), nutrition (0 rijen), human coach (0 rijen) | PARTIAL/MISSING | zie boven | nee voor Voeding/Coach-chip zonder eerst die domeinen op te lossen | ja |
| Samen-activiteitenstrip | social_shared_activities | ARCHITECTURE ONLY (0 rijen, geen bevestigd schrijfpad) | nee | nee | ja |
| "Snel"-tegels (Vrij trainen/Training maken/Planning/Metingen/Voeding loggen) | grotendeels bestaande routes | grotendeels FULL STACK, "Voeding loggen" -> bestaande, werkende logger (zie Nutrition-audit) | gedeeltelijk | ja, mits "Voeding loggen" bewust naar de eenvoudige logger wijst | bevestigen dat dit acceptabel is zonder productdatabase |

### COACH

| UI element | Onderliggende capability | Status | PO decision |
|---|---|---|---|
| AI Coach-kaart + "Stel je AI Coach een vraag" | chat_history (77 rijen), bestaande AI-integratie | FULL STACK | nee |
| "Mijn Coach" (menselijke coach, chatgeschiedenis, planning) | coach_athlete_relationships, coach_access_scopes | ARCHITECTURE ONLY (0 rijen, geen UI gevonden) | ja -- volledige UX-beslissing nodig vóór bouw |
| "Vandaag voor jou" inzicht-tegels | bestaande Calculation-outputs | grotendeels FULL STACK | nee |

### SAMEN

Zie `SAMEN_FULL_STACK_REALITY_AUDIT.md` -- vrijwel elk mockup-element
(Vrienden/Groepen/Challenges/Feed) heeft BACKEND READY-status maar geen
scherm en geen data. Berichten: MISSING. **Dit hele scherm is een
PO-beslissing-zwaar domein**, niet een korte-termijn bouwklaar scherm.

### PROFIEL

| UI element | Onderliggende capability | Status | PO decision |
|---|---|---|---|
| Sportprofiel & doelen | atleet_profiel, goals | FULL STACK | nee |
| Lichaamsgegevens | weight_log, body_comp | FULL STACK | nee |
| Apparaten & verbindingen | wearable_connections (1), external_connections (0) | PARTIAL | ja -- welke devices prioriteit |
| Privacy & delen | research_consents, RLS-architectuur | PARTIAL (schema bevestigd, volledige UI niet geverifieerd deze sessie) | technische her-audit |
| Abonnement | plans/features/quota (architectuur compleet), billing_events (0) | ARCHITECTURE ONLY voor echte transacties | ja -- prijzen/tiers blijven altijd PO |
| Account & data (export/verwijderen) | niet geverifieerd deze sessie | ONBEKEND | technische her-audit vóór PO-besluit |

## Priority Roadmap (evidence-based)

**P0 (security/data integrity):** geen nieuwe P0 gevonden in deze sessie
buiten wat al eerder is opgelost; geen destructieve bevindingen.

**P1 (functional blocker / promised-but-not-full-stack):**
1. Samen: scherm-architectuurbesluit (backend bestaat, scherm niet)
2. Human Coach: volledige UX + eerste relatie nodig voor Coach v0.2
3. Nutrition: productdatabase-scope-besluit vóór "Voeding loggen"
   prominent te tonen

**P2 (reliability / missing UI for mature backend):**
4. Devices/Wearables: wiring-audit voor Concept2/overige connectors
5. Periodisering (macro/meso/microcyclus): architectuurkeuze --
   gebruiken of bewust laten vervallen
6. Team/Location/Event (MS-F11): UI-besluit

**P3 (enhancements):** commercial/billing-realiteitscheck,
telemetrie-activatie.

### Directe antwoorden op de zeven gestelde vragen

1. **Vóór Vandaag:** niets hards geblokkeerd -- de kern (herstel/training)
   is FULL STACK. Wel PO-besluit nodig over hoe de Voeding/Coach/Samen-
   statuschips zich gedragen als die domeinen nog niet vol zijn.
2. **Vóór Coach:** een expliciet UX-besluit over Human Coach (er is geen
   enkele bestaande relatie of UI).
3. **Vóór Samen:** een scherm-architectuurbesluit plus een besluit over
   messaging (ontbreekt volledig).
4. **Vóór Profiel:** een besluit over Abonnement-weergave gezien de
   ontbrekende, bevestigde betaalstroom-data.
5. **Vóór nieuwe bottom navigation:** de eerdere preservation-eis blijft
   onveranderd -- Lichaam/Voortgang-capabilities moeten eerst bewezen
   gemigreerd zijn (zie Inzicht-preservation-matrix).
6. **Om Nutrition >=9 te maken:** een productdatabase (of expliciet
   besluit dat handmatige logging voldoende is) + echte gebruikersdata
   + testdekking.
7. **Om Samen >=9 te maken:** een centraal scherm, een messaging-
   fundament, en echte, actieve gebruikersdata.
