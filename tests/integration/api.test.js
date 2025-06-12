const request = require('supertest');
const { connectDB } = require('../../src/server/connect-db');
const { app } = require('../../src/server/server');
const { defaultState } = require('../../src/server/defaultState');

describe('API Integration Tests', () => {
    let db;
    let testUser;
    let authToken;

    beforeAll(async () => {
        // Connect to test database
        db = await connectDB();
        
        // Clear the database
        await db.collection('users').deleteMany({});
        await db.collection('tasks').deleteMany({});
        
        // Create a test user
        testUser = {
            id: "test-user-1",
            name: "Test User",
            passwordHash: "5f4dcc3b5aa765d61d8327deb882cf99" // password: "password"
        };
        
        await db.collection('users').insertOne(testUser);
    });

    afterAll(async () => {
        // Clean up test data
        await db.collection('users').deleteMany({});
        await db.collection('tasks').deleteMany({});
    });

    describe('Authentication Endpoints', () => {
        it('POST /authenticate - should authenticate with valid credentials', async () => {
            const response = await request(app)
                .post('/authenticate')
                .send({
                    username: testUser.name,
                    password: "password"
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.state.session.authenticated).toBe('AUTHENTICATED');
            
            // Save token for subsequent tests
            authToken = response.body.token;
        });

        it('POST /authenticate - should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/authenticate')
                .send({
                    username: testUser.name,
                    password: "wrongpassword"
                });

            expect(response.status).toBe(401);
        });
    });

    describe('Task Endpoints', () => {
        let testTask;

        beforeEach(async () => {
            // Clear tasks before each test
            await db.collection('tasks').deleteMany({});
        });

        it('POST /task/new - should create a new task', async () => {
            const newTask = {
                name: "Test Task",
                owner: testUser.id
            };

            const response = await request(app)
                .post('/task/new')
                .set('Authorization', `Bearer ${authToken}`)
                .send(newTask);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(newTask.name);
            expect(response.body.owner).toBe(newTask.owner);

            testTask = response.body;
        });

        it('GET /tasks - should retrieve user tasks', async () => {
            // First create a task
            const task = {
                id: "test-task-1",
                name: "Test Task",
                owner: testUser.id
            };
            await db.collection('tasks').insertOne(task);

            const response = await request(app)
                .get('/tasks')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0].owner).toBe(testUser.id);
        });

        it('POST /task/update - should update an existing task', async () => {
            // First create a task
            const task = {
                id: "test-task-1",
                name: "Test Task",
                owner: testUser.id
            };
            await db.collection('tasks').insertOne(task);

            const updateData = {
                id: task.id,
                name: "Updated Test Task",
                isComplete: true
            };

            const response = await request(app)
                .post('/task/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.name).toBe(updateData.name);
            expect(response.body.isComplete).toBe(true);
        });
    });
});
