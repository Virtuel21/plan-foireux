// Visual acceptance of the new hand prop; browser clock skips only the waiting phases.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:844,height:390}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(process.env.PF_TEST_URL || 'http://127.0.0.1:4173');await page.waitForTimeout(1800);await page.clock.install();
 await page.getByRole('button',{name:/Jouer avec les bots/}).click();await page.getByRole('button',{name:'Je garde mon rôle secret'}).click();
 await page.clock.fastForward(7100);await page.clock.runFor(3000);await page.locator('[data-post="drill"]').click();await page.clock.fastForward(18000);
 await page.locator('[data-post="drill"]').click();await page.clock.runFor(3000);await page.clock.fastForward(10000);await page.clock.runFor(800);
 let held=false;
 for(let i=0;i<160;i++) { const press=await page.locator('.meter').evaluate(e=>{const a=e.querySelector('.meter-needle').getBoundingClientRect(),b=e.querySelector('.target-band').getBoundingClientRect();return a.x<b.x+b.width*.5;});if(press&&!held){await page.keyboard.down('Space');held=true;}else if(!press&&held){await page.keyboard.up('Space');held=false;}await page.clock.runFor(50); }
 await page.keyboard.up('Space');await page.clock.fastForward(11000);await page.clock.runFor(2500);
 await page.screenshot({path:process.env.PF_QA_IMAGE || '../reveal-drill.png'});console.log(JSON.stringify({phase:await page.locator('body').getAttribute('data-phase'),stats:await page.locator('#scene').evaluate(e=>({...e.dataset})),errors}));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
