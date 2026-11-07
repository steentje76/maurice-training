'use strict';
// UI regression: Trainen card and library title use one canonical, live ECS count.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let n=0;
function ok(condition,message){assert.ok(condition,message);n++;}
const card=html.slice(html.indexOf('<!-- SECTION 4'),html.indexOf('<!-- SECTION 5'));
ok(card.includes('id="tk-train-exercise-count"'),'Train exercise card has dynamic count target');
ok(!card.includes('206 oefeningen'),'outdated 206 hard-coded value removed');
ok(card.includes('video&#8217;s &#183; alternatieven'),'other card content preserved');
const from=html.indexOf('function tk504SyncExerciseCount(){');
const to=html.indexOf('function tk504ClearPublishedCatalog(){',from);
ok(from>0&&to>from,'canonical sync function available');
const js=html.slice(from,to);
let count=226;
const elements={
 'tk-train-exercise-count':{textContent:'loading'},
 'lib-total':{textContent:'loading'}
};
const sandbox={
 document:{getElementById:id=>elements[id]||null},
 ExerciseCatalogService:{count:()=>count},
 Number
};
vm.runInNewContext(js+'\ntk504SyncExerciseCount();',sandbox);
ok(elements['tk-train-exercise-count'].textContent==='226 oefeningen','initial count follows baseline 226');
ok(elements['lib-total'].textContent==='226','library header follows same baseline');
count=582;
vm.runInNewContext('tk504SyncExerciseCount();',sandbox);
ok(elements['tk-train-exercise-count'].textContent==='582 oefeningen','auth-published 356 updates main card');
ok(elements['lib-total'].textContent==='582','library title updates atomically');
count=226;
vm.runInNewContext('tk504SyncExerciseCount();',sandbox);
ok(elements['tk-train-exercise-count'].textContent==='226 oefeningen','logout rolls count back with canonical catalog');
count=NaN;
vm.runInNewContext('tk504SyncExerciseCount();',sandbox);
ok(elements['tk-train-exercise-count'].textContent==='226 oefeningen','invalid numeric count ignored');
ok(/function tk504ClearPublishedCatalog\(\)[\s\S]*?tk504SyncExerciseCount\(\);\s*\}/.test(html),
 'logout or session-clear triggers fresh count');
ok(/tk504PublishedCatalogRuntime\.mount\([\s\S]*?tk504InvalidateProtectedMedia\(\);\s*tk504SyncExerciseCount\(\);/.test(html),
 'authorized catalog mount updates count after data arrives');
ok(/tkPaintBnav\('s-home'\);[^\n]*\n\s*tk504SyncExerciseCount\(\);/.test(html),
 'initial app startup updates count');
console.log('TK504 Train exercise count: '+n+' canonical count/UI contract assertions PASS');
