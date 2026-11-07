'use strict';
// Source inspection may normalize CRLF; binary/hash checks must see real bytes.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readText}=require('../tools/test-source-text.cjs');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'tk-source-text-'));
try{
 const a=path.join(folder,'lf.js'),b=path.join(folder,'crlf.js');
 const text="#!/usr/bin/env node\nconst naam='oefening';\n// execution guard\n";
 fs.writeFileSync(a,text);fs.writeFileSync(b,text.replace(/\n/g,'\r\n'));
 assert.equal(readText(a),text);assert.equal(readText(b),text);
 assert.notDeepEqual(fs.readFileSync(a),fs.readFileSync(b));
 assert.equal(fs.readFileSync(b,'utf8'),text.replace(/\n/g,'\r\n'));
 fs.writeFileSync(a,'waarde\rbehouden\n');assert.equal(readText(a),'waarde\rbehouden\n');
 assert.throws(()=>readText(path.join(folder,'missing.js')),e=>e.code==='ENOENT');
 console.log('Test source text: 6 LF/CRLF, binary preservation, lone-CR and missing-file assertions PASS');
}finally{fs.rmSync(folder,{recursive:true,force:true});}
