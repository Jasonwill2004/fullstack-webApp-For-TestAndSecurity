const request = require('supertest');
const { connectDB, closeDB } = require('../../src/server/connect-db');
const { app } = require('../../src/server/server');
const md5 = require('md5');

let server;

describe('Core API Integration Tests', () => {
    let db;
    let testUser;
    let authToken;

    beforeAll(async () => {
        // Connect to test database using a different database name for isolation
        process.env.MONGODB_URI = 'mongodb://localhost:27017/organizer_test';
        db = await connectDB();
        
        // Start server
        server = app.listen(3001);
        
        // Clear test collections
        await db.collection('users').deleteMany({});
        await db.collection('tasks').deleteMany({});
        
        // Create a test user
        testUser = {
            id: "test-user-1",
            name: "Test User",
            passwordHash: md5("testpassword123")
        };
        await db.collection('users').insertOne(testUser);
    });

    afterAll(async (done) => {
        try {
            // Clean up database
            if (db) {
                await db.collection('users').deleteMany({});
                await db.collection('tasks').deleteMany({});
            }
            
            // Close database connection
            await closeDB();
            
            // Close server
            server.close(() => {
                done();
            });
        } catch (error) {
            done(error);
        }
    }, 10000);

    // Test 1: Authentication
    describe('POST /authenticate', () => {
        it('should authenticate with valid credentials', async () => {
            const response = await request(app)
                .post('/authenticate')
                .send({
                    username: testUser.name,
                    password: "testpassword123"
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.state.session.authenticated).toBe('AUTHENTICATED');
            
            // Store token for subsequent tests
            authToken = response.body.token;
        });
    });

    // Test 2: Create Task
    describe('POST /task/new', () => {
        it('should create a new task successfully', async () => {
            const newTask = {
                task: {
                    name: "Integration Test Task",
                    id: "test-task-" + Date.now(),
                    isComplete: false,
                    owner: testUser.id
                }
            };

            const response = await request(app)
                .post('/task/new')
                .set('Authorization', `Bearer ${authToken}`)
                .send(newTask);

            expect(response.status).toBe(200);

            // Verify task was created in database
            const savedTask = await db.collection('tasks').findOne({ id: newTask.task.id });
            expect(savedTask).toBeTruthy();
            expect(savedTask.name).toBe(newTask.task.name);
        });
    });

    // Test 3: Update Task
    describe('POST /task/update', () => {
        it('should update an existing task', async () => {
            // First create a task to update
            const task = {
                id: "update-test-task",
                name: "Task to Update",
                owner: testUser.id,
                isComplete: false
            };
            await db.collection('tasks').insertOne(task);

            // Update the task
            const updateData = {
                task: {
                    ...task,
                    name: "Updated Task Name",
                    isComplete: true
                }
            };

            const response = await request(app)
                .post('/task/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);

            // Verify task was updated in database
            const updatedTask = await db.collection('tasks').findOne({ id: task.id });
            expect(updatedTask).toBeTruthy();
            expect(updatedTask.name).toBe(updateData.task.name);
            expect(updatedTask.isComplete).toBe(true);
        });
    });
});
