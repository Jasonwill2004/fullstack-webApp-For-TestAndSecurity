const { testLoginFlow, testInvalidLoginFlow, testPasswordIncorrectFlow } = require('./login.test');
const { testSignupFlow, testSignupFlowWithExistingUser } = require('./signup.test');

async function runAllTests() {
    console.log('🎯 Starting Complete UI Automation Test Suite');
    console.log('================================================');
    
    try {
        // Run Login Tests
        console.log('\n🔐 RUNNING LOGIN TESTS');
        console.log('------------------------');
        
        console.log('\n1️⃣ Valid Login Test');
        await testLoginFlow();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n2️⃣ Invalid Credentials Test');
        await testInvalidLoginFlow();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n3️⃣ Wrong Password Test');
        await testPasswordIncorrectFlow();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Run Signup Tests
        console.log('\n📝 RUNNING SIGNUP TESTS');
        console.log('-------------------------');
        
        console.log('\n4️⃣ New User Signup Test');
        await testSignupFlow();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n5️⃣ Existing User Signup Test');
        await testSignupFlowWithExistingUser();
        
        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('✅ Login Flow - Valid credentials');
        console.log('✅ Login Flow - Invalid credentials');
        console.log('✅ Login Flow - Wrong password');
        console.log('✅ Signup Flow - New user');
        console.log('✅ Signup Flow - Existing user error');
        console.log('\n📸 Screenshots saved in tests/selenium/screenshots/');
        
    } catch (error) {
        console.error('\n💥 TEST SUITE FAILED:', error);
        console.log('\n📸 Error screenshots saved in tests/selenium/screenshots/');
        process.exit(1);
    }
}

// Run all tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests
};
