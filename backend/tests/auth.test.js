const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

describe('Auth API', () => {
  const email = 'test@example.com';
  const password = '123456';

  it('Signup creates a user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')     
      .send({ email, password })
      .expect(201);                 

    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('Login authenticates and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body).toHaveProperty('token');
  });
});

