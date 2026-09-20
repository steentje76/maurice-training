const fs=require('fs'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8');
for(const s of ['id="studioModeDesign"','id="studioModeAudit"','id="auditSecondary"',"setStudioWorkspace('design')","setStudioWorkspace('audit')",'.auditSecondary{display:none}',".auditSecondary.on{display:block}"])assert(html.includes(s),'missing '+s);
assert(html.indexOf('id="visualStudio"')<html.indexOf('id="auditSecondary"'),'Visual Studio must remain primary before audit content');
for(const id of ['id="workspace"','id="sourceHealth"','id="stateExplorer"','id="evidence"'])assert(html.indexOf(id)>html.indexOf('id="auditSecondary"'),id+' must be secondary audit content');
console.log('STUDIO SHELL V1 UI GATE PASS');
