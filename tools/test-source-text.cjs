'use strict';
// Text-only source inspection for cross-platform regression/sabotage tests.
// Binary assets and cryptographic byte checks must keep using fs.readFileSync.
const fs=require('node:fs');
function readText(file){return fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');}
module.exports=Object.freeze({readText});
