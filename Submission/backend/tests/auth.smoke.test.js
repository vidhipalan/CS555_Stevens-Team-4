const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth smoke', () => {
  const email = 'vpalan4@stevens.edu';
  const password = 'vpalan@123';

  it('signup -> 201', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email, password })
      .expect(201);

    expect(res.body.user.email).toBe(email);
    expect(typeof res.body.token).toBe('string');
  });

  it('login -> 200', async () => {
    await request(app).post('/api/auth/signup').send({ email, password }).expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.user.email).toBe(email);
    expect(typeof res.body.token).toBe('string');
  });
});
