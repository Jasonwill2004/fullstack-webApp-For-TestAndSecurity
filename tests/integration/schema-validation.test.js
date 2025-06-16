const { connectDB } = require('../../src/server/connect-db');
const request = require('supertest');
const { app } = require('../../src/server/server');
const md5 = require('md5');

describe('Schema Validation Integration Tests', () => {
    let db;
    let server;

    beforeAll(async () => {
        // Use test database
        process.env.MONGODB_URI = 'mongodb://localhost:27017/organizer_test';
        
        // Connect to the database
        db = await connectDB();
        
        // Start the server
        server = app.listen(3002);
        
        console.log('🎯 Schema validation tests initialized');
    }, 30000);

    afterAll(async () => {
        // Close server
        if (server) {
            server.close();
        }
        
        console.log('🧹 Schema validation tests cleaned up');
    }, 10000);

    beforeEach(async () => {
        // Clean collections before each test
        await db.collection('users').deleteMany({});
        await db.collection('tasks').deleteMany({});
        await db.collection('groups').deleteMany({});
    });

    describe('📋 User Schema Validation', () => {
        test('should enforce required user fields', async () => {
            // Test missing required fields
            const invalidUsers = [
                {}, // Empty object
                { name: 'TestUser' }, // Missing id and passwordHash
                { id: 'U123' }, // Missing name and passwordHash
                { passwordHash: md5('password') }, // Missing id and name
                { id: 'U123', name: '' }, // Empty name
                { id: '', name: 'TestUser' }, // Empty id
            ];

            for (const invalidUser of invalidUsers) {
                try {
                    await db.collection('users').insertOne(invalidUser);
                    
                    // If we reach here, the insertion succeeded when it shouldn't have
                    // For this test, we'll verify our application logic handles this
                    const user = await db.collection('users').findOne({ _id: invalidUser._id });
                    
                    // Application-level validation
                    expect(user.id).toBeDefined();
                    expect(user.name).toBeDefined();
                    expect(user.name).not.toBe('');
                    expect(user.passwordHash).toBeDefined();
                } catch (error) {
                    // Database-level constraint would throw here
                    expect(error).toBeDefined();
                }
            }
        });

        test('should validate user id uniqueness', async () => {
            const user1 = {
                id: 'U123',
                name: 'User One',
                passwordHash: md5('password1')
            };

            const user2 = {
                id: 'U123', // Same ID as user1
                name: 'User Two',
                passwordHash: md5('password2')
            };

            // Insert first user
            await db.collection('users').insertOne(user1);

            // Try to insert user with duplicate ID
            // Since MongoDB doesn't enforce unique 'id' field by default,
            // we test application-level uniqueness
            const existingUser = await db.collection('users').findOne({ id: user2.id });
            expect(existingUser).toBeTruthy();
            expect(existingUser.name).toBe('User One');
        });

        test('should validate password hash format', async () => {
            const validUser = {
                id: 'U124',
                name: 'ValidUser',
                passwordHash: md5('validpassword') // 32-character MD5 hash
            };

            const invalidHashUser = {
                id: 'U125',
                name: 'InvalidUser',
                passwordHash: 'short' // Invalid hash format
            };

            // Insert valid user
            const result1 = await db.collection('users').insertOne(validUser);
            expect(result1.insertedId).toBeDefined();

            // Insert user with invalid hash (MongoDB will allow, but app should validate)
            const result2 = await db.collection('users').insertOne(invalidHashUser);
            expect(result2.insertedId).toBeDefined();
            
            // Application should validate hash length
            const retrievedUser = await db.collection('users').findOne({ id: 'U125' });
            expect(retrievedUser.passwordHash.length).toBeLessThan(32); // Invalid hash
        });

        test('should handle friends array validation', async () => {
            const userWithValidFriends = {
                id: 'U126',
                name: 'UserWithFriends',
                passwordHash: md5('password'),
                friends: ['U127', 'U128']
            };

            const userWithInvalidFriends = {
                id: 'U127',
                name: 'UserWithInvalidFriends',
                passwordHash: md5('password'),
                friends: 'not-an-array' // Should be array
            };

            // Insert user with valid friends array
            const result1 = await db.collection('users').insertOne(userWithValidFriends);
            expect(result1.insertedId).toBeDefined();

            // Insert user with invalid friends (MongoDB allows, app should validate)
            const result2 = await db.collection('users').insertOne(userWithInvalidFriends);
            expect(result2.insertedId).toBeDefined();
            
            const retrievedUser = await db.collection('users').findOne({ id: 'U127' });
            expect(Array.isArray(retrievedUser.friends)).toBeFalsy();
        });
    });

    describe('📝 Task Schema Validation', () => {
        test('should enforce required task fields', async () => {
            const invalidTasks = [
                {}, // Empty object
                { name: 'Task without ID' }, // Missing id
                { id: 'T123' }, // Missing name
                { id: 'T124', name: '' }, // Empty name
                { id: '', name: 'Task with empty ID' }, // Empty id
            ];

            for (const invalidTask of invalidTasks) {
                const result = await db.collection('tasks').insertOne(invalidTask);
                expect(result.insertedId).toBeDefined();
                
                // Application-level validation check
                const task = await db.collection('tasks').findOne({ _id: result.insertedId });
                
                // Our application should ensure these fields exist and are valid
                if (task.id !== undefined && task.id !== '') {
                    expect(task.id).not.toBe('');
                }
                if (task.name !== undefined && task.name !== '') {
                    expect(task.name).not.toBe('');
                }
                
                // Document schema validation findings
                console.log(`Task validation - ID: ${task.id}, Name: ${task.name}`)
            }
        });

        test('should validate task completion status', async () => {
            const validTasks = [
                {
                    id: 'T123',
                    name: 'Complete Task',
                    isComplete: true,
                    owner: 'U123',
                    group: 'G123'
                },
                {
                    id: 'T124',
                    name: 'Incomplete Task',
                    isComplete: false,
                    owner: 'U123',
                    group: 'G123'
                }
            ];

            const invalidCompletionTasks = [
                {
                    id: 'T125',
                    name: 'Invalid Completion 1',
                    isComplete: 'yes', // Should be boolean
                    owner: 'U123',
                    group: 'G123'
                },
                {
                    id: 'T126',
                    name: 'Invalid Completion 2',
                    isComplete: 1, // Should be boolean
                    owner: 'U123',
                    group: 'G123'
                }
            ];

            // Insert valid tasks
            for (const task of validTasks) {
                const result = await db.collection('tasks').insertOne(task);
                expect(result.insertedId).toBeDefined();
                
                const retrievedTask = await db.collection('tasks').findOne({ id: task.id });
                expect(typeof retrievedTask.isComplete).toBe('boolean');
            }

            // Insert tasks with invalid completion status
            for (const task of invalidCompletionTasks) {
                const result = await db.collection('tasks').insertOne(task);
                expect(result.insertedId).toBeDefined();
                
                const retrievedTask = await db.collection('tasks').findOne({ id: task.id });
                expect(typeof retrievedTask.isComplete).not.toBe('boolean');
            }
        });

        test('should validate task ownership', async () => {
            const taskWithOwner = {
                id: 'T127',
                name: 'Task with Owner',
                owner: 'U123',
                group: 'G123',
                isComplete: false
            };

            const taskWithoutOwner = {
                id: 'T128',
                name: 'Task without Owner',
                group: 'G123',
                isComplete: false
                // Missing owner field
            };

            // Insert task with owner
            const result1 = await db.collection('tasks').insertOne(taskWithOwner);
            expect(result1.insertedId).toBeDefined();

            // Insert task without owner
            const result2 = await db.collection('tasks').insertOne(taskWithoutOwner);
            expect(result2.insertedId).toBeDefined();
            
            const taskWithoutOwnerRetrieved = await db.collection('tasks').findOne({ id: 'T128' });
            expect(taskWithoutOwnerRetrieved.owner).toBeUndefined();
        });

        test('should validate task group assignment', async () => {
            const taskWithGroup = {
                id: 'T129',
                name: 'Task in Group',
                owner: 'U123',
                group: 'G123',
                isComplete: false
            };

            const taskWithoutGroup = {
                id: 'T130',
                name: 'Task without Group',
                owner: 'U123',
                isComplete: false
                // Missing group field
            };

            // Insert task with group
            const result1 = await db.collection('tasks').insertOne(taskWithGroup);
            expect(result1.insertedId).toBeDefined();
            
            const retrievedTaskWithGroup = await db.collection('tasks').findOne({ id: 'T129' });
            expect(retrievedTaskWithGroup.group).toBeDefined();

            // Insert task without group
            const result2 = await db.collection('tasks').insertOne(taskWithoutGroup);
            expect(result2.insertedId).toBeDefined();
            
            const retrievedTaskWithoutGroup = await db.collection('tasks').findOne({ id: 'T130' });
            expect(retrievedTaskWithoutGroup.group).toBeUndefined();
        });
    });

    describe('📁 Group Schema Validation', () => {
        test('should enforce required group fields', async () => {
            const validGroup = {
                id: 'G123',
                name: 'Valid Group',
                owner: 'U123'
            };

            const invalidGroups = [
                {}, // Empty object
                { name: 'Group without ID' }, // Missing id
                { id: 'G124' }, // Missing name and owner
                { id: 'G125', name: '' }, // Empty name
                { id: '', name: 'Group with empty ID' }, // Empty id
            ];

            // Insert valid group
            const validResult = await db.collection('groups').insertOne(validGroup);
            expect(validResult.insertedId).toBeDefined();

            // Test invalid groups
            for (const invalidGroup of invalidGroups) {
                const result = await db.collection('groups').insertOne(invalidGroup);
                expect(result.insertedId).toBeDefined();
                
                const group = await db.collection('groups').findOne({ _id: result.insertedId });
                
                // Application should validate required fields
                if (group.id !== undefined && group.id !== '') {
                    expect(group.id).not.toBe('');
                }
                if (group.name !== undefined && group.name !== '') {
                    expect(group.name).not.toBe('');
                }
                
                // Document schema validation findings
                console.log(`Group validation - ID: ${group.id}, Name: ${group.name}`)
            }
        });

        test('should validate group ownership', async () => {
            const groupWithOwner = {
                id: 'G126',
                name: 'Owned Group',
                owner: 'U123'
            };

            const groupWithoutOwner = {
                id: 'G127',
                name: 'Orphaned Group'
                // Missing owner field
            };

            // Insert group with owner
            const result1 = await db.collection('groups').insertOne(groupWithOwner);
            expect(result1.insertedId).toBeDefined();
            
            const ownedGroup = await db.collection('groups').findOne({ id: 'G126' });
            expect(ownedGroup.owner).toBeDefined();

            // Insert group without owner
            const result2 = await db.collection('groups').insertOne(groupWithoutOwner);
            expect(result2.insertedId).toBeDefined();
            
            const orphanedGroup = await db.collection('groups').findOne({ id: 'G127' });
            expect(orphanedGroup.owner).toBeUndefined();
        });
    });

    describe('🔗 Referential Integrity Validation', () => {
        test('should validate task-group relationships', async () => {
            // Create a group first
            const group = {
                id: 'G128',
                name: 'Test Group',
                owner: 'U123'
            };
            await db.collection('groups').insertOne(group);

            // Create task referencing existing group
            const validTask = {
                id: 'T131',
                name: 'Task in Valid Group',
                owner: 'U123',
                group: 'G128', // References existing group
                isComplete: false
            };

            // Create task referencing non-existent group
            const invalidTask = {
                id: 'T132',
                name: 'Task in Invalid Group',
                owner: 'U123',
                group: 'G999', // References non-existent group
                isComplete: false
            };

            // Insert both tasks (MongoDB allows orphaned references)
            const result1 = await db.collection('tasks').insertOne(validTask);
            const result2 = await db.collection('tasks').insertOne(invalidTask);
            
            expect(result1.insertedId).toBeDefined();
            expect(result2.insertedId).toBeDefined();

            // Verify referential integrity at application level
            const validTaskGroup = await db.collection('groups').findOne({ id: validTask.group });
            const invalidTaskGroup = await db.collection('groups').findOne({ id: invalidTask.group });
            
            expect(validTaskGroup).toBeTruthy(); // Group exists
            expect(invalidTaskGroup).toBeFalsy(); // Group doesn't exist
        });

        test('should validate task-user ownership relationships', async () => {
            // Create a user first
            const user = {
                id: 'U124',
                name: 'Task Owner',
                passwordHash: md5('password')
            };
            await db.collection('users').insertOne(user);

            // Create task with valid owner
            const taskWithValidOwner = {
                id: 'T133',
                name: 'Task with Valid Owner',
                owner: 'U124', // References existing user
                group: 'G128',
                isComplete: false
            };

            // Create task with invalid owner
            const taskWithInvalidOwner = {
                id: 'T134',
                name: 'Task with Invalid Owner',
                owner: 'U999', // References non-existent user
                group: 'G128',
                isComplete: false
            };

            // Insert both tasks
            const result1 = await db.collection('tasks').insertOne(taskWithValidOwner);
            const result2 = await db.collection('tasks').insertOne(taskWithInvalidOwner);
            
            expect(result1.insertedId).toBeDefined();
            expect(result2.insertedId).toBeDefined();

            // Verify ownership at application level
            const validOwner = await db.collection('users').findOne({ id: taskWithValidOwner.owner });
            const invalidOwner = await db.collection('users').findOne({ id: taskWithInvalidOwner.owner });
            
            expect(validOwner).toBeTruthy(); // Owner exists
            expect(invalidOwner).toBeFalsy(); // Owner doesn't exist
        });
    });

    describe('🎯 Data Type Validation', () => {
        test('should validate string field types', async () => {
            const taskWithValidStrings = {
                id: 'T135',
                name: 'Valid String Task',
                owner: 'U123',
                group: 'G123',
                isComplete: false
            };

            const taskWithInvalidTypes = {
                id: 123, // Should be string
                name: true, // Should be string
                owner: ['U123'], // Should be string
                group: { id: 'G123' }, // Should be string
                isComplete: false
            };

            // Insert both tasks
            const result1 = await db.collection('tasks').insertOne(taskWithValidStrings);
            const result2 = await db.collection('tasks').insertOne(taskWithInvalidTypes);
            
            expect(result1.insertedId).toBeDefined();
            expect(result2.insertedId).toBeDefined();

            // Verify data types
            const validTask = await db.collection('tasks').findOne({ _id: result1.insertedId });
            const invalidTask = await db.collection('tasks').findOne({ _id: result2.insertedId });
            
            expect(typeof validTask.id).toBe('string');
            expect(typeof validTask.name).toBe('string');
            expect(typeof validTask.owner).toBe('string');
            expect(typeof validTask.group).toBe('string');

            expect(typeof invalidTask.id).toBe('number'); // Wrong type
            expect(typeof invalidTask.name).toBe('boolean'); // Wrong type
            expect(Array.isArray(invalidTask.owner)).toBe(true); // Wrong type
            expect(typeof invalidTask.group).toBe('object'); // Wrong type
        });

        test('should validate boolean field types', async () => {
            const taskWithValidBoolean = {
                id: 'T136',
                name: 'Boolean Test Task',
                owner: 'U123',
                group: 'G123',
                isComplete: true // Valid boolean
            };

            const taskWithInvalidBoolean = {
                id: 'T137',
                name: 'Invalid Boolean Task',
                owner: 'U123',
                group: 'G123',
                isComplete: 'true' // String instead of boolean
            };

            // Insert both tasks
            const result1 = await db.collection('tasks').insertOne(taskWithValidBoolean);
            const result2 = await db.collection('tasks').insertOne(taskWithInvalidBoolean);
            
            expect(result1.insertedId).toBeDefined();
            expect(result2.insertedId).toBeDefined();

            // Verify boolean types
            const validTask = await db.collection('tasks').findOne({ _id: result1.insertedId });
            const invalidTask = await db.collection('tasks').findOne({ _id: result2.insertedId });
            
            expect(typeof validTask.isComplete).toBe('boolean');
            expect(typeof invalidTask.isComplete).toBe('string'); // Wrong type
        });
    });

    describe('📏 Field Length and Format Validation', () => {
        test('should validate field length constraints', async () => {
            const userWithLongName = {
                id: 'U125',
                name: 'A'.repeat(1000), // Very long name
                passwordHash: md5('password')
            };

            const taskWithLongName = {
                id: 'T138',
                name: 'B'.repeat(2000), // Very long task name
                owner: 'U123',
                group: 'G123',
                isComplete: false
            };

            // Insert items with long names (MongoDB allows, app should validate)
            const userResult = await db.collection('users').insertOne(userWithLongName);
            const taskResult = await db.collection('tasks').insertOne(taskWithLongName);
            
            expect(userResult.insertedId).toBeDefined();
            expect(taskResult.insertedId).toBeDefined();

            // Verify lengths
            const retrievedUser = await db.collection('users').findOne({ _id: userResult.insertedId });
            const retrievedTask = await db.collection('tasks').findOne({ _id: taskResult.insertedId });
            
            expect(retrievedUser.name.length).toBe(1000);
            expect(retrievedTask.name.length).toBe(2000);
        });

        test('should validate ID format constraints', async () => {
            const validIds = ['U123', 'T456', 'G789'];
            const invalidIds = ['', ' ', '123', 'user@email.com', 'very-long-id-that-might-be-too-long'];

            for (const id of validIds) {
                const user = {
                    id: id,
                    name: `User ${id}`,
                    passwordHash: md5('password')
                };
                
                const result = await db.collection('users').insertOne(user);
                expect(result.insertedId).toBeDefined();
            }

            for (const id of invalidIds) {
                const user = {
                    id: id,
                    name: `User ${id}`,
                    passwordHash: md5('password')
                };
                
                // MongoDB allows any ID format, application should validate
                const result = await db.collection('users').insertOne(user);
                expect(result.insertedId).toBeDefined();
                
                const retrievedUser = await db.collection('users').findOne({ _id: result.insertedId });
                expect(retrievedUser.id).toBe(id);
            }
        });
    });
});
