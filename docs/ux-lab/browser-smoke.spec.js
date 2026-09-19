const {test,expect}=require('@playwright/test');
const path=require('path');
test('mobile project launcher opens TK workspace and governance panels',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'index.html'));
 await expect(page.locator('#projectHome')).toBeVisible();
 await page.getByRole('button',{name:/Trainingskompas/i}).click();
 await expect(page.locator('#projectHome')).toBeHidden();
 await expect(page.locator('#workspace')).toBeVisible();
 await page.getByRole('button',{name:/Lab/i}).click();
 await page.getByRole('button',{name:/Governance/i}).click();
 expect(errors).toEqual([]);
});
