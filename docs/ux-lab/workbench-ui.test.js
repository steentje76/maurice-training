const fs=require('fs');const h=fs.readFileSync(__dirname+'/index.html','utf8');require('./test-version').requireUxLabVersion(h,2,4);function ok(x,m){if(!x)throw Error(m)}
for(const v of ['flows','screens','scenarios','rules','components','conflicts']){ok(h.includes('data-view="'+v+'"'),v+' nav missing');ok(h.includes(v+':['),v+' catalog missing')}
ok(h.includes('id="workspace"'),'workspace missing');ok(h.includes('function setLabView'),'view switching missing');ok(h.includes('function renderWorkspace'),'workspace renderer missing');
for(const id of ['FLOW-TRAIN-001','SCREEN-TRAIN-001','SCREEN-TRAIN-002','SCREEN-TRAIN-003','UX-PRES-001','ROUTE-R006','COMP-CTA-PRIMARY','CONFLICT-CTA-001'])ok(h.includes(id),id+' missing');
ok(/read-only; canonical bronnen blijven source of truth\./i.test(h),'source-of-truth guard missing');
console.log('UX Lab v2.4 workbench gate: PASS');