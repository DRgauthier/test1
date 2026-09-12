import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000")

        print("Mocking auth...")
        await page.evaluate("""() => {
            window.currentUser = { id: 'test-user-123' };
            document.getElementById('auth-modal').style.display = 'none';
            if (window.onAuthSuccess) window.onAuthSuccess();
        }""")

        await asyncio.sleep(2)

        # We need to artificially inject a building into the buildings array
        print("Injecting a test building...")
        await page.evaluate("""() => {
            window.structureManager.buildings.push({
                dbId: 'test-id',
                type: {id: 'GENERATOR', name: 'Generator', width: 40, height: 40, cost: {}},
                x: 100,
                y: 100,
                level: 1,
                construction_started_at: null,
                draw: () => {}
            });
        }""")

        b_count = await page.evaluate("window.structureManager.buildings.length")
        print(f"Building count after injection: {b_count}")

        # Click on the placed Generator to open the upgrade menu
        print("Clicking to open upgrade menu...")
        await page.evaluate("""() => {
            const hq = window.structureManager.buildings[0];
            window.structureManager.openUpgradeMenu(hq);
        }""")

        await asyncio.sleep(1)

        # Check if Move and Deconstruct buttons exist
        move_btn_exists = await page.evaluate("document.getElementById('move-btn') !== null")
        deconstruct_btn_exists = await page.evaluate("document.getElementById('deconstruct-btn') !== null")

        if move_btn_exists and deconstruct_btn_exists:
            print("Move and Deconstruct buttons exist!")
        else:
            print("FAILED: Buttons not found.")
            if not move_btn_exists: print("Move button missing.")
            if not deconstruct_btn_exists: print("Deconstruct button missing.")
            await browser.close()
            return

        print("Starting move...")
        await page.evaluate("window.structureManager.startMoving()")
        await asyncio.sleep(0.5)

        print("Ghost X while moving:", await page.evaluate("window.structureManager.ghostX"))

        print("Testing deconstruct via JS method...")
        await page.evaluate("window.structureManager.openUpgradeMenu(window.structureManager.buildings[0])")
        await page.evaluate("window.structureManager.deconstructSelectedBuilding()")

        await asyncio.sleep(1)
        b_count = await page.evaluate("window.structureManager.buildings.length")
        print(f"Building count after deconstruct: {b_count}")

        await browser.close()

asyncio.run(verify())
