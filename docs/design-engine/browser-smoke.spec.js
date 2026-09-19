const {test,expect}=require('@playwright/test');
test('mobile project launcher opens TK Design Pack inside Design Engine',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#projectHome')).toBeVisible();
 await page.getByRole('button',{name:/Trainingskompas/i}).click();
 await expect(page.locator('#projectHome')).toBeHidden();
 await expect(page.locator('#workspace')).toBeVisible();
 await expect(page.locator('#projectHome')).toBeHidden();
 await expect(page).toHaveURL(/index\.html$/);
 await expect(page.locator('body')).not.toContainText(/Inloggen bij Trainingskompas/i);
 await page.getByRole('button',{name:/Lab/i}).click();
 await page.getByRole('button',{name:/Governance/i}).click();
 expect(errors).toEqual([]);
});
