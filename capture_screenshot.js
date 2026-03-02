const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 2000 });
  await page.goto('http://localhost:3000/test');
  await page.waitForTimeout(5000); // wait for images to process

  const outPath = path.join(process.env.HOME || '/Users/tanmay', '.gemini/antigravity/brain/0c15a848-fe72-4c49-a5ad-77cb3ab96050/test_robust_suite_' + Date.now() + '.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved to: ' + outPath);
  await browser.close();
})();
