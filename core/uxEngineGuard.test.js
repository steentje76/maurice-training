'use strict';
const cp=require('child_process'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
function ok(v,m){if(!v)throw new Error(m)}
cp.execFileSync(process.execPath,[path.join(root,'tools/ux-engine-validate.js')],{stdio:'inherit'});
const contract=fs.readFileSync(path.join(root,'docs/ux/engine/UX_ENGINE_CONTRACT.md'),'utf8');
ok(contract.includes('UX PRE-CODE GATE'),'pre-code gate missing');
ok(contract.includes('PO_REVIEW_REQUIRED'),'PO ambiguity guard missing');
ok(contract.includes('Mock-up contract'),'mock-up contract missing');
ok(contract.includes('Scenario Lab'),'scenario comparison gate missing');
ok(fs.existsSync(path.join(root,'docs/ux/registry/UX_SOURCE_REGISTRY.json')),'source registry missing');
ok(fs.existsSync(path.join(root,'docs/ux/registry/UX_SCENARIO_REGISTRY.json')),'scenario registry missing');
const reg=JSON.parse(fs.readFileSync(path.join(root,'docs/ux/registry/UX_SCREEN_REGISTRY.json'),'utf8'));
ok(reg.screens.some(s=>s.id==='TK-UX-REC-001'),'approved recovery seed missing');
ok(reg.screens.every(s=>s.status!=='UX_SPEC_READY'||(s.interactions.length&&s.components.length)),'ready screen incomplete');
console.log('uxEngineGuard: PASS');
