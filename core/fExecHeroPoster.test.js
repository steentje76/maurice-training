'use strict';
// Eigenaarsbesluit 16 november 2026: de oefeningkaart tijdens de training toont altijd het stilstaande
// bewegingsbeeld (poster), zonder afspeelknop; video alleen via "Bekijk video & uitleg".
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let n = 0; const ok = (v, l) => { assert(v, l); n++; console.log('  ok  ' + l); };
const a = html.indexOf("heroC=document.createElement('div'); heroC.className='exfocus-herocard';");
const b = html.indexOf("'<div class=\"exfocus-hero-body\">'", a);
assert(a > 0 && b > a, 'herokaart gevonden');
const HERO = html.slice(a, b);
ok(!/exfocus-hero-play/.test(html), 'geen afspeelknop meer op het kaartplaatje');
ok(!/img\.youtube\.com/.test(HERO), 'geen YouTube-frame als kaartplaatje');
ok(/if\(_hp\) hc\+='<div class="exfocus-hero-img"/.test(HERO), 'poster (MoveKit of eigen) als kaartplaatje');
ok(/tk504-video-poster" data-aid="'\+_privPoster\+'"/.test(HERO), 'beveiligde MoveKit-poster als er geen publieke poster is');
ok(/exfocus-hero-img is-empty/.test(HERO) && /nog geen bewegingsbeeld/.test(HERO), 'zonder poster: neutraal vlak met toegankelijke omschrijving');
ok(html.includes("(_hasVid?'Bekijk video &amp; uitleg':'Techniek &amp; uitleg')"), 'video blijft bereikbaar via "Bekijk video & uitleg"');
ok(/\.exfocus-hero-img\.is-empty\{/.test(html), 'stijl voor het neutrale vlak aanwezig');
console.log('\nfExecHeroPoster: ' + n + ' geslaagd, 0 mislukt');
