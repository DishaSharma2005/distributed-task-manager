/**
 * Test setup: creates an in-memory MongoDB instance so tests
 * never touch a real database or require a MONGODB_URI env variable.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Before all tests: start in-memory MongoDB and connect Mongoose
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

// After all tests: disconnect and stop the in-memory server
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Between each test: wipe the tasks collection for a clean slate
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
