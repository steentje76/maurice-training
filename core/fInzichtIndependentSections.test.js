'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(n){let st=html.indexOf('async function '+n+'(');assert(st>=0,n);for(let e=html.indexOf('}',st);e>=0;e=html.indexOf('}',e+1)){const x=html.slice(st,e+1);try{new Function('return ('+x+')');return x;}catch{}}throw Error(n);}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
(async()=>{
 const pending=deferred(),calls=[],c={window:{},document:{getElementById:()=>null},Promise};
 for(const name of ['Development','Overview','Domains','Recent'])c['inzichtRender'+name]=()=>{calls.push(name);return name==='Development'?pending.promise:Promise.resolve();};
 vm.createContext(c);vm.runInContext(fn('renderInzicht'),c);const render=c.renderInzicht();
 assert.deepEqual(calls,['Development','Overview','Domains','Recent'],'slow development query must not prevent other sections from starting');pending.resolve();await render;
 const recovery=deferred(),domain={innerHTML:'',children:[]},d={authSession:{user:{id:'synthetic-A'}},window:{_inzichtRenderId:1},document:{getElementById:()=>domain},v43OverallRecovery:()=>recovery.promise,inzichtGetOrNull:async()=>[],tkIcon:()=>'',escHtml:String,inzichtMiniViz:()=>'<svg></svg>'};
 vm.createContext(d);vm.runInContext(fn('inzichtRenderDomains'),d);const domains=d.inzichtRenderDomains(1);
 assert(domain.innerHTML.includes('Voeding')&&domain.innerHTML.includes('goInzichtPrestaties()'),'navigation must exist before recovery query completes');
 assert.equal((domain.innerHTML.match(/tk-domain-row/g)||[]).length,6,'six domain routes remain; Lichaam moves to context');
 assert(html.includes('onclick="go(\'s-lich-metingen\')"')&&html.includes('<b>Lichaamssamenstelling</b>'),'body measurements remain available under context');
 const before=domain.innerHTML;recovery.resolve({hasData:false});await domains;assert.equal(domain.innerHTML,before,'optional charts must not replace navigation/focus');
 const health=deferred(),grid={innerHTML:''},o={authSession:{user:{id:'synthetic-A'}},window:{_inzichtRenderId:1},document:{getElementById:()=>grid},inzichtGetOrNull:()=>health.promise,tkIcon:()=>'',escHtml:String};
 vm.createContext(o);vm.runInContext(fn('inzichtRenderOverview'),o);const overview=o.inzichtRenderOverview(1);
 assert.equal((grid.innerHTML.match(/class="tk-overview-cell/g)||[]).length,5,'five unknown placeholders render immediately');
 assert(!grid.innerHTML.includes('class="val">0'),'missing input is not fabricated zero');
 const unknown=grid.innerHTML;o.authSession={user:{id:'synthetic-B'}};o.window._inzichtRenderId=2;health.resolve(null);await overview;
 assert.equal(grid.innerHTML,unknown,'stale owner/generation cannot overwrite current section');
 console.log('Inzicht: independent sections, immediate six domain links plus body-context route/five unknown metrics, no synthetic zero, stable navigation and owner/generation guard PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
