'use strict';
// Include provenance/identity review regressions in the existing discovery-based Quality Gate.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const out=execFileSync(process.platform==='win32'?'python':'python3',
 ['-B','-m','unittest','discover','-s','tools','-p','test_movekit_review_ledger.py'],
 {cwd:path.join(__dirname,'..'),encoding:'utf8',stdio:['ignore','pipe','pipe']});
if(out.trim())console.log(out.trim());
console.log('MoveKit review ledger Python provenance regressions PASS');
