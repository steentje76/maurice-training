const fs=require('fs'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8');
for(const s of ['id="directEditBar"','id="directStyleSheet"','toggleDirectStyleEditor()','renderDirectEditor()',"setSelectedVisualStyle('radius',this.value)","setSelectedVisualStyle('background',this.value)"])assert(html.includes(s),'missing '+s);
assert(html.includes("if(composerMode==='proposal'){renderDirectEditor();return}"),'proposal selection must stay in direct editor instead of opening governance');
assert(html.includes("bar.classList.toggle('on',on)"),'selected element direct bar binding missing');
console.log('DIRECT MANIPULATION V1 UI GATE PASS');
