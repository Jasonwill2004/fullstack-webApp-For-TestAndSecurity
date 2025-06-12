import { assembleUserState } from '../../src/server/utility';
import { connectDB } from '../../src/server/connect-db';

// Mock the database connection and operations
jest.mock('../../src/server/connect-db', () => ({
    connectDB: jest.fn()
}));

describe('Utility Functions', () => {
    let mockDb;
    
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Setup mock database collections and methods
        mockDb = {
            collection: jest.fn().mockReturnThis(),
            find: jest.fn().mockReturnThis(),
            findOne: jest.fn(),
            toArray: jest.fn()
        };
        
        // Make connectDB return our mock database
        connectDB.mockResolvedValue(mockDb);
    });
    
    describe('assembleUserState', () => {
        it('should correctly assemble user state with tasks and comments', async () => {
            // Mock data
            const mockUser = { id: 'user1' };
            const mockTasks = [
                { id: 'task1', owner: 'user1' },
                { id: 'task2', owner: 'user2' }
            ];
            const mockComments = [
                { id: 'comment1', task: 'task1', owner: 'user2' }
            ];
            const mockUsers = [
                { id: 'user1', name: 'Test User 1' },
                { id: 'user2', name: 'Test User 2' }
            ];
            const mockGroups = [
                { id: 'group1', owner: 'user1' }
            ];
            
            // Setup mock returns
            mockDb.collection.mockImplementation((collectionName) => {
                switch(collectionName) {
                    case 'tasks':
                        return {
                            find: jest.fn().mockReturnThis(),
                            toArray: jest.fn().mockResolvedValue(mockTasks)
                        };
                    case 'comments':
                        return {
                            find: jest.fn().mockReturnThis(),
                            toArray: jest.fn().mockResolvedValue(mockComments)
                        };
                    case 'users':
                        return {
                            findOne: jest.fn().mockResolvedValue(mockUsers[0]),
                            find: jest.fn().mockReturnThis(),
                            toArray: jest.fn().mockResolvedValue([mockUsers[1]])
                        };
                    case 'groups':
                        return {
                            find: jest.fn().mockReturnThis(),
                            toArray: jest.fn().mockResolvedValue(mockGroups)
                        };
                }
            });
            
            // Execute the function
            const result = await assembleUserState(mockUser);
            
            // Assertions
            expect(result).toEqual({
                session: {
                    authenticated: 'AUTHENTICATED',
                    id: mockUser.id
                },
                tasks: mockTasks,
                comments: mockComments,
                users: [mockUsers[0], mockUsers[1]],
                groups: mockGroups
            });
            
            // Verify database calls
            expect(connectDB).toHaveBeenCalled();
            expect(mockDb.collection).toHaveBeenCalledWith('tasks');
            expect(mockDb.collection).toHaveBeenCalledWith('comments');
            expect(mockDb.collection).toHaveBeenCalledWith('users');
            expect(mockDb.collection).toHaveBeenCalledWith('groups');
        });
        
        it('should handle empty collections', async () => {
            // Mock user with no tasks, comments, or groups
            const mockUser = { id: 'user1' };
            
            // Setup mock returns for empty collections
            mockDb.collection.mockImplementation((collectionName) => ({
                find: jest.fn().mockReturnThis(),
                findOne: jest.fn().mockResolvedValue({ id: 'user1' }),
                toArray: jest.fn().mockResolvedValue([])
            }));
            
            // Execute the function
            const result = await assembleUserState(mockUser);
            
            // Assertions
            expect(result).toEqual({
                session: {
                    authenticated: 'AUTHENTICATED',
                    id: mockUser.id
                },
                tasks: [],
                comments: [],
                users: [{ id: 'user1' }],
                groups: []
            });
        });
        
        it('should handle database errors', async () => {
            const mockUser = { id: 'user1' };
            
            // Mock a database error
            mockDb.collection.mockImplementation(() => {
                throw new Error('Database error');
            });
            
            // Assert that the function throws an error
            await expect(assembleUserState(mockUser)).rejects.toThrow('Database error');
        });
    });
});
