/* TK-REL-SEC-34 heracceptatie — tweede geïsoleerde Android-testvariant "exportproefmime" (20-10-2026).
 * Doel: de fysieke heracceptatie van het MIME-herstel op een schone, aparte installatie, zonder dat de bestaande
 * pakketten com.trainingskompas.app en com.trainingskompas.app.exportproef gewijzigd, vervangen of gewist worden.
 *  V1 basis-applicationId en namespace ongewijzigd (com.trainingskompas.app);
 *  V2 de bestaande variant exportproef is ongewijzigd (suffix, initWith debug, geen eigen ondertekening);
 *  V3 de nieuwe variant: applicationIdSuffix ".exportproefmime", versionNameSuffix "-exportproefmime", initWith debug,
 *     geen signingConfig en geen verwijzing naar release; er komt geen nieuwe signingConfig bij;
 *  V4 eigen label "TK MIME-proef" via de bronset src/exportproefmime; de hoofdlabels blijven "Trainingskompas";
 *     de bronset voegt geen manifest, code of andere resources toe (dus geen extra rechten of gedrag);
 *  V5 CI bouwt de variant in een aparte job uit de PR-head-commit, controleert pakketnaam, label, opslagrechten,
 *     debugondertekening en het verpakte MIME-contract, en levert een eigen artifact; de bestaande job is ongewijzigd;
 *  V6 geen sleutels of geheimen in de workflow;
 *  V7 mutaties op de controles worden gevangen. */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
let n=0; const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const ROOT=path.join(__dirname,'..');
const lees=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const GR=lees('android/app/build.gradle');
const WF=lees('.github/workflows/tk-android-export-proef.yml');
const SET='android/app/src/exportproefmime';

function blok(gr,naam){ const m=gr.match(new RegExp('\\n\\s*'+naam+'\\s*\\{([^}]*)\\}')); return m?m[1]:null; }
function gradleOk(gr){
  const mime=blok(gr,'exportproefmime')||'', oud=blok(gr,'exportproef')||'', sc=(gr.match(/signingConfigs\s*\{([\s\S]*?)\n    \}/)||[])[1]||'';
  return {
    v1:/namespace "com\.trainingskompas\.app"\n/.test(gr)&&/\n\s*applicationId "com\.trainingskompas\.app"\n/.test(gr),
    v2:/applicationIdSuffix "\.exportproef"\n/.test(oud)&&/versionNameSuffix "-exportproef"\n/.test(oud)&&/initWith debug/.test(oud)&&!/signingConfig|release/.test(oud),
    v3:/applicationIdSuffix "\.exportproefmime"\n/.test(mime)&&/versionNameSuffix "-exportproefmime"\n/.test(mime)&&/initWith debug/.test(mime)
       &&/matchingFallbacks = \['debug'\]/.test(mime)&&!/signingConfig|release|applicationId "/.test(mime)
       &&/^\s*release \{/.test(sc)&&(sc.match(/^\s{8}\w+ \{/gm)||[]).length===1,
  };
}
function workflowOk(wf){
  const i=wf.indexOf('\n  exportproefmime-apk:'), job=i<0?'':wf.slice(i), voor=i<0?wf:wf.slice(0,i);
  return {
    job:i>=0&&/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/.test(job)&&/assembleExportproefmime/.test(job),
    pakket:/grep -q "\^package: name='com\.trainingskompas\.app\.exportproefmime' "/.test(job)&&/pakketnaam valt samen met een bestaand pakket/.test(job),
    label:/application-label:'TK MIME-proef'/.test(job),
    rechten:/WRITE_EXTERNAL_STORAGE\|READ_EXTERNAL_STORAGE\|MANAGE_EXTERNAL_STORAGE\|READ_MEDIA_/.test(job)&&/diff <\(/.test(job),
    sign:/apksigner" verify --verbose --print-certs/.test(job)&&/grep -q "CN=Android Debug"/.test(job),
    mime:/accept="\\\.tkbackup,application\/octet-stream,application\/json"/.test(job)&&/TkBestandOpslaanPlugin/.test(job),
    artifact:/name: trainingskompas-exportproefmime-apk/.test(job)&&/sha256sum/.test(job)&&/commit=\$COMMIT/.test(job),
    bestaand:/:app:assembleExportproef --no-daemon/.test(voor)&&/name: trainingskompas-exportproef-apk/.test(voor)&&/package: name='com\.trainingskompas\.app\.exportproef'/.test(voor),
    geheim:!/secrets\.|TK_KEYSTORE|TK_KEY_|storePassword|keystore\.properties/.test(wf),
  };
}

const g=gradleOk(GR);
check(g.v1,'V1 basis-applicationId en namespace com.trainingskompas.app ongewijzigd');
check(g.v2,'V2 bestaande variant exportproef ongewijzigd (.exportproef, -exportproef, initWith debug, geen eigen ondertekening)');
check(g.v3,'V3 nieuwe variant exportproefmime: eigen suffix, initWith debug, geen signingConfig/release; geen nieuwe signingConfig');

const strs=lees(SET+'/res/values/strings.xml'), main=lees('android/app/src/main/res/values/strings.xml');
const namen=[...strs.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g)].map(m=>m[1]+'='+m[2]).sort();
check(JSON.stringify(namen)===JSON.stringify(['app_name=TK MIME-proef','title_activity_main=TK MIME-proef']),'V4 eigen label "TK MIME-proef" (app_name, title_activity_main), niets anders overschreven');
check(/<string name="app_name">Trainingskompas<\/string>/.test(main)&&/<string name="package_name">com\.trainingskompas\.app<\/string>/.test(main),'V4 hoofdlabels en package_name in src/main ongewijzigd');
const bestanden=[]; (function loop(d){ for(const f of fs.readdirSync(path.join(ROOT,d))){ const p=d+'/'+f; fs.statSync(path.join(ROOT,p)).isDirectory()?loop(p):bestanden.push(p);} })(SET);
check(JSON.stringify(bestanden)===JSON.stringify([SET+'/res/values/strings.xml']),'V4 bronset bevat alleen strings.xml: geen manifest, code of rechten');

const w=workflowOk(WF);
check(w.job,'V5 aparte CI-job bouwt assembleExportproefmime uit de exacte PR-head-commit');
check(w.pakket&&w.label,'V5 CI controleert exacte pakketnaam (nooit een bestaand pakket) en label TK MIME-proef');
check(w.rechten&&w.sign,'V5 CI controleert opslagrechten (geen algemene, gelijk aan exportproef) en debugondertekening');
check(w.mime,'V5 CI controleert het verpakte MIME-contract en de exportplugin in de APK');
check(w.artifact,'V5 eigen artifact trainingskompas-exportproefmime-apk met SHA-256 en broncommit');
check(w.bestaand,'V5 bestaande exportproef-job en -artifact ongewijzigd');
check(w.geheim,'V6 geen sleutels of geheimen in de workflow');

// V7 mutaties: elke afwijking moet een controle laten falen.
const mut=[
  ['suffix gelijk aan exportproef', ()=>!gradleOk(GR.replace('applicationIdSuffix ".exportproefmime"','applicationIdSuffix ".exportproef"')).v3],
  ['geen suffix (zou com.trainingskompas.app overschrijven)', ()=>!gradleOk(GR.replace('            applicationIdSuffix ".exportproefmime"\n','')).v3],
  ['release-ondertekening op de variant', ()=>!gradleOk(GR.replace('versionNameSuffix "-exportproefmime"','versionNameSuffix "-exportproefmime"\n            signingConfig signingConfigs.release')).v3],
  ['extra signingConfig', ()=>!gradleOk(GR.replace('    signingConfigs {\n','    signingConfigs {\n        proef {\n        }\n')).v3],
  ['basis-applicationId gewijzigd', ()=>!gradleOk(GR.replace('applicationId "com.trainingskompas.app"','applicationId "com.trainingskompas.app2"')).v1],
  ['exportproef gewijzigd', ()=>!gradleOk(GR.replace('applicationIdSuffix ".exportproef"\n','applicationIdSuffix ".exportproef2"\n')).v2],
  ['labelcontrole weg', ()=>!workflowOk(WF.replace("application-label:'TK MIME-proef'","application-label:'X'")).label],
  ['merge-commit i.p.v. head', ()=>!workflowOk(WF.replace('ref: ${{ github.event.pull_request.head.sha || github.sha }}','ref: ${{ github.sha }}')).job],
  ['geheim in workflow', ()=>!workflowOk(WF+'\n        env:\n          X: ${{ secrets.TK_KEYSTORE_PASSWORD }}\n').geheim],
];
let gedood=0; for(const [naam,f] of mut){ if(f()) gedood++; else console.log('OVERLEEFD',naam); }
check(gedood===mut.length,'V7 mutaties gedood: '+gedood+'/'+mut.length);
console.log('TK-REL-SEC-34 exportproefmime: '+n+'/'+n);
