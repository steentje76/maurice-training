/* DEV-UPDATE-03: uninstall instructions must not contradict fail-closed local-data protection. */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const doc=fs.readFileSync(path.join(root,'docs','ANDROID_PRAKTIJKTEST_V1_BETA.md'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let pass=0,fail=0;
function ok(v,msg){if(v)pass++;else{fail++;console.error('MISLUKT: '+msg);}}
ok(!/^\s*5\.\s*Verwijder de oude app/m.test(doc), 'no unconditional uninstall instruction in step 5');
ok(/HARD STOP/.test(doc)&&/NIET UITVOEREN/.test(doc), 'instructions unambiguously block device action without gates');
ok(/geen lokale blokkades gevonden/i.test(doc), 'acceptance refers to actual help text');
ok(!/E1[^\n]*Veilig om bij te werken/.test(doc), 'no obsolete green-light text in device checklist');
ok(/serverregistratie/.test(doc)&&/onderteken/i.test(doc)&&/gegevens/.test(doc), 'server, signing and local data are explicit prerequisites');
ok(/Geen lokale blokkades gevonden/.test(html)&&/geen toestemming om de huidige app te verwijderen/.test(html),'UI itself must never approve uninstall');
console.log('fAndroidUninstallInstructionsSafety: '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
