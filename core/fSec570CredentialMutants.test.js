/* SEC-570-03 mutatiecontrole: elke nieuwe credentialbescherming in core/localBackup.js wordt afzonderlijk
 * uitgeschakeld in een tijdelijke kopie van de modules; fSec570CredentialHerstel.test.js MOET dan falen. Een mutant
 * waarvan de doeltekst niet exact één keer voorkomt, laat deze controle falen (geen stil groen bij codewijziging).
 * De echte bestanden in core/ worden niet aangeraakt. */
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const MODULES=['localBackup.js','localInventory.js'];
const SUITE='fSec570CredentialHerstel.test.js';
const MUTANTS=[
  ['N1 credentialcontrole localStorage-pad uit',
    'if(geheimL){omissions.push({source:m.id,reason:geheimL});continue;}',''],
  ['N2 credentialcontrole wachtrijpad uit',
    "if(geheimQ){omissions.push({source:'offline_queue',reason:geheimQ});continue;}",''],
  ['N3 tekstpatronen (sleutel/bron/Bearer) uit',
    'if(TEKST_GEHEIM.some(r=>r.test(s))||bevatJwt(s))return true;','if(bevatJwt(s))return true;'],
  ['N4 JSON-tekst niet meer geparsed en doorzocht',
    'return geheimIn(p,st,depth+1,true);','return null;'],
  ['N5 credentialachtige objectsleutels toegestaan',
    'if(BAD_KEY.test(k)||BAD_SOURCE.test(k))return inTekst?IN_TEKST:CRED;',''],
  ['N6 escapes vóór/na een sleutel niet meer herkend',
    "'(?:^|[^A-Za-z0-9_])\\\\\\\\{0,8}[\"\\']?(?:'+GEHEIM_SLEUTELS+')\\\\\\\\{0,8}[\"\\']?\\\\s{0,8}[:=]'",
    "'(?:^|[^A-Za-z0-9_])[\"\\']?(?:'+GEHEIM_SLEUTELS+')[\"\\']?\\\\s{0,8}[:=]'"],
  ['N7 percent-codering niet meer gedecodeerd',
    'if(/%[0-9A-Fa-f]{2}/.test(s)){','if(false){'],
  ['N8 ongeldige JSON met \\u-escapes toegestaan',
    'return /\\\\u[0-9A-Fa-f]{4}/.test(t)?NIET_TE_CONTROLEREN:null;','return null;'],
  ['N9 totaalbudget tekstscan uit',
    '||(st.scan=(st.scan||0)+v.length)>MAX_SCAN',''],
  ['N10 dieptegrens credentialscan uit',
    'if(depth>25)return NIET_TE_CONTROLEREN;','if(depth>25)return null;'],
  ['N11 RPC-functienaam niet meer gecontroleerd',
    "if(k==='function'&&typeof x==='string'&&BAD_SOURCE.test(x))return CRED;",''],
  ['N12 geneste credentialtabel toegestaan',
    "if(k==='table'&&typeof x==='string'&&CREDENTIAL_TABELLEN.indexOf(x)>=0)return inTekst?IN_TEKST:CRED;",''],
  ['N13 JWT-detectie uit',
    "if(d[i].length>=8&&d[i].indexOf('eyJ')>=0&&d[i+1].length>=8&&d[i+2].length>=8)return true;",''],
  ['N14 Bearer-detectie uit',
    'const TEKST_GEHEIM=[TEKST_SLEUTEL,TEKST_BRON,TEKST_BEARER];','const TEKST_GEHEIM=[TEKST_SLEUTEL,TEKST_BRON];'],
  ['N15 credentialachtige sleutel in vrije tekst (BAD_SOURCE) toegestaan',
    'const TEKST_GEHEIM=[TEKST_SLEUTEL,TEKST_BRON,TEKST_BEARER];','const TEKST_GEHEIM=[TEKST_SLEUTEL,TEKST_BEARER];']
];
let n=0;
const check=(ok,label)=>{ assert(ok,label); n++; console.log('PASS',label); };
function kopie(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tk-sec57003-'));
  for(const f of MODULES.concat([SUITE]))fs.copyFileSync(path.join(__dirname,f),path.join(dir,f));
  return dir;
}
function draai(dir){ const r=spawnSync(process.execPath,[path.join(dir,SUITE)],{cwd:dir,encoding:'utf8',timeout:240000,env:Object.assign({},process.env,{TK_RED:''})}); return r.status; }
{ const dir=kopie(); try{ check(draai(dir)===0,'N0 ongemuteerde kopie: herstelsuite slaagt'); }finally{ fs.rmSync(dir,{recursive:true,force:true}); } }
for(const [naam,van,naar] of MUTANTS){
  const dir=kopie();
  try{
    const p=path.join(dir,'localBackup.js'), src=fs.readFileSync(p,'utf8');
    const aantal=src.split(van).length-1;
    assert(aantal===1,naam+': doeltekst '+aantal+'× gevonden (verwacht exact 1) — mutant niet toepasbaar');
    fs.writeFileSync(p,src.split(van).join(naar));
    check(draai(dir)!==0,naam+' → herstelsuite faalt (mutant gedood)');
  }finally{ fs.rmSync(dir,{recursive:true,force:true}); }
}
console.log('SEC-570-03 mutanten: '+n+'/'+n);
