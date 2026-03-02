const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => {
        if (msg.type() === 'log') {
            logs.push(msg.text());
        }
    });

    await page.goto('http://localhost:3000/test');

    // Wait a bit
    await page.waitForTimeout(5000);

    // Also click "Re-run all tests" just to be sure we get fresh logs
    try {
        await page.getByText('Re-run all tests').click();
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error("Failed to click button", e);
    }

    console.log(logs.join('\n'));

    await browser.close();
})();
