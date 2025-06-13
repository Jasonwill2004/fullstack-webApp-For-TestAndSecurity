const { Builder, Browser } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function createDriver() {
    // Configure Firefox options
    const options = new firefox.Options();
    // options.addArguments('--headless'); // Uncomment for headless mode
    
    const driver = await new Builder()
        .forBrowser(Browser.FIREFOX)
        .setFirefoxOptions(options)
        .build();
    
    // Set window size for consistent screenshots
    await driver.manage().window().setRect({ width: 1280, height: 720 });
    
    return driver;
}

async function takeScreenshot(driver, filename) {
    const screenshot = await driver.takeScreenshot();
    const screenshotPath = path.join(screenshotsDir, `${filename}.png`);
    fs.writeFileSync(screenshotPath, screenshot, 'base64');
    console.log(`Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
}

async function waitForElement(driver, locator, timeout = 10000) {
    const { until } = require('selenium-webdriver');
    return await driver.wait(until.elementLocated(locator), timeout);
}

module.exports = {
    createDriver,
    takeScreenshot,
    waitForElement,
    screenshotsDir
};
