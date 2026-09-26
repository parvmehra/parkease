const fs = require('fs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const LOCAL_MONGOD_FALLBACK = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';

let mongo;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(LOCAL_MONGOD_FALLBACK)) {
    process.env.MONGOMS_SYSTEM_BINARY = LOCAL_MONGOD_FALLBACK;
  }
  process.env.MONGOMS_RUNTIME_DOWNLOAD ||= process.env.MONGOMS_SYSTEM_BINARY ? 'false' : 'true';
  try {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(mongo.getUri(), { dbName: 'parkease_test' });
    global.__MONGO_READY__ = true;
  } catch (err) {
    global.__MONGO_READY__ = false;
    console.warn('MongoDB memory replica set unavailable; DB-backed tests will be skipped:', err.message);
  }
}, 120000);

afterEach(async () => {
  if (!global.__MONGO_READY__ || !mongoose.connection.db) return;
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
