const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
function ok(cond,msg){if(!cond)throw new Error(msg);}
ok(html.includes('id="governancePanel"'),'governance inspector must be addressable');
ok(html.includes('id="labPanel"'),'lab navigation must be addressable');
ok(html.includes('class="mobileDock"'),'mobile dock missing');
ok(html.includes("openMobilePanel('governance')"),'mobile governance trigger missing');
ok(html.includes("openMobilePanel('lab')"),'mobile lab trigger missing');
ok(html.includes('aria-controls="governancePanel"'),'governance trigger must expose aria-controls');
ok(html.includes('aria-controls="labPanel"'),'lab trigger must expose aria-controls');
ok(html.includes("e.key==='Escape'"),'Escape close behavior missing');
ok(!/@media\(max-width:1050px\)[\s\S]*?\.inspect\{display:none\}/.test(html),'governance inspector may not be hidden at tablet/mobile breakpoint');
ok(!/@media\(max-width:760px\)[\s\S]*?\.side\{display:none\}/.test(html),'lab navigation may not be hidden at mobile breakpoint');
for(const id of ['freezeGate','freezeBtn','exportBtn','contractOut']) ok(html.includes('id="'+id+'"'),id+' governance control missing');
console.log('UX Lab mobile governance UI gate: PASS');
