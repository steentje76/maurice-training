/* TK-REL-SEC-34 — MIME-/extensiecontract tussen native export en importkiezer (20-10-2026).
 * Bewezen defect (fysieke test, Galaxy A70, Android 11): het met ACTION_CREATE_DOCUMENT als application/octet-stream
 * opgeslagen .tkbackup-bestand was in de importkiezer (ACTION_GET_CONTENT, application/json) uitgeschakeld.
 * Oorzaak: Capacitor 6 BridgeWebChromeClient.getValidTypes() zet accept-items om naar MIME-typen; een extensie zonder
 * bekend MIME-type in MimeTypeMap (.tkbackup) valt weg. accept=".tkbackup,application/json" werd zo alleen
 * application/json.
 *  M1 de vertaling van Capacitor (getValidTypes + showFilePicker) is in node_modules ongewijzigd (anders is M2–M4 niet
 *     representatief);
 *  M2 de oude accept-lijst laat het exporttype NIET toe (reproductie van het defect);
 *  M3 beide bestandsinvoeren van de app laten het native exporttype toe; de JSON-export van oudere webkopieën blijft
 *     selecteerbaar;
 *  M4 één expliciet contract: alleen .tkbackup, application/octet-stream en application/json; geen wildcard;
 *  M5 het native exporttype is application/octet-stream (naam ".tkbackup" blijft intact) en komt overeen met het contract;
 *  M6 MIME en extensie keuren niets goed: een geldig versleuteld bestand met een andere naam of een ander type wordt
 *     gelezen, een ".tkbackup" met onzin wordt geweigerd. */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {webcrypto}=require('crypto');
let n=0; const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const ROOT=path.join(__dirname,'..');
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const CAP=path.join(ROOT,'node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java');
const PLUGIN=fs.readFileSync(path.join(ROOT,'android/app/src/main/java/com/trainingskompas/app/TkBestandOpslaanPlugin.java'),'utf8');
// Android MimeTypeMap: json is bekend, tkbackup niet (geen registratie in libcore/mime.types).
const MIME_TYPE_MAP={json:'application/json',txt:'text/plain',bin:'application/octet-stream'};
// Getrouwe port van Capacitor 6 getValidTypes() en de typekeuze in showFilePicker().
function kiezer(accept){
  const types=accept.split(',').map(s=>s.trim().toLowerCase()); // WebView levert accept-items zo aan FileChooserParams
  const geldig=[];
  types.forEach(t=>{ if(t.startsWith('.')){ const m=MIME_TYPE_MAP[t.slice(1)]; if(m&&geldig.indexOf(m)<0)geldig.push(m); } else if(geldig.indexOf(t)<0)geldig.push(t); });
  // createIntent(): type = eerste accept-item; meerdere items of een extensie → EXTRA_MIME_TYPES = geldig, type = geldig[0]
  return {type:types.length>1||types[0].startsWith('.')?geldig[0]:types[0],extraMimeTypes:(types.length>1||types[0].startsWith('.'))?geldig:null};
}
const selecteerbaar=(k,mime)=>(k.extraMimeTypes||[k.type]).some(t=>t==='*/*'||t===mime||(t.endsWith('/*')&&mime.startsWith(t.slice(0,-1))));
const acceptVan=id=>{ const m=HTML.match(new RegExp('<input id="'+id+'"[^>]*accept="([^"]*)"')); return m?m[1]:null; };

(async()=>{
  // M1
  const cap=fs.existsSync(CAP)?fs.readFileSync(CAP,'utf8'):'';
  check(/String extensionMime = mtm\.getMimeTypeFromExtension\(extension\);\s*if \(extensionMime != null && !validTypes\.contains\(extensionMime\)\)/.test(cap)&&
    /intent\.putExtra\(Intent\.EXTRA_MIME_TYPES, validTypes\);/.test(cap)&&/intent\.setType\(validTypes\[0\]\);/.test(cap),'M1 Capacitor 6 getValidTypes/showFilePicker ongewijzigd (onbekende extensie valt weg)');
  // M2
  const oud=kiezer('.tkbackup,application/json');
  check(oud.type==='application/json'&&oud.extraMimeTypes.join()==='application/json'&&!selecteerbaar(oud,'application/octet-stream'),'M2 oude accept-lijst → alleen application/json: native export (octet-stream) uitgeschakeld (reproductie van het defect)');
  // M3
  const exportMime=(PLUGIN.match(/EXPORT_MIME = "([^"]+)"/)||[])[1]||(PLUGIN.match(/setType\("([^"]+)"\)/)||[])[1];
  for(const id of ['tk-restore-file','tk-backup-file']){
    const k=kiezer(acceptVan(id)||'');
    check(selecteerbaar(k,exportMime)&&selecteerbaar(k,'application/octet-stream'),'M3 '+id+': native export ('+exportMime+') selecteerbaar in de Android-kiezer');
    check(selecteerbaar(k,'application/json'),'M3 '+id+': kopie met type application/json (browserdownload) blijft selecteerbaar'); }
  // M4
  for(const id of ['tk-restore-file','tk-backup-file']){
    const a=(acceptVan(id)||'').split(',').map(s=>s.trim()).sort().join(',');
    check(a==='.tkbackup,application/json,application/octet-stream','M4 '+id+': exact contract (.tkbackup, application/octet-stream, application/json), geen wildcard'); }
  // M5
  check(exportMime==='application/octet-stream'&&/intent\.setType\(EXPORT_MIME\)/.test(PLUGIN)&&!/setType\("application\/json"\)/.test(PLUGIN),'M5 native export gebruikt application/octet-stream (naam .tkbackup intact), via één constante');
  // M6
  const B=require('./localBackup'), M=require('./localInventory');
  const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', PASS='een lange wachtzin voor test';
  const env=await B.encrypt(B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{tk_coach_style:'kort'},queue:[]}),PASS,webcrypto);
  const r=await B.inspect(JSON.parse(JSON.stringify(env)),PASS,webcrypto);
  check(r.owner===A,'M6 geldig versleuteld bestand wordt op inhoud gelezen, los van naam of MIME-type');
  let geweigerd=false; try{ await B.inspect(JSON.parse('{"format":"tk-local-rescue-encrypted.v1"}'),PASS,webcrypto); }catch(_){ geweigerd=true; }
  check(geweigerd,'M6 ".tkbackup" met ongeldige inhoud → geweigerd (extensie keurt niets goed)');
  console.log('TK-REL-SEC-34: '+n+'/'+n);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
