const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
test('V1 interaction states are visually distinct and keyboard accessible',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE);
 const card=page.locator('#projectHome .projectCard:not([disabled])');
 const normal=await card.evaluate(el=>getComputedStyle(el).boxShadow);
 await card.hover();
 const hover=await card.evaluate(el=>getComputedStyle(el).boxShadow);
 expect(hover).not.toBe(normal);
 await card.focus();
 expect(await card.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 expect(parseFloat(await card.evaluate(el=>getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(3);
 const disabled=page.locator('#projectHome .projectCard[disabled]').first();
 expect(await disabled.evaluate(el=>getComputedStyle(el).cursor)).toBe('not-allowed');
});

test('touch viewport suppresses hover-only elevation',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();await page.goto(BASE);
 const card=page.locator('#projectHome .projectCard:not([disabled])');
 await card.hover();
 expect(await card.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
 await context.close();
});
