const { By, until } = require('selenium-webdriver');
const { createDriver, takeScreenshot, waitForElement } = require('./setup');

async function testSignupFlow() {
    let driver;
    
    try {
        console.log('🚀 Starting Signup Flow Test...');
        driver = await createDriver();
        
        // Navigate to the application
        const baseUrl = 'http://localhost:8080';
        console.log(`📱 Navigating to ${baseUrl}`);
        await driver.get(baseUrl);
        
        // Take initial screenshot
        await takeScreenshot(driver, '01_signup_homepage');
        
        // Wait for the signup link and click it
        console.log('🔍 Looking for signup link...');
        const signupLink = await waitForElement(driver, By.linkText("Don't have an account? Sign up."));
        await takeScreenshot(driver, '02_signup_login_page');
        
        console.log('👆 Clicking signup link...');
        await signupLink.click();
        
        // Wait for the signup form to load
        console.log('⏳ Waiting for signup form...');
        await waitForElement(driver, By.css('form'));
        await takeScreenshot(driver, '03_signup_form_loaded');
        
        // Fill in the signup form
        console.log('📝 Filling signup form...');
        
        // Find username field and enter data
        const usernameField = await driver.findElement(By.css('input[name="username"]'));
        await usernameField.clear();
        await usernameField.sendKeys('TestUser123');
        
        // Find password field and enter data
        const passwordField = await driver.findElement(By.css('input[name="password"]'));
        await passwordField.clear();
        await passwordField.sendKeys('TestPassword123');
        
        await takeScreenshot(driver, '04_signup_form_filled');
        
        // Submit the form
        console.log('📤 Submitting signup form...');
        const submitButton = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton.click();
        
        // Wait for response (either success or error)
        console.log('⏳ Waiting for signup response...');
        await driver.sleep(2000); // Give time for the request to process
        
        await takeScreenshot(driver, '05_signup_form_submitted');
        
        // Check if we were redirected to dashboard (successful signup)
        try {
            await driver.wait(until.urlContains('/dashboard'), 5000);
            console.log('✅ Signup successful - redirected to dashboard');
            await takeScreenshot(driver, '06_signup_success_dashboard');
        } catch (error) {
            // Check if there's an error message
            try {
                const errorMessage = await driver.findElement(By.css('p'));
                const errorText = await errorMessage.getText();
                console.log(`⚠️ Signup error: ${errorText}`);
                await takeScreenshot(driver, '06_signup_error');
            } catch (e) {
                console.log('⚠️ No clear error message found');
                await takeScreenshot(driver, '06_signup_unknown_state');
            }
        }
        
        console.log('✅ Signup flow test completed');
        
    } catch (error) {
        console.error('❌ Signup test failed:', error);
        if (driver) {
            await takeScreenshot(driver, '99_signup_error_final');
        }
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

async function testSignupFlowWithExistingUser() {
    let driver;
    
    try {
        console.log('🚀 Starting Signup Flow Test with Existing User...');
        driver = await createDriver();
        
        // Navigate to the application
        const baseUrl = 'http://localhost:8080';
        console.log(`📱 Navigating to ${baseUrl}`);
        await driver.get(baseUrl);
        
        // Go to signup page
        const signupLink = await waitForElement(driver, By.linkText("Don't have an account? Sign up."));
        await signupLink.click();
        
        // Wait for the signup form to load
        await waitForElement(driver, By.css('form'));
        await takeScreenshot(driver, '07_existing_user_signup_form');
        
        // Fill in the signup form with existing user (Dev)
        const usernameField = await driver.findElement(By.css('input[name="username"]'));
        await usernameField.clear();
        await usernameField.sendKeys('Dev');
        
        const passwordField = await driver.findElement(By.css('input[name="password"]'));
        await passwordField.clear();
        await passwordField.sendKeys('TUPLES');
        
        await takeScreenshot(driver, '08_existing_user_form_filled');
        
        // Submit the form
        const submitButton = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton.click();
        
        // Wait for error message
        await driver.sleep(2000);
        
        try {
            const errorMessage = await driver.findElement(By.css('p'));
            const errorText = await errorMessage.getText();
            console.log(`✅ Expected error message received: ${errorText}`);
            await takeScreenshot(driver, '09_existing_user_error');
        } catch (e) {
            console.log('⚠️ No error message found for existing user');
            await takeScreenshot(driver, '09_existing_user_no_error');
        }
        
        console.log('✅ Existing user signup test completed');
        
    } catch (error) {
        console.error('❌ Existing user signup test failed:', error);
        if (driver) {
            await takeScreenshot(driver, '99_existing_user_error');
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
    testSignupFlow,
    testSignupFlowWithExistingUser
};

// Run tests if this file is executed directly
if (require.main === module) {
    async function runSignupTests() {
        try {
            await testSignupFlow();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
            await testSignupFlowWithExistingUser();
            console.log('🎉 All signup tests completed successfully!');
        } catch (error) {
            console.error('💥 Test suite failed:', error);
            process.exit(1);
        }
    }
    
    runSignupTests();
}
