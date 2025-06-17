# Week 4 of Zolvit Bootcamp

## [videoWalkthrough](https://drive.google.com/file/d/1aKcofxeKc9aRWBd0n1toSAFasgr4i7J-/view?usp=sharing)

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Node.js](https://nodejs.org/en/download/)
- [Mongo.DB](https://docs.mongodb.com/manual/installation/)

Next, clone this repository and install dependencies:

```
git clone git@github.com:danielstern/express-react-fullstack.git
```

```
npm install
```

Also, make sure MongoDB is running by navigating to the installation directory and running (in cmd or terminal), replacing the path with your chosen Mongo directory:

```
C:\Data\bin\mongod.exe
```

Now, start the development environment with the following command:

```
npm run dev
```

The application should open automatically. 

## Testing

This application includes a comprehensive test suite covering multiple testing layers:

### Prerequisites for Testing
- MongoDB running locally
- Application dependencies installed (`npm install`)
- For performance testing: [k6](https://k6.io/docs/getting-started/installation/) installed globally

### Test Suites Available

#### 1. Unit Tests
Tests individual functions and components in isolation.
```bash
npm run test:unit
```

#### 2. Integration Tests
Tests API endpoints and database interactions.
```bash
npm run test:integration
```

#### 3. UI Automation Tests (Selenium)
End-to-end browser automation testing user workflows.
```bash
# Run all Selenium tests
npm run test:selenium

# Run specific tests
npm run test:selenium:login
npm run test:selenium:signup
```

#### 4. Schema Validation Tests
Tests MongoDB schema validation and API request/response schemas.
```bash
# Run all schema tests
npm run test:schema-all

# Run database schema tests only
npm run test:schema

# Run API schema tests only
npm run test:api-schema
```

#### 5. Performance Tests (k6)
Load testing with 10-100 virtual users simulating real user behavior.
```bash
# Full performance test (12-minute load test)
npm run test:performance

# Quick smoke test (30 seconds, 1 user)
npm run test:performance:smoke

# Debug mode with verbose output
npm run test:performance:debug
```

#### 6. Run All Tests
Execute the complete test suite (unit, integration, UI, and smoke performance test).
```bash
npm run test:all
```

### Test Coverage
Generate test coverage reports:
```bash
npm run test:coverage
```
Coverage reports are generated in the `coverage/` directory.

### Test Configuration
- **Test Environment**: Isolated test database and environment variables
- **Test Data**: Uses predefined test users (Dev/TUPLES, C. Eeyo/PROFITING)
- **Performance Thresholds**: 
  - 100% authentication success rate
  - <25ms response times for API endpoints
  - 0% error rate tolerance
- **Browser Testing**: Chrome (headless mode available)

### Test Reports and Documentation
- Performance test results: `performance/performance_summary_report.md`
- Test strategy: `TEST_PLAN_AND_STRATEGY.md`
- Architecture overview: `day19_architecture_summary.md`
- Testing summaries: `day20_testing_summary.md`, `day21_selenium_automation_summary.md`, `day22_schema_validation_summary.md`

### Troubleshooting Tests

**Performance tests failing?**
- Ensure k6 is installed globally: `brew install k6` (macOS) or visit [k6.io](https://k6.io/docs/getting-started/installation/)
- Make sure the application is running: `npm run start-dev`
- Check if MongoDB is running and accessible

**Selenium tests not working?**
- Ensure Chrome browser is installed
- Check if application is running on localhost:8080
- For CI/CD, tests can run in headless mode

**Database tests failing?**
- Verify MongoDB is running
- Check test database permissions
- Ensure test environment variables are set

## Troubleshooting
Problem: The application won't start!

Try:
1. Run `npm install` again
2. Update your version of `Node.js` to the latest
3. Clone the finished repo and start from there

Problem: I'm getting weird error XYZ!

Try:
1. Cancel `npm run dev` (with ctrl-C on windows) and run it again
2. If there error mentions any particular file, visit that file and make sure you didn't make any common errors (capitalization of property names, forgetting to destructure paramaters with curly brackets)
3. Still no luck? Clone the finished repo and prune away parts of it until you are at the point you left off.

## Challenge Task Solutions

### Connected Username Component
1. Create a [connected username component](https://github.com/danielstern/express-react-fullstack/blob/master/src/app/components/UsernameDisplay.jsx) which matches user data with an ID provided as a prop.
2. Update the server-side state assembly process to include the usernames (but not passwords or any sensitive data) of any users which will be relevant to the current session.

### Sign Up 
This version of the application is found at the [Add Sign Up Branch](https://github.com/danielstern/express-react-fullstack/tree/add-signup/src/app/components).

1. Add a link to the sign up page from the login page.
2. Create a Sign Up route, which is almost identical to the Login route.
3. Add a saga to communicate requests from the Login Route to the server.
4. Add a route to the server which creates new users in the database.

### Security
Coming February 2019.
