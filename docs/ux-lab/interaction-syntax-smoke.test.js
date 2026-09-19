const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(__dirname+'/index.html','utf8');
const attrs=[...h.matchAll(/\bon(?:click|change|input|keydown|submit)=(["'])([^"']*(?:(?:&quot;|&#39;)[^"']*)*)\1/g)].map(m=>m[2].replaceAll('&quot;','"').replaceAll('&#39;',"'"));
if(!attrs.length)throw Error('no inline interaction handlers found');
attrs.forEach((code,i)=>{try{new vm.Script('(function(event){'+code+'})',{filename:'handler-'+i+'.js'})}catch(e){throw Error('INLINE HANDLER '+i+' PARSE FAILURE: '+e.message+' :: '+code)}});
for(const required of ["openDesignProject('trainingskompas')","showProjectHome()","openMobilePanel('lab')","openMobilePanel('governance')"]){if(!h.includes(required))throw Error('required interaction missing: '+required)}
if(!/function openDesignProject\(id\)[\s\S]*classList\.add\('hidden'\)[\s\S]*render\(\)/.test(h))throw Error('project launcher must hide Project Home and render workspace');
console.log('UX Lab interaction syntax smoke: PASS · '+attrs.length+' handlers parsed');
