const fs=require('fs');
const h=fs.readFileSync(__dirname+'/index.html','utf8');
const required=['button:not([disabled]):hover','button:not([disabled]):active','button:focus-visible','select:focus-visible','input:focus-visible','@media(hover:none)','@media(prefers-reduced-motion:reduce)','button[disabled]{cursor:not-allowed;}'];
for(const token of required)if(!h.includes(token))throw Error('missing interaction-state contract: '+token);
if(!h.includes('outline:3px solid var(--accent)'))throw Error('focus-visible must use canonical accent outline');
console.log('Design Engine V1 interaction visual states: PASS');
