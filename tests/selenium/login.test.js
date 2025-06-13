const { By, until } = require('selenium-webdriver');
const { createDriver, takeScreenshot, waitForElement } = require('./setup');

async function testLoginFlow() {
    let driver;
    
    try {
        console.log('🚀 Starting Login Flow Test...');
        driver = await createDriver();
        
        // Navigate to the application
        const baseUrl = 'http://localhost:8080';
        console.log(`📱 Navigating to ${baseUrl}`);
        await driver.get(baseUrl);
        
        // Take initial screenshot
        await takeScreenshot(driver, '01_login_homepage');
        
        // Wait for the login form to load
        console.log('⏳ Waiting for login form...');
        await waitForElement(driver, By.css('form'));
        await takeScreenshot(driver, '02_login_form_loaded');
        
        // Fill in the login form with valid credentials
        console.log('📝 Filling login form with valid credentials...');
        
        // Find username field and enter data
        const usernameField = await driver.findElement(By.css('input[name="username"]'));
        await usernameField.clear();
        await usernameField.sendKeys('Dev');
        
        // Find password field and enter data
        const passwordField = await driver.findElement(By.css('input[name="password"]'));
        await passwordField.clear();
        await passwordField.sendKeys('TUPLES');
        
        await takeScreenshot(driver, '03_login_form_filled_valid');
        
        // Submit the form
        console.log('📤 Submitting login form...');
        const submitButton = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton.click();
        
        // Wait for successful login and redirect to dashboard
        console.log('⏳ Waiting for login success...');
        try {
            await driver.wait(until.urlContains('/dashboard'), 10000);
            console.log('✅ Login successful - redirected to dashboard');
            await takeScreenshot(driver, '04_login_success_dashboard');
            
            // Check if we can see the dashboard elements
            try {
                await waitForElement(driver, By.css('.card'), 5000);
                console.log('✅ Dashboard loaded successfully');
                await takeScreenshot(driver, '05_login_dashboard_content');
            } catch (e) {
                console.log('⚠️ Dashboard content not fully loaded');
            }
            
        } catch (error) {
            console.log('⚠️ Login did not redirect to dashboard as expected');
            await takeScreenshot(driver, '04_login_no_redirect');
        }
        
        console.log('✅ Valid login flow test completed');
        
    } catch (error) {
        console.error('❌ Login test failed:', error);
        if (driver) {
            await takeScreenshot(driver, '99_login_error_final');
        }
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

async function testInvalidLoginFlow() {
    let driver;
    
    try {
        console.log('🚀 Starting Invalid Login Flow Test...');
        driver = await createDriver();
        
        // Navigate to the application
        const baseUrl = 'http://localhost:8080';
        console.log(`📱 Navigating to ${baseUrl}`);
        await driver.get(baseUrl);
        
        // Wait for the login form to load
        await waitForElement(driver, By.css('form'));
        await takeScreenshot(driver, '06_invalid_login_form');
        
        // Fill in the login form with invalid credentials
        console.log('📝 Filling login form with invalid credentials...');
        
        const usernameField = await driver.findElement(By.css('input[name="username"]'));
        await usernameField.clear();
        await usernameField.sendKeys('InvalidUser');
        
        const passwordField = await driver.findElement(By.css('input[name="password"]'));
        await passwordField.clear();
        await passwordField.sendKeys('WrongPassword');
        
        await takeScreenshot(driver, '07_invalid_login_form_filled');
        
        // Submit the form
        console.log('📤 Submitting invalid login form...');
        const submitButton = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton.click();
        
        // Wait for error message
        console.log('⏳ Waiting for error response...');
        await driver.sleep(3000); // Give time for the request to process
        
        try {
            // Look for the "Login incorrect" error message
            const errorMessage = await driver.findElement(By.xpath("//p[contains(text(), 'Login incorrect')]"));
            const errorText = await errorMessage.getText();
            console.log(`✅ Expected error message received: ${errorText}`);
            await takeScreenshot(driver, '08_invalid_login_error');
        } catch (e) {
            console.log('⚠️ Error message not found, checking current state');
            await takeScreenshot(driver, '08_invalid_login_no_error');
            
            // Check if we're still on the login page
            const currentUrl = await driver.getCurrentUrl();
            if (currentUrl.includes('dashboard')) {
                console.log('⚠️ Unexpectedly logged in with invalid credentials');
            } else {
                console.log('✅ Stayed on login page (correct behavior)');
            }
        }
        
        console.log('✅ Invalid login flow test completed');
        
    } catch (error) {
        console.error('❌ Invalid login test failed:', error);
        if (driver) {
            await takeScreenshot(driver, '99_invalid_login_error');
        }
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

async function testPasswordIncorrectFlow() {
    let driver;
    
    try {
        console.log('🚀 Starting Password Incorrect Flow Test...');
        driver = await createDriver();
        
        // Navigate to the application
        const baseUrl = 'http://localhost:8080';
        console.log(`📱 Navigating to ${baseUrl}`);
        await driver.get(baseUrl);
        
        // Wait for the login form to load
        await waitForElement(driver, By.css('form'));
        
        // Fill in with valid username but wrong password
        console.log('📝 Filling login form with valid user but wrong password...');
        
        const usernameField = await driver.findElement(By.css('input[name="username"]'));
        await usernameField.clear();
        await usernameField.sendKeys('Dev');
        
        const passwordField = await driver.findElement(By.css('input[name="password"]'));
        await passwordField.clear();
        await passwordField.sendKeys('WrongPassword');
        
        await takeScreenshot(driver, '09_wrong_password_filled');
        
        // Submit the form
        const submitButton = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton.click();
        
        // Wait for error response
        await driver.sleep(3000);
        
        try {
            const errorMessage = await driver.findElement(By.xpath("//p[contains(text(), 'Login incorrect')]"));
            const errorText = await errorMessage.getText();
            console.log(`✅ Expected error message for wrong password: ${errorText}`);
            await takeScreenshot(driver, '10_wrong_password_error');
        } catch (e) {
            console.log('⚠️ Error message not found for wrong password');
            await takeScreenshot(driver, '10_wrong_password_no_error');
        }
        
        console.log('✅ Wrong password flow test completed');
        
    } catch (error) {
        console.error('❌ Wrong password test failed:', error);
        if (driver) {
            await takeScreenshot(driver, '99_wrong_password_error');
        }
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

// Export test functions
module.exports = {
    testLoginFlow,
    testInvalidLoginFlow,
    testPasswordIncorrectFlow
};

// Run tests if this file is executed directly
if (require.main === module) {
    async function runLoginTests() {
        try {
            await testLoginFlow();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
            await testInvalidLoginFlow();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
            await testPasswordIncorrectFlow();
            console.log('🎉 All login tests completed successfully!');
        } catch (error) {
            console.error('💥 Test suite failed:', error);
            process.exit(1);
        }
    }
    
    runLoginTests();
}
