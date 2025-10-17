const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

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

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth API - Signup', () => {
  const validEmail = 'test@example.com';
  const validPassword = '123456';

  it('should create a user and return token on successful signup', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: validPassword })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(validEmail);
    expect(res.body.user.role).toBe('patient'); // Default role
    expect(res.body.user).not.toHaveProperty('password');
    expect(typeof res.body.token).toBe('string');
  });

  it('should fail signup with missing email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ password: validPassword })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('email');
  });

  it('should fail signup with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('password');
  });

  it('should fail signup with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'invalid-email', password: validPassword })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should fail signup with password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: '12345' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should fail signup with duplicate email', async () => {
    // First signup
    await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: validPassword })
      .expect(201);

    // Duplicate signup
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: validPassword })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('already registered');
  });

  it('should hash password before storing', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: validPassword });

    const user = await User.findOne({ email: validEmail });
    expect(user.password).not.toBe(validPassword);
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
  });
});

describe('Auth API - Login', () => {
  const validEmail = 'login@example.com';
  const validPassword = 'password123';

  beforeEach(async () => {
    // Create a user before each login test
    await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: validPassword });
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validEmail, password: validPassword })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(validEmail);
    expect(res.body.user.role).toBe('patient'); // Default role
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should fail login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validEmail, password: 'wrongpassword' })
      .expect(401);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Invalid');
  });

  it('should fail login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: validPassword })
      .expect(401);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Invalid');
  });

  it('should fail login with missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: validPassword })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should fail login with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validEmail })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});

describe('Auth API - Get Current User', () => {
  const validEmail = 'user@example.com';
  const validPassword = 'password123';
  let authToken;

  beforeEach(async () => {
    // Signup and get token
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: validEmail, password: validPassword });
    authToken = res.body.token;
  });

  it('should return user info with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(validEmail);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should fail without token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });

  it('should fail with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });
});

describe('Health Check', () => {
  it('should return ok status', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.body).toEqual({ ok: true });
  });
});
