# Trainingskompas — Development Contract

**Status:** ACTIVE
**Version:** 1.0
**Effective date:** 17 augustus 2026
**Scope:** ontwikkel- en releaseproces voor Trainingskompas / Maurice Training Coach

## 1. Doel

Dit contract sluit de ontwikkelketen tussen productbeslissing, AI-ondersteunde implementatie, GitHub, automatische kwaliteitscontrole, Netlify en live verificatie.

De repository blijft de technische source of truth. Een AI-rapport of mondelinge claim is nooit op zichzelf bewijs dat werk klaar is.

## 2. Rollen

### Product Owner — Maurice
- bepaalt productdoel, prioriteit en functionele acceptatie;
- geeft expliciet akkoord op scopewijzigingen en production-impacting beslissingen;
- is eindbeslisser bij productkeuzes.

### Architect / Reviewer / Orchestrator — ChatGPT
- vertaalt het doel naar een gecontroleerde implementatieopdracht;
- bewaakt architectuur, bestaande projectregels, regressies en roadmap;
- beoordeelt Claude's resultaat onafhankelijk;
- geeft GO, GO WITH FIXES of REJECT;
- formuleert bij afkeur de volgende concrete Claude-opdracht;
- verifieert waar mogelijk GitHub, tests, deployment en live gedrag.

### Implementatie-engineer — Claude
- inspecteert de bestaande code vóór wijziging;
- implementeert uitsluitend de afgesproken scope;
- voegt of wijzigt tests waar nodig;
- voert de afgesproken verificaties uit;
- rapporteert exact wat gewijzigd, getest en niet opgelost is;
- mag werk niet als definitief DONE verklaren zonder bewijs.

### GitHub
- source of truth voor code, history en change traceability;
- toekomstige feature/fix-werkzaamheden verlopen via branch + PR zodra de governance-gate is geactiveerd.

### Netlify
- deploymentplatform;
- preview wordt gebruikt voor verificatie vóór production wanneer de workflow dit ondersteunt;
- production is uitsluitend voor wijzigingen die de release-gates hebben doorlopen.

### Supabase
- source of truth voor persistente applicatiedata en backend-configuratie binnen de afgesproken architectuur;
- database/schema-wijzigingen zijn expliciet scopewerk en mogen niet stilzwijgend plaatsvinden.

## 3. Ontwikkellus

De standaardlus is:

1. Maurice bepaalt doel en prioriteit.
2. ChatGPT analyseert huidige toestand, scope, risico's en acceptatiecriteria.
3. ChatGPT maakt één concrete Claude-opdracht.
4. Claude inspecteert, implementeert en test.
5. Claude levert bewijs: branch/commit, gewijzigde bestanden, tests, build, deployment en bekende beperkingen.
6. GitHub vormt de traceerbare bron van de wijziging.
7. Automatische gates voeren technische controles uit zodra deze zijn ingericht.
8. Netlify Preview wordt gebruikt voor pre-production verificatie zodra de preview-keten is ingericht.
9. ChatGPT beoordeelt onafhankelijk.
10. Bij FAIL/FIX wordt één gerichte vervolgopdracht aan Claude gegeven.
11. Bij GO mag de wijziging door naar de volgende release-stap.
12. Production wordt daarna geverifieerd op daadwerkelijk gedrag, niet alleen op een succesvolle deploy.
13. De actuele toestand en relevante changelog worden bijgewerkt.

## 4. Claude-opdrachtcontract

Iedere niet-triviale implementatieopdracht bevat minimaal:

- TASK ID;
- doel;
- expliciete scope;
- expliciete non-scope;
- bestaande architectuurregels die behouden moeten blijven;
- acceptatiecriteria;
- verplichte tests/verificaties;
- release-/deploymentvoorwaarden indien relevant.

Claude rapporteert na uitvoering minimaal:

```text
TASK ID
STATUS
BRANCH
COMMIT
FILES CHANGED
TESTS RUN
TEST RESULTS
BUILD RESULT
DEPLOY RESULT
KNOWN ISSUES
REMAINING WORK
```

## 5. Geen zelfverklaarde DONE

`DONE` is geen status die Claude zelfstandig kan vaststellen.

Een wijziging is pas DONE nadat:

- de afgesproken scope is uitgevoerd;
- relevante tests groen zijn;
- regressiecontrole is uitgevoerd;
- build/release-gates groen zijn;
- deployment, indien relevant, succesvol is;
- ChatGPT de wijziging heeft beoordeeld;
- Maurice productmatig akkoord geeft wanneer expliciete productacceptatie nodig is.

## 6. Definition of Done

Een feature/fix kan maximaal deze gates doorlopen:

1. Requirements — PASS
2. Scope/non-scope — PASS
3. Implementation — PASS
4. Unit/logic tests — PASS
5. Regression — PASS
6. Architecture/integrity — PASS
7. Security/data impact — PASS
8. Build/release — PASS
9. Preview/deployment — PASS indien relevant
10. UX/live behaviour — PASS indien relevant
11. ChatGPT review — PASS
12. Product acceptance — PASS indien vereist

Niet elke wijziging vereist alle twaalf gates, maar een gate mag alleen worden overgeslagen als dat expliciet wordt gemotiveerd in het reviewresultaat.

## 7. Bestaande projectregels blijven leidend

Dit contract vervangt de bestaande productarchitectuur niet.

De bestaande projectcontext blijft leidend, waaronder:

- Governance-niveau B;
- geen onnodige enterprise-governance;
- geen ADR-/Health Check-/Dashboard-ceremonies tenzij later expliciet besloten;
- bestaande vanilla-JS PWA architectuur behouden;
- geen file-split of platformmigratie vóór de afgesproken fase;
- bestaande Calculation Engine / Decision Engine / Context Engine principes behouden;
- `CORE_SIG` en andere expliciet bevroren componenten mogen niet zonder expliciete scope worden gewijzigd;
- database/schema/data blijven ongewijzigd tenzij dit expliciet onderdeel van de opdracht is.

Dit contract is dus een **workflow-governance-laag**, geen aanleiding voor een architectuurmigratie.

## 8. Branch en production policy

Totdat de GitHub governance-gate formeel is ingericht, wordt de bestaande werkwijze niet stilzwijgend veranderd.

Na activering van de branch/PR-gate geldt:

```text
feature/fix branch
        ↓
Pull Request
        ↓
Automatische checks
        ↓
Review
        ↓
GO
        ↓
merge main
        ↓
Netlify
        ↓
live verification
```

Directe production-wijzigingen buiten deze keten zijn alleen toegestaan als expliciete nood-/hotfixprocedure wordt toegepast en vastgelegd.

## 9. Bewijs boven claims

Bij conflicterende signalen geldt de volgende prioriteit:

1. daadwerkelijk gedrag in de applicatie;
2. repository/code en commit history;
3. geautomatiseerde testresultaten;
4. deploymentstatus en deploy-commit;
5. AI-rapportage.

Een groen AI-rapport zonder overeenkomend technisch bewijs is onvoldoende.

## 10. Wijzigingen aan dit contract

Wijzigingen aan dit contract zijn zelf gecontroleerde projectwijzigingen en moeten via dezelfde reviewgedachte worden behandeld.

Het contract mag de bestaande productarchitectuur of beveiligingsregels niet stilzwijgend versoepelen.

---

**Einde Development Contract v1.0**
