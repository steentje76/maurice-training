'use strict';
const P = require('./productTelemetry.js');
let pass=0,fail=0;
function ok(v,m){if(v){pass++;}else{fail++;console.error('FAIL: '+m);}}
function reject(id,p,c,needle){const r=P.buildEvent(id,p,c||{});ok(!r.ok&&r.errors.some(e=>e.indexOf(needle)===0),needle);}
ok(P.VERSION==='product_event.v1','contract version');
ok(Object.keys(P.REGISTRY).length===5,'minimal registry has exactly five events');
for(const id of Object.keys(P.REGISTRY)){const r=P.buildEvent(id,{}, {now:()=> '2026-09-28T20:00:00.000Z',app_version:'v4.70.4',environment:'test',platform:'web'});ok(r.ok,id+' builds');ok(r.event.event===id,id+' stable id');}
reject('training.unknown',{}, {},'UNREGISTERED_EVENT');
reject('training.opened',{anything:'x'}, {},'UNKNOWN_PROPERTY');
reject('training.opened',{hrv:42}, {},'FORBIDDEN_PROPERTY');
reject('training.opened',{bodyweight:80}, {},'FORBIDDEN_PROPERTY');
reject('training.opened',{exercise_id:'x'}, {},'FORBIDDEN_PROPERTY');
reject('training.opened',{raw_url:'https://x?a=b'}, {},'FORBIDDEN_PROPERTY');
reject('training.opened',{prompt:'secret'}, {},'FORBIDDEN_PROPERTY');
reject('training.previewed',{source_type:'other'}, {},'INVALID_VALUE');
ok(P.buildEvent('training.previewed',{source_type:'builder'},{}).ok,'registered enum accepted');
reject('training.opened',{route_id:'training?user=1'}, {},'INVALID_ROUTE_ID');
ok(P.buildEvent('training.opened',{route_id:'training_home'},{}).ok,'canonical route accepted');
reject('training.opened',{correlation_id:{x:1}}, {},'NON_SCALAR_PROPERTY');
reject('training.opened',{}, {environment:'prod'},'INVALID_ENVIRONMENT');
reject('training.opened',{}, {platform:'watch'},'INVALID_PLATFORM');
const input={source_type:'program'};const built=P.buildEvent('training.workout.started',input,{app_version:'vX',environment:'production',platform:'android'});ok(built.ok,'valid event');ok(built.event.source_type==='program','allowed prop copied');ok(!('metadata' in built.event),'no arbitrary metadata bag');
input.source_type='builder';ok(built.event.source_type==='program','built event detached from later input mutation');
console.log('ProductTelemetryCore: '+pass+' geslaagd, '+fail+' mislukt');process.exit(fail?1:0);
