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

describe('Auth API - Specific User Tests (vpalan4@stevens.edu)', () => {
  const testEmail = 'vpalan4@stevens.edu';
  const testPassword = 'vpalan@123';

  describe('Signup Tests', () => {
    it('should successfully signup with vpalan4@stevens.edu credentials', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('message', 'User created successfully');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('patient'); // Default role
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('should fail signup with duplicate vpalan4@stevens.edu email', async () => {
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      // Duplicate signup attempt
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Email already registered');
    });

    it('should hash password correctly for vpalan4@stevens.edu', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const user = await User.findOne({ email: testEmail });
      expect(user).toBeTruthy();
      expect(user.password).not.toBe(testPassword);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
      expect(user.email).toBe(testEmail);
      expect(user.role).toBe('patient');
    });

    it('should create user with correct timestamps', async () => {
      const beforeSignup = new Date();
      
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      const user = await User.findOne({ email: testEmail });
      const afterSignup = new Date();
      
      expect(user.createdAt).toBeTruthy();
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSignup.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterSignup.getTime());
    });
  });

  describe('Login Tests', () => {
    beforeEach(async () => {
      // Create user before each login test
      await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword });
    });

    it('should login successfully with vpalan4@stevens.edu credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('should fail login with incorrect password for vpalan4@stevens.edu', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should handle email case insensitivity correctly', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'VPALAN4@STEVENS.EDU', password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testEmail); // Should be lowercase
    });

    it('should generate valid JWT token for vpalan4@stevens.edu', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      const token = res.body.token;
      expect(token).toBeTruthy();
      
      // Verify token can be used to get user info
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.user.email).toBe(testEmail);
      expect(meRes.body.user.role).toBe('patient');
    });

    it('should handle multiple login attempts for vpalan4@stevens.edu', async () => {
      // First login
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      // Second login should also work
      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res1.body.token).toBeTruthy();
      expect(res2.body.token).toBeTruthy();
      expect(res1.body.user.email).toBe(testEmail);
      expect(res2.body.user.email).toBe(testEmail);
    });
  });

  describe('End-to-End Authentication Flow', () => {
    it('should complete full signup -> login -> get user flow for vpalan4@stevens.edu', async () => {
      // Step 1: Signup
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(signupRes.body.token).toBeTruthy();
      expect(signupRes.body.user.email).toBe(testEmail);

      // Step 2: Login with same credentials
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(loginRes.body.token).toBeTruthy();
      expect(loginRes.body.user.email).toBe(testEmail);

      // Step 3: Use token to get user info
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .expect(200);

      expect(meRes.body.user.email).toBe(testEmail);
      expect(meRes.body.user.role).toBe('patient');
      expect(meRes.body.user).not.toHaveProperty('password');
    });

    it('should handle password validation for vpalan4@stevens.edu', async () => {
      // Test that password meets minimum length requirement
      expect(testPassword.length).toBeGreaterThanOrEqual(6);
      
      // Signup should succeed with valid password
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(signupRes.body.user.email).toBe(testEmail);

      // Login should succeed with same password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(loginRes.body.user.email).toBe(testEmail);
    });

    it('should handle email validation for vpalan4@stevens.edu', async () => {
      // Test that email format is valid
      const emailRegex = /^\S+@\S+\.\S+$/;
      expect(testEmail).toMatch(emailRegex);
      
      // Signup should succeed with valid email
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(signupRes.body.user.email).toBe(testEmail);
    });
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
