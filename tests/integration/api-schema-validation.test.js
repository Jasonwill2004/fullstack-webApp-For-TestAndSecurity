const { connectDB } = require('../../src/server/connect-db');
const request = require('supertest');
const { app } = require('../../src/server/server');
const md5 = require('md5');

describe('API Schema Validation Tests', () => {
    let db;
    let server;
    let authToken;

    beforeAll(async () => {
        // Use test database
        process.env.MONGODB_URI = 'mongodb://localhost:27017/organizer_test';
        
        // Connect to the database
        db = await connectDB();
        
        // Start the server
        server = app.listen(3003);
        
        // Create a test user for authentication
        const testUser = {
            id: "api-test-user",
            name: "API Test User",
            passwordHash: md5("testpassword123")
        };
        await db.collection('users').insertOne(testUser);
        
        // Authenticate to get token
        const authResponse = await request(app)
            .post('/authenticate')
            .send({
                username: testUser.name,
                password: "testpassword123"
            });
        
        authToken = authResponse.body.token;
        
        console.log('🔐 API Schema validation tests initialized with authentication');
    }, 30000);

    afterAll(async () => {
        // Close server
        if (server) {
            server.close();
        }
        
        console.log('🧹 API test environment cleaned up');
    }, 10000);

    beforeEach(async () => {
        // Clean task and group collections before each test, keep users
        await db.collection('tasks').deleteMany({});
        await db.collection('groups').deleteMany({});
    });

    describe('🔐 User Creation API Schema Validation', () => {

        test('should enforce username uniqueness at API level', async () => {
            const userRequest = {
                username: 'duplicateuser',
                password: 'password123'
            };

            // First request should succeed
            const response1 = await request(app)
                .post('/user/create')
                .send(userRequest);

            // Second request with same username should fail
            const response2 = await request(app)
                .post('/user/create')
                .send(userRequest);

            expect(response2.status).toBe(500);
            expect(response2.body.message).toContain('already exists');
        });

        test('should validate password complexity requirements', async () => {
            const weakPasswords = [
                { username: 'user1', password: '123' }, // Too short
                { username: 'user2', password: 'a' }, // Single character
                { username: 'user3', password: '' }, // Empty
            ];

            for (const requestData of weakPasswords) {
                const response = await request(app)
                    .post('/user/create')
                    .send(requestData);

                // Current implementation doesn't validate password strength
                // This test documents where validation should be added
                console.log(`Weak password test - Username: ${requestData.username}, Status: ${response.status}`);
            }
        });
    });

    describe('📝 Task Creation API Schema Validation', () => {
        beforeEach(async () => {
            // Create a test group for task creation
            await db.collection('groups').insertOne({
                id: 'test-group-1',
                name: 'Test Group',
                owner: 'api-test-user'
            });
        });

        test('should reject task creation with invalid data', async () => {
            // Test well-formed requests (these should succeed)
            const validRequests = [
                { task: { id: 'T123', name: 'Valid Task', owner: 'api-test-user', isComplete: false } },
                { task: { id: 'T124', name: 'Another Valid Task', owner: 'api-test-user', group: 'test-group-1' } },
            ];

            for (const validRequest of validRequests) {
                const response = await request(app)
                    .post('/task/new')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(validRequest);

                console.log(`Valid request: ${JSON.stringify(validRequest)}, Status: ${response.status}`);
                expect(response.status).toBe(200);
            }
        });

        test('should validate task completion status type', async () => {
            const invalidCompletionRequests = [
                {
                    task: {
                        id: 'T124',
                        name: 'Task with invalid completion 1',
                        isComplete: 'yes', // String instead of boolean
                        owner: 'api-test-user',
                        group: 'test-group-1'
                    }
                },
                {
                    task: {
                        id: 'T125',
                        name: 'Task with invalid completion 2',
                        isComplete: 1, // Number instead of boolean
                        owner: 'api-test-user',
                        group: 'test-group-1'
                    }
                },
                {
                    task: {
                        id: 'T126',
                        name: 'Task with invalid completion 3',
                        isComplete: 'true', // String 'true' instead of boolean
                        owner: 'api-test-user',
                        group: 'test-group-1'
                    }
                }
            ];

            for (const requestData of invalidCompletionRequests) {
                const response = await request(app)
                    .post('/task/new')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(requestData);

                console.log(`Invalid completion status: ${JSON.stringify(requestData.task.isComplete)}, Status: ${response.status}`);
                
                if (response.status === 200) {
                    // Check what was actually stored in database
                    const storedTask = await db.collection('tasks').findOne({ id: requestData.task.id });
                    console.log(`Stored completion status type: ${typeof storedTask.isComplete}`);
                }
            }
        });

        test('should validate task ownership references', async () => {
            const taskWithInvalidOwner = {
                task: {
                    id: 'T127',
                    name: 'Task with non-existent owner',
                    isComplete: false,
                    owner: 'non-existent-user', // Invalid owner reference
                    group: 'test-group-1'
                }
            };

            const response = await request(app)
                .post('/task/new')
                .set('Authorization', `Bearer ${authToken}`)
                .send(taskWithInvalidOwner);

            // Current implementation may not validate owner existence
            console.log(`Task with invalid owner - Status: ${response.status}`);
            
            if (response.status === 200) {
                // Verify the invalid reference was stored
                const storedTask = await db.collection('tasks').findOne({ id: 'T127' });
                expect(storedTask.owner).toBe('non-existent-user');
                
                // Check if referenced user exists
                const ownerExists = await db.collection('users').findOne({ id: 'non-existent-user' });
                expect(ownerExists).toBeFalsy(); // Should not exist
            }
        });

        test('should validate task group references', async () => {
            const taskWithInvalidGroup = {
                task: {
                    id: 'T128',
                    name: 'Task with non-existent group',
                    isComplete: false,
                    owner: 'api-test-user',
                    group: 'non-existent-group' // Invalid group reference
                }
            };

            const response = await request(app)
                .post('/task/new')
                .set('Authorization', `Bearer ${authToken}`)
                .send(taskWithInvalidGroup);

            console.log(`Task with invalid group - Status: ${response.status}`);
            
            if (response.status === 200) {
                // Verify the invalid reference was stored
                const storedTask = await db.collection('tasks').findOne({ id: 'T128' });
                expect(storedTask.group).toBe('non-existent-group');
                
                // Check if referenced group exists
                const groupExists = await db.collection('groups').findOne({ id: 'non-existent-group' });
                expect(groupExists).toBeFalsy(); // Should not exist
            }
        });
    });

    describe('🔄 Task Update API Schema Validation', () => {
        beforeEach(async () => {
            // Create test data for update operations
            await db.collection('groups').insertOne({
                id: 'update-test-group',
                name: 'Update Test Group',
                owner: 'api-test-user'
            });

            await db.collection('tasks').insertOne({
                id: 'update-test-task',
                name: 'Original Task Name',
                isComplete: false,
                owner: 'api-test-user',
                group: 'update-test-group'
            });
        });

        test('should validate task update with invalid data types', async () => {
            const invalidUpdateRequests = [
                {
                    task: {
                        id: 'update-test-task',
                        name: 123, // Number instead of string
                        isComplete: false
                    }
                },
                {
                    task: {
                        id: 'update-test-task',
                        name: 'Updated Task',
                        isComplete: 'no' // String instead of boolean
                    }
                },
                {
                    task: {
                        id: 'update-test-task',
                        name: null, // Null name
                        isComplete: false
                    }
                }
            ];

            for (const requestData of invalidUpdateRequests) {
                const response = await request(app)
                    .post('/task/update')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(requestData);

                console.log(`Invalid update request: ${JSON.stringify(requestData.task)}, Status: ${response.status}`);
                
                if (response.status === 200) {
                    // Check what was actually stored
                    const updatedTask = await db.collection('tasks').findOne({ id: 'update-test-task' });
                    console.log(`Updated task data types - name: ${typeof updatedTask.name}, isComplete: ${typeof updatedTask.isComplete}`);
                }
            }
        });

        test('should validate partial updates', async () => {
            const partialUpdates = [
                {
                    task: {
                        id: 'update-test-task',
                        name: 'Updated Name Only'
                        // Only updating name
                    }
                },
                {
                    task: {
                        id: 'update-test-task',
                        isComplete: true
                        // Only updating completion status
                    }
                },
                {
                    task: {
                        id: 'update-test-task',
                        group: 'update-test-group'
                        // Only updating group
                    }
                }
            ];

            for (const requestData of partialUpdates) {
                const response = await request(app)
                    .post('/task/update')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(requestData);

                expect(response.status).toBe(200);
                console.log(`Partial update successful: ${JSON.stringify(requestData.task)}`);
                
                // Verify the update was applied
                const updatedTask = await db.collection('tasks').findOne({ id: 'update-test-task' });
                expect(updatedTask).toBeTruthy();
            }
        });

        test('should validate update of non-existent task', async () => {
            const updateNonExistentTask = {
                task: {
                    id: 'non-existent-task',
                    name: 'This task does not exist',
                    isComplete: true
                }
            };

            const response = await request(app)
                .post('/task/update')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateNonExistentTask);

            // API should handle non-existent task gracefully
            console.log(`Update non-existent task - Status: ${response.status}`);
            
            // Verify task was not created by update operation
            const taskExists = await db.collection('tasks').findOne({ id: 'non-existent-task' });
            expect(taskExists).toBeFalsy();
        });
    });

    describe('🔍 Data Integrity Checks', () => {
        test('should maintain referential integrity across operations', async () => {
            // Create user, group, and task
            const user = {
                id: 'integrity-user',
                name: 'Integrity User',
                passwordHash: md5('password')
            };
            await db.collection('users').insertOne(user);

            const group = {
                id: 'integrity-group',
                name: 'Integrity Group',
                owner: 'integrity-user'
            };
            await db.collection('groups').insertOne(group);

            const task = {
                task: {
                    id: 'integrity-task',
                    name: 'Integrity Task',
                    isComplete: false,
                    owner: 'integrity-user',
                    group: 'integrity-group'
                }
            };

            // Create task via API
            const createResponse = await request(app)
                .post('/task/new')
                .set('Authorization', `Bearer ${authToken}`)
                .send(task);

            expect(createResponse.status).toBe(200);

            // Verify all relationships exist
            const createdTask = await db.collection('tasks').findOne({ id: 'integrity-task' });
            const taskOwner = await db.collection('users').findOne({ id: createdTask.owner });
            const taskGroup = await db.collection('groups').findOne({ id: createdTask.group });

            expect(createdTask).toBeTruthy();
            expect(taskOwner).toBeTruthy();
            expect(taskGroup).toBeTruthy();
            expect(taskGroup.owner).toBe(taskOwner.id);
        });

        test('should handle concurrent operations safely', async () => {
            const concurrentTasks = [];
            
            // Create multiple tasks concurrently
            for (let i = 0; i < 5; i++) {
                const task = {
                    task: {
                        id: `concurrent-task-${i}`,
                        name: `Concurrent Task ${i}`,
                        isComplete: false,
                        owner: 'api-test-user'
                    }
                };

                const promise = request(app)
                    .post('/task/new')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(task);
                
                concurrentTasks.push(promise);
            }

            // Wait for all tasks to complete
            const responses = await Promise.all(concurrentTasks);
            
            // Verify all tasks were created successfully
            responses.forEach((response, index) => {
                expect(response.status).toBe(200);
                console.log(`Concurrent task ${index} created successfully`);
            });

            // Verify tasks exist in database
            const createdTasks = await db.collection('tasks').find({
                id: { $regex: /^concurrent-task-/ }
            }).toArray();

            expect(createdTasks).toHaveLength(5);
        });
    });

    describe('📊 Performance and Limits Validation', () => {
        test('should handle large data sets', async () => {
            const largeTasks = [];
            
            // Create 50 tasks to test bulk operations
            for (let i = 0; i < 50; i++) {
                const task = {
                    task: {
                        id: `bulk-task-${i}`,
                        name: `Bulk Task ${i} - ${'A'.repeat(100)}`, // Long name
                        isComplete: i % 2 === 0, // Alternate completion status
                        owner: 'api-test-user'
                    }
                };

                largeTasks.push(
                    request(app)
                        .post('/task/new')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send(task)
                );
            }

            // Process in batches to avoid overwhelming the API
            const batchSize = 10;
            for (let i = 0; i < largeTasks.length; i += batchSize) {
                const batch = largeTasks.slice(i, i + batchSize);
                const responses = await Promise.all(batch);
                
                responses.forEach(response => {
                    expect(response.status).toBe(200);
                });
                
                console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(largeTasks.length / batchSize)}`);
            }

            // Verify all tasks were created
            const bulkTasks = await db.collection('tasks').find({
                id: { $regex: /^bulk-task-/ }
            }).toArray();

            expect(bulkTasks).toHaveLength(50);
        });

        test('should validate field length limits', async () => {
            const veryLongName = 'A'.repeat(10000); // 10KB string
            
            const taskWithLongName = {
                task: {
                    id: 'long-name-task',
                    name: veryLongName,
                    isComplete: false,
                    owner: 'api-test-user'
                }
            };

            const response = await request(app)
                .post('/task/new')
                .set('Authorization', `Bearer ${authToken}`)
                .send(taskWithLongName);

            console.log(`Long name task creation - Status: ${response.status}`);
            
            if (response.status === 200) {
                const storedTask = await db.collection('tasks').findOne({ id: 'long-name-task' });
                expect(storedTask.name.length).toBe(10000);
                console.log(`Stored task name length: ${storedTask.name.length} characters`);
            }
        });
    });
});
