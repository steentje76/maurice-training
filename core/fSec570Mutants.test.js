/* SEC-570 mutatiecontrole: elke nieuwe eigenaarscontrole uit het herstel van SEC-570-01/02 wordt afzonderlijk
 * uitgeschakeld (of teruggezet naar de oude, coërcerende vorm) in een tijdelijke kopie van de modules. De
 * herstelsuite (fSec570Herstel.test.js) MOET dan falen. Een mutant waarvan de doeltekst niet (exact één keer) wordt
 * gevonden, telt als fout: zo kan deze controle niet stil groen worden als de code verandert. De echte bestanden in
 * core/ worden niet aangeraakt. */
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const MODULES=['serverVerification.js','localBackup.js','localInventory.js'];
const SUITE='fSec570Herstel.test.js';
const MUTANTS=[
  ['M1 lokale eigenaarscontrole verifyRecord uit','serverVerification.js',
    'if (eigenaarVeld !== null && v[eigenaarVeld] !== undefined && component(v[eigenaarVeld]) !== eigenaar) {','if (false) {'],
  ['M2 server-eigenaar terug naar String()-coërcie','serverVerification.js',
    'component(s[eigenaarVeld]) !== basis.owner_uid','(leeg(s[eigenaarVeld]) || String(s[eigenaarVeld]) !== basis.owner_uid)'],
  ['M3 opgegeven eigenaar terug naar String()-coërcie','serverVerification.js',
    'var eigenaar = component(i.eigenaar);','var eigenaar = i.eigenaar ? String(i.eigenaar) : null;'],
  ['M4 consistentiecontrole bewijs in beoordeelRegister uit','serverVerification.js',
    'return consistent ? STATUS.SERVER_VERIFIED : STATUS.UNKNOWN;','return STATUS.SERVER_VERIFIED;'],
  ['M5 identiteitscomponenten terug naar String()-coërcie','serverVerification.js',
    'function component(x) {','function component(x) { if (x !== null && x !== undefined && x !== \'\') return String(x);'],
  ['M6 tekstwaarden in wachtrijpayload niet meer gecontroleerd','localBackup.js',
    'function tekstEigenaar(s,owner,depth){','function tekstEigenaar(s,owner,depth){ return null;'],
  ['M7 ongeldige JSON die een eigenaar noemt toegestaan','localBackup.js',
    'catch(_){if(NOEMT_EIGENAAR.test(decoded))return ONVERIFIEERBAAR;}','catch(_){ return null; }'],
  ['M8 controle op type body/args/filter uit','localBackup.js',
    "{omissions.push({source:'offline_queue',reason:'unexpected_payload_type'});continue;}",'{}'],
  ['M9 eigenaarsveld terug naar String()-coërcie','localBackup.js',
    'if(x!=null&&x!==owner)return ANDERE;','if(x!=null&&String(x)!==owner)return ANDERE;'],
  ['M10 filter-eigenaar niet meer vergeleken','localBackup.js',
    "if(w!=='eq.'+owner)return ANDERE; continue;",'continue;'],
  ['M11 eigenaarskolom elders in filter toegestaan','localBackup.js',
    'if(NOEMT_EIGENAAR.test(k)||NOEMT_EIGENAAR.test(w))return ONVERIFIEERBAAR;',''],
  ['M12 sleutel die een eigenaarskolom noemt toegestaan','localBackup.js',
    "if(NOEMT_EIGENAAR.test(k)&&x!=null&&typeof x!=='object'&&x!==owner)return ONVERIFIEERBAAR;",''],
  ['M13 eigenaarskolom hoofdlettergevoelig','localBackup.js',
    'const EIGENAAR_SLEUTEL=/^(user_id|owner_uid|p_user_id)$/i;','const EIGENAAR_SLEUTEL=/^(user_id|owner_uid|p_user_id)$/;'],
  ['M14 te diepe nesting niet meer conservatief','localBackup.js',
    'if(depth>25)return ONVERIFIEERBAAR;','if(depth>25)return null;']
];
let n=0;
const check=(ok,label)=>{ assert(ok,label); n++; console.log('PASS',label); };
function kopie(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tk-sec570-'));
  for(const f of MODULES.concat([SUITE]))fs.copyFileSync(path.join(__dirname,f),path.join(dir,f));
  return dir;
}
function draai(dir){ const r=spawnSync(process.execPath,[path.join(dir,SUITE)],{cwd:dir,encoding:'utf8',timeout:240000,env:Object.assign({},process.env,{TK_RED:''})}); return r.status; }
// Controle zonder mutant: de suite moet in de kopie slagen, anders bewijst een falende mutant niets.
{ const dir=kopie(); try{ check(draai(dir)===0,'M0 ongemuteerde kopie: herstelsuite slaagt'); }finally{ fs.rmSync(dir,{recursive:true,force:true}); } }
for(const [naam,bestand,van,naar] of MUTANTS){
  const dir=kopie();
  try{
    const p=path.join(dir,bestand), src=fs.readFileSync(p,'utf8');
    const aantal=src.split(van).length-1;
    assert(aantal===1,naam+': doeltekst '+aantal+'× gevonden (verwacht exact 1) — mutant niet toepasbaar');
    fs.writeFileSync(p,src.replace(van,naar));
    check(draai(dir)!==0,naam+' → herstelsuite faalt (mutant gedood)');
  }finally{ fs.rmSync(dir,{recursive:true,force:true}); }
}
console.log('SEC-570 mutanten: '+n+'/'+n);
