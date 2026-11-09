# TK614 — publieke Ed25519-eigenaarssleutel (9 november 2026)

**Status:** eigenaarssleutel lokaal gegenereerd; **alleen publieke sleutelvingerafdruk als security-pin voorbereid** op de aparte Draft PR. **Geen ACTIVATE-besluit ondertekend**, geen productiewijziging, geen mediarechten en geen APK.

## Identiteit en bron

- Algoritme: Ed25519.
- Public-key-encoding: DER SubjectPublicKeyInfo (SPKI).
- Gepinde waarde: SHA-256 over de exacte publieke SPKI-DER-bytes, hex lowercase:
  `9a4e3f7ee3cab1792fcc00efca3992c10bb251c0840f47c0a0a224106f280c63`
- Bijbehorende fase-B besluitcontext: `TK614-OWNER-REVIEW226-20261109-BULK01`, scope 226 originele MoveKit-oefeningen voor **uitsluitend FK-identiteit / trainingsregistratie**.
- De privésleutel wordt **niet** opgenomen in Git of de applicatie. Deze is op de geautoriseerde Windows-desktop gegenereerd, **uitsluitend DPAPI CurrentUser-versleuteld op schijf** en afgeschermd met een ACL voor de aangemelde gebruiker en Windows SYSTEM. De private key is niet als plaintextbestand weggeschreven.
- Het lokale toolprogramma heeft twee afzonderlijke verificaties uitgevoerd: DPAPI-decryptie in procesgeheugen, vergelijking met de bijbehorende publieke sleutel, een synthetische testhandtekening en Ed25519-verificatie. De synthetische challenge is **geen** release/approval.

## Verplichte resterende poorten

1. Een onafhankelijke reviewer controleert de publieke vingerafdruk en de codewijziging in het aparte concept-PR.
2. Voor **fase B** is alsnog een expliciet **afzonderlijk** activatiebesluit vereist met *actuele*, aan de database gebonden fingerprint; prior decision `TK614-OWNER-STAGE-20261108-CHAT02`; alle zes gates `ACCEPTED`; een verse, door de eigenaar werkelijk ondertekende Ed25519-signatuur.
3. De databasebeheerder verifieert de echte Auth-/RLS-twee-accountacceptatie, rollback/backup en volledige Android read-after-write/offline-herstart voor alle relevante catalogus-ID's.
4. Het actuele mediabereik (15 batches, ID 227–582, 1.164 entries) mag niet veranderen; geen extra grants of openbare ruwe video-/posterbestanden.
5. **Geen productieactivatie** volgt automatisch uit het toevoegen van een fingerprint. De functionele signatuurverificatie blijft verplicht in `verifyApproval()`/`verifySignature()`.

## Beheer, herstel en risico

Windows DPAPI CurrentUser bindt de sleutel aan het Windows-profiel. Bij verlies van de computer of het profiel kan de sleutel zonder onafhankelijk beveiligde herstelkopie **onbruikbaar worden**. Een herstel-/rotatieprocedure en eventuele offline back-up vereisen een afzonderlijke eigenaarbeslissing. Bewaar nooit privésleutelmateriaal, ontsleutelde PEM/DER, herstelgeheimen of de DPAPI-bestandsinhoud in GitHub, logs of chat.

Bij sleutelcompromittering: voorkom nieuwe ondertekeningen, volg sleutelintrekking/rotatie via een afzonderlijke gecontroleerde wijziging en accepteer geen bestaande handtekeningen zonder release-audit en statuscontrole.
