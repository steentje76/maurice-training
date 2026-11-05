#!/usr/bin/env node
/* Genereert het bronmanifest (docs/TK_LOKALE_BRONNEN_MANIFEST_20261019.md) uit core/localInventory.js, zodat document en
 * code niet uit elkaar kunnen lopen. Gebruik: node tools/inventory-manifest.js > docs/TK_LOKALE_BRONNEN_MANIFEST_20261019.md
 * Controle (CI/lokaal): node tools/inventory-manifest.js --check  → exit 1 als het document afwijkt. */
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../core/localInventory.js');
const DOC=path.join(__dirname,'..','docs','TK_LOKALE_BRONNEN_MANIFEST_20261019.md');
const UITLEG={
  duurzaam:'gebruikersgegevens; blokkeert tenzij per record gelijk aan een serverrij (alleen eigen trainingen)',
  concept:'lopend of onafgemaakt; staat per definitie niet (volledig) op de server; blokkeert',
  wachtrij:'nog niet verstuurde writes; blokkeert',
  serverkopie:'afgeleid van serverdata; herstel na de-installatie niet per veld bewezen; blokkeert',
  voorkeur:'persoonsgebonden keuze, niet op de server; blokkeert (verlies vraagt een PO-besluit)',
  legacy:'oude opslagstructuur; blokkeert',
  toestel:'toestelinstelling zonder persoonsgegevens; blokkeert niet',
  systeem:'techniek zonder gebruikersgegevens; blokkeert niet'
};
const EIG={cache:'tk_cache_owner_uid (laatste toesteleigenaar)',suffix:'uid in de sleutel',item:'owner_uid per item',geen:'n.v.t.',onbekend:'onbekend (geen eigenaar in de structuur)'};
function vorm(b){ return {array:'array: record per element',ids:'array van id\'s',map:'map: record per sleutel',object:'één record',tekst:'één waarde',geheim:'alleen aanwezigheid',wachtrij:'record per item',systeemdb:'database'}[b.vorm]||b.vorm; }
function identiteit(b){
  if(b.vorm==='array')return b.identiteit==='id'?'element.id (anders positie: gemarkeerd geen_id)':'positie in de lijst (instabiel)';
  if(b.vorm==='ids')return 'id-waarde';
  if(b.vorm==='map')return 'sleutel in de map';
  if(b.vorm==='wachtrij')return 'item-id (autoIncrement)';
  return 'opslagsleutel';
}
function verifieerbaar(b){
  if(b.serverTabel)return 'ja: '+b.serverTabel+(b.kindTabel?' + '+b.kindTabel:'')+' (identiteit + eigenaar + inhoud → HIST_GEKOPPELD)';
  if(b.categorie==='toestel'||b.categorie==='systeem')return 'n.v.t.';
  return 'nee';
}
function md(){
  const r=[];
  r.push('# Bronmanifest lokale gegevens (localinventory.v1)','');
  r.push('Gegenereerd uit `core/localInventory.js` met `node tools/inventory-manifest.js`. Niet met de hand bewerken.','');
  r.push('Elke opslagsleutel of database die niet in dit manifest staat, telt bij de inventarisatie als `HIST_ONBEKENDE_BRON` en blokkeert. `fLocalInventory` (I1) controleert dat elke sleutel die `index.html` schrijft, leest of wist hier staat.','');
  r.push('## Categorieën','');
  r.push('| Categorie | Betekenis |','|---|---|');
  Object.keys(UITLEG).forEach(k=>r.push('| '+k+' | '+UITLEG[k]+' |'));
  r.push('','## Bronnen','');
  r.push('| Id | Opslag | Sleutel / database | Categorie | Vorm | Recordidentiteit | Eigenaar | Versie | Server-verifieerbaar | Afhankelijk van | Omschrijving |');
  r.push('|---|---|---|---|---|---|---|---|---|---|---|');
  L.BRONNEN.forEach(b=>{
    const sl=b.sleutel?'`'+b.sleutel+'`':(b.prefix?'`'+b.prefix+'*`':'`'+b.database+'`');
    r.push(['',b.id,b.opslag,sl,b.categorie,vorm(b),identiteit(b),EIG[b.eigenaar]||b.eigenaar,b.versie||'',verifieerbaar(b),(b.afhankelijk||[]).map(x=>'`'+x+'`').join(', '),b.omschrijving,''].join(' | ').trim());
  });
  r.push('','## Uitleesbaarheid en datakwaliteit','');
  r.push('- JSON-bronnen die niet te parsen zijn of een onverwachte structuur hebben → `HIST_ONLEESBAAR`; de inventaris is dan onvolledig.');
  r.push('- Een onleesbare localStorage, sessionStorage of offline-wachtrij, of een ontbrekende `indexedDB.databases()` → onvolledig.');
  r.push('- Array-elementen zonder `id` krijgen een positie-identiteit en de reden `geen_id`.');
  r.push('- De inlogsessie (`tk_auth_session`) wordt nooit uitgelezen; alleen de aanwezigheid telt.');
  r.push('');
  return r.join('\n');
}
const uit=md();
if(process.argv.indexOf('--check')>=0){
  const huidig=fs.existsSync(DOC)?fs.readFileSync(DOC,'utf8').replace(/\r\n/g,'\n'):'';
  if(huidig!==uit){ console.error('Bronmanifest wijkt af van core/localInventory.js; genereer opnieuw.'); process.exit(1); }
  console.log('Bronmanifest actueel ('+L.BRONNEN.length+' bronnen).');
} else process.stdout.write(uit);
