const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  await page.evaluate(() => {
    window.currentUser = { id: 'test-user-123', hex_x: 5, hex_y: 5 };
    document.getElementById('auth-modal').style.display = 'none';
    const dbModal = document.getElementById('db-diagnostic-modal');
    if(dbModal) dbModal.style.display = 'none';
    if (window.onAuthSuccess) window.onAuthSuccess();
  });

  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const dbModal = document.getElementById('db-diagnostic-modal');
    if(dbModal) dbModal.style.display = 'none';
  });

  await page.click('#scene-toggle-btn');
  await page.waitForTimeout(1000);

  // Click map in center to test if it opens hex panel properly
  const canvas = await page.$('#myCanvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
