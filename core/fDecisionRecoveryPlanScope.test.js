/* DEC-REC-001-A/B — versieerbaar readinesscontract + expliciete trainingsscope.
 * Pure output golden cases, geen DOM en geen AI-zelfberekening.
 */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const D=require('./decision.js'), C=require('./coaching.js');
let pass=0,fail=0;const errors=[];
function ok(v,msg){if(v)pass++;else{fail++;errors.push('MISLUKT: '+msg);}}
function eq(a,b,msg){ok(JSON.stringify(a)===JSON.stringify(b),msg+' (got '+JSON.stringify(a)+')');}
const muscle=[{muscle:'borst',pct:40,hours:20}];
const recovery={score:61,band:'gemiddeld',confidence:'middel'};
const base={dagfactor:1.02,gereedheid:85,herstel:recovery,signalen:{hrv:{waarde:45},slaap:{waarde:6.5},spierherstel:muscle,gevoel:'goed'}};
const noPlan=D.readinessDay({...base,trainingGepland:false});
eq(D.VERSIONS.readiness_day,'readiness_day.v1.1','A1 version registry');
eq(noPlan.versie,'readiness_day.v1.1','A2 decision version');
eq(noPlan.zone,'ready','A3 same zone');
eq(noPlan.zoneLabel,'Gunstige dag','A4 non-physiological label');
eq(noPlan.gereedheid,85,'A5 day readiness numeric unchanged');
eq(noPlan.herstel,null,'B1 no training-specific recovery without plan');
eq(noPlan.trainingsadvies,{soort:'geen_advies',setsDelta:0,rpeDelta:0},'B2 no program action without plan');
eq(noPlan.aanpassing,null,'B3 no training adjustment without plan');
ok(!/geplande training kan/.test(noPlan.zoneBetekenis),'B4 no imaginary scheduled session in text');
const cNo=C.buildReadinessContext({besluit:noPlan,geplandeTraining:null});
const message=C.readinessCoachMessage(cNo);
ok(!JSON.stringify(message).includes('/100')&&!JSON.stringify(message).includes('herstelscore van vandaag'),'B5 no hidden score in Coach');
const ai=C.readinessAiPayload(cNo);
ok(!Object.prototype.hasOwnProperty.call(ai,'herstel'),'B6 no fabricated recovery in AI payload');
eq(ai.trainingsadvies.soort,'geen_advies','B7 AI receives no training advice');
const withPlan=D.readinessDay({...base,trainingGepland:true});
eq(withPlan.zoneLabel,'Gunstige dag','A6 contract label stable with plan');
eq(withPlan.herstel.score,61,'B8 planned+data reuses supplied Calculation output');
eq(withPlan.trainingsadvies.soort,'aangepast','B9 unchanged muscle-specific decision for low recovery');
const insufficient=D.readinessDay({...base,trainingGepland:true,signalen:{...base.signalen,spierherstel:null}});
eq(insufficient.herstel,null,'B10 no score when plan exists but muscle evidence missing');
ok(insufficient.ontbreekt.includes('herstelscore'),'B11 score unavailable reason');
const badDay=D.readinessDay({...base,trainingGepland:false,dagfactor:null});
eq(badDay.zone,null,'B12 no day-readiness claim without dayfactor');
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
ok(idx.includes('let heeftExplicietPlan=false')&&idx.includes('heeftExplicietPlan=true'),'B13 explicit scheduled occurrence distinct from rotation suggestion');
ok(idx.includes('planBasis=!!(heeftExplicietPlan')&&idx.includes('geldigeSpieren'),'B14 orchestrator enforces planned complete muscle basis');
ok(idx.includes('const rs=b.herstel;')&&idx.includes('CoachingCore.readinessCoachMessage(readinessCtx)')&&!idx.includes('const a=buildCoachTraining(dfInfo,recRows);'),'B15 Coach card renders current Decision result via Coaching, no duplicate calculation');
ok(idx.includes("if(!hit){pctBySvgId[id]=null;return;}"),'B16 unknown muscle heatmap is null, never 100% green');
ok(idx.includes("r.hours===null?'—':r.pct+'%'"),'B17 no-data muscle card shows dash');
console.log('fDecisionRecoveryPlanScope: '+pass+' geslaagd, '+fail+' mislukt');
if(errors.length)console.log(errors.join('\n'));
process.exit(fail?1:0);
