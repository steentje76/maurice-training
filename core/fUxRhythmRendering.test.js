'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('let tkTrainingCtx=null;');
const b=html.indexOf('async function refreshTrainContext(){',a);
assert(a>=0&&b>a,'rhythm renderer located');
const elements={
 'home-context':{style:{display:'none'},innerHTML:''},
 'trainen-ritme-heading':{style:{display:'none'}}
};
const c={document:{getElementById:id=>elements[id]||null},escHtml:s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))};
vm.createContext(c);
vm.runInContext(html.slice(a,b),c);
c.renderHomeContextCard(null);
assert.equal(elements['home-context'].style.display,'none');
assert.equal(elements['trainen-ritme-heading'].style.display,'none');
c.renderHomeContextCard({frequency:'<img src=x onerror=alert(1)>',duration_min:'<svg onload=alert(2)>',location:'<b>fake</b>',days:['<script>alert(3)</script>'],equipment:['<img>'],avoid_exercises:['<a>']});
assert.equal(elements['home-context'].style.display,'block');
assert.equal(elements['trainen-ritme-heading'].style.display,'');
assert(!elements['home-context'].innerHTML.includes('<img'));
assert(!elements['home-context'].innerHTML.includes('<script'));
assert(!elements['home-context'].innerHTML.includes('<svg'));
assert(!elements['home-context'].innerHTML.includes('<a>'));
assert(elements['home-context'].innerHTML.includes('&lt;svg'));
c.renderHomeContextCard({});
assert.equal(elements['home-context'].style.display,'none');
assert.equal(elements['trainen-ritme-heading'].style.display,'none');
console.log('Rhythm renderer: safe HTML escaping and empty-state heading PASS');
