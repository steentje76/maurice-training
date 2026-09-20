const fs=require('fs'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8');
for(const s of ['Start hier:','＋ Mock-up','✦ Ontwerpen','1 · Referentie','2 · Ontwerp','3 · Indeling','4 · Stijl','document.getElementById(\'mockupUpload\').click()',"setComposerMode('proposal')"])assert(html.includes(s),'missing '+s);
assert(/@media\(max-width:760px\)[\s\S]*#visualStudio\{order:-5/.test(html),'mobile Visual Studio priority missing');
assert(html.includes('Bewerk het scherm visueel zonder code.'),'clear workspace purpose missing');
console.log('VISUAL STUDIO WORKSPACE V1 UI GATE PASS');
