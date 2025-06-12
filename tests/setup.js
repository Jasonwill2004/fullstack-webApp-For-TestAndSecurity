// Test setup file
import { MongoClient } from 'mongodb';
import { connectDB } from '../src/server/connect-db';

// Increase test timeout
jest.setTimeout(10000);

// Setup global test environment
beforeAll(async () => {
    // You might want to use a test database instead of the production one
    process.env.MONGODB_URI = 'mongodb://localhost:27017/organizer_test';
    
    // Clear test database before all tests
    const client = await MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    const db = client.db();
    await db.dropDatabase();
    await client.close();
});

// Clean up after all tests
afterAll(async () => {
    const client = await MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    const db = client.db();
    await db.dropDatabase();
    await client.close();
});
