from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000")
    page.wait_for_timeout(500)

    page.get_by_role("button", name="HQ").click()
    page.wait_for_timeout(500)

    # Try dragging
    page.mouse.move(512, 384) # center roughly
    page.mouse.down()
    page.mouse.move(600, 400, steps=10)
    page.mouse.up()

    page.screenshot(path="/home/jules/verification/screenshots/drag_test.png")
    browser.close()
