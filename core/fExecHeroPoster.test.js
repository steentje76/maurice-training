'use strict';
// Eigenaarsbesluit 16 november 2026: de oefeningkaart tijdens de training toont altijd het stilstaande
// bewegingsbeeld (poster), zonder afspeelknop; video alleen via "Bekijk video & uitleg".
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let n = 0; const ok = (v, l) => { assert(v, l); n++; console.log('  ok  ' + l); };
const a = html.indexOf("heroC=document.createElement('div'); heroC.className='exfocus-herocard';");
const b = html.indexOf("hc+='<div class=\"exfocus-hero-body\">'", a);
assert(a > 0 && b > a, 'herokaart gevonden');
const HERO = html.slice(a, b);
ok(!/exfocus-hero-play/.test(html), 'geen afspeelknop meer op het kaartplaatje');
ok(!/img\.youtube\.com/.test(HERO), 'geen YouTube-frame als kaartplaatje');
ok(/if\(_hp\) hc\+=_boxOpen\+'<img src="'\+_hp\+'" alt="" aria-hidden="true"/.test(HERO) && /onload="this\.classList\.add\(\\'is-loaded\\'\)" onerror="this\.remove\(\)"/.test(HERO), 'poster (MoveKit of eigen) als kaartplaatje; vervaagt in na laden, fout = houder blijft');
ok(/var _boxOpen='<div class="exfocus-hero-img'/.test(HERO) && /'">'\+_hold;/.test(HERO), 'houder (halter-icoon) staat direct in elke kaart, vóór de poster geladen is');
ok(/\.exfocus-hero-img img\{position:absolute;[^}]*opacity:0/.test(html) && /\.exfocus-hero-img img\.is-loaded\{opacity:1\}/.test(html) && /\.exfocus-hero-img img:not\(\[src\]\)\{visibility:hidden\}/.test(html), 'geen kapot-plaatje-icoon of alt-tekst tijdens laden');
ok(/new Image\(\); _pimg\.decoding='async'; _pimg\.src=_pp;/.test(html), 'volgende twee posters worden vooraf geladen');
ok(/tk504-video-poster" data-aid="'\+_privPoster\+'" alt="" aria-hidden="true"/.test(HERO), 'beveiligde MoveKit-poster als er geen publieke poster is');
ok(/' is-empty'/.test(HERO) && /nog geen bewegingsbeeld/.test(HERO) && /role="img" aria-label="'\+escHtml\(nm\)/.test(HERO), 'zonder poster: houder met toegankelijke omschrijving');
ok(html.includes("(_hasVid?'Bekijk video &amp; uitleg':'Techniek &amp; uitleg')"), 'video blijft bereikbaar via "Bekijk video & uitleg"');
ok(/\.exfocus-hero-img\{[^}]*linear-gradient/.test(html), 'stijl voor de houder aanwezig');
console.log('\nfExecHeroPoster: ' + n + ' geslaagd, 0 mislukt');
