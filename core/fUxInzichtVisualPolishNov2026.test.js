'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const insight=html.slice(html.indexOf('<div class="scr" id="s-inzicht">'),html.indexOf('<div class="scr" id="s-library">'));
const ctx=insight.slice(insight.indexOf('<div class="inzicht-context-list"'), insight.indexOf('</div>',insight.indexOf('<div class="inzicht-context-list"')));
assert(/#s-inzicht #lich-relations\{[^}]*display:flex;flex-direction:column;gap:12px;margin-bottom:12px/.test(html),'Verbanden cards and CTA are separated vertically');
assert(/#s-inzicht #lich-relations>\.lich-vrow\{margin-bottom:0\}/.test(html),'No double margins on relationship result tiles');
assert(/#s-inzicht #lich-relations\+\.lich-goto \.ic\{background:var\(--color-primary-soft\);color:var\(--color-primary\)\}/.test(html),'Relationship detail action uses canonical mint tokens');
assert(/#s-inzicht #lich-relations \.lich-vrow \.cls\.s3,[\s\S]*?#s-inzicht #lich-relations \.lich-vrow \.cls\.s2\{background:var\(--color-primary-soft\);color:var\(--color-primary\)\}/.test(html),'Relationship badges use primary accent without changing evidence logic');
for(const route of ['s-lich-metingen','s-lich-gegevens','s-lich-cyclus','s-nutrition']){
 const re=new RegExp('<button class="lich-goto" onclick="go\\(\\\''+route+'\\\'\\)">([\\s\\S]*?)</button>');
 const match=ctx.match(re);
 assert(match,'Context route retained: '+route);
 const icon=match[1].split('</span>')[0];
 assert(icon.includes('<svg')&&icon.includes('stroke="currentColor"'),'Shared line icon for '+route);
}
assert(!ctx.includes('🌙')&&!ctx.includes('🍽️'),'No colored emojis in context icons');
assert(insight.includes('id="lich-fig-front"')&&insight.includes('id="lich-fig-back"'),'Muscle recovery body maps retained');
console.log('Inzicht visual polish: relationship spacing and all 4 consistent context SVGs PASS');
