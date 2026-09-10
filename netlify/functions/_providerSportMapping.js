// netlify/functions/_providerSportMapping.js
// Gedeelde, canonieke sport-mapping voor de self-serve cloud-providers
// (Polar/WHOOP/Oura) die elk vrije-tekst sporttypes leveren (in
// tegenstelling tot Google Health's vaste exerciseType-enum, die al een
// eigen, exacte-match canonical mapper heeft in
// core/cloudActivityIngestion.js -- dat blijft ongewijzigd, andere
// brondata-vorm).
//
// GEVONDEN TIJDENS DE FUNCTIONAL FREEZE AUDIT (canonical-aansluiting-pas):
// Polar/WHOOP/Oura hadden elk hun eigen, bijna-identieke inline kopie van
// exact deze functie -- drievoudige duplicatie zonder gedeelde bron van
// waarheid, met een reeel risico dat een toekomstige aanpassing in de ene
// kopie niet wordt doorgevoerd in de andere twee. Deze module is de ene,
// nieuwe bron van waarheid; de drie providers zijn aangepast om hem te
// gebruiken i.p.v. hun eigen kopie.
//
// TK's canonical sport-enum is bewust beperkt (activities_sport_check:
// uitsluitend running/cycling/rowing/swimming) -- niet-mapbare waarden
// geven bewust null, nooit een gok.
function mapProviderSportToCanonical(rawSport) {
  const s = String(rawSport || '').toLowerCase();
  if (s.includes('run')) return 'running';
  if (s.includes('bik') || s.includes('cycl') || s.includes('spin')) return 'cycling';
  if (s.includes('row')) return 'rowing';
  if (s.includes('swim')) return 'swimming';
  return null;
}

module.exports = { mapProviderSportToCanonical };
