const fs=require('fs'),vm=require('vm'),path=require('path');
const dir=__dirname,h=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const scripts=[...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
if(!scripts.length)throw Error('no inline scripts found');
scripts.forEach((s,i)=>{try{new vm.Script(s,{filename:'index-inline-'+i+'.js'})}catch(e){throw Error('INLINE SCRIPT '+i+' PARSE FAILURE: '+e.message)}});
for(const name of ['design-repository.js','design-engine-core.js','reference-diff.js','validation-engine.js','contract-exporter.js']){const s=fs.readFileSync(path.join(dir,name),'utf8');try{new vm.Script(s,{filename:name})}catch(e){throw Error('EXTERNAL SCRIPT '+name+' PARSE FAILURE: '+e.message)}}
for(const name of ['projects.registry.json','reference-inputs.registry.json','rules.seed.json','flows.scenarios.json','conflicts.registry.json','sources.registry.json','source-verification.snapshot.json','capability-maturity.registry.json']){try{JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))}catch(e){throw Error('JSON '+name+' PARSE FAILURE: '+e.message)}}
console.log('UX Lab syntax audit: PASS · '+scripts.length+' inline scripts · 5 external scripts · 8 runtime JSON files');
