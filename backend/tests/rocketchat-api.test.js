/**
 * Rocket.Chat API Integration Tests
 * 
 * These tests verify the backend API endpoints for Rocket.Chat integration.
 * 
 * Prerequisites:
 * 1. Rocket.Chat server must be running (see ROCKETCHAT_SETUP.md)
 * 2. Backend .env must have ROCKETCHAT_URL, ROCKETCHAT_ADMIN_USER, ROCKETCHAT_ADMIN_PASSWORD
 * 3. MongoDB must be running and connected
 * 
 * To run these tests:
 *   cd backend
 *   npm test -- rocketchat-api.test.js
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const axios = require('axios');

// Mock axios for Rocket.Chat API calls
jest.mock('axios');
const mockedAxios = axios;

describe('Rocket.Chat API Endpoints', () => {
  let mongoServer;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'patient',
      name: 'Test User',
    });

    // Generate JWT token for authentication
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    authToken = jwt.sign({ id: testUser._id }, JWT_SECRET, { expiresIn: '1h' });

    // Reset axios mocks
    jest.clearAllMocks();
  });

  describe('GET /api/rocketchat/login', () => {
    it('should return Rocket.Chat token for authenticated user', async () => {
      // Setup axios mock to handle multiple sequential calls
      // Call 1: Admin login
      mockedAxios.post.mockImplementationOnce((url) => {
        if (url.includes('/api/v1/login')) {
          return Promise.resolve({
            data: {
              status: 'success',
              data: {
                authToken: 'admin-token',
                userId: 'admin-user-id',
              },
            },
          });
        }
      });

      // Call 2: User lookup by username (fails - user doesn't exist)
      mockedAxios.get.mockImplementationOnce((url, config) => {
        if (url.includes('/api/v1/users.info')) {
          return Promise.reject({ response: { status: 404 } });
        }
      });

      // Call 3: User lookup by email (fails - user doesn't exist)
      mockedAxios.get.mockImplementationOnce((url, config) => {
        if (url.includes('/api/v1/users.list')) {
          return Promise.reject({ response: { status: 404 } });
        }
      });

      // Call 4: Create user
      mockedAxios.post.mockImplementationOnce((url, data, config) => {
        if (url.includes('/api/v1/users.create')) {
          return Promise.resolve({
            data: {
              success: true,
              user: {
                _id: 'rc-user-id',
                username: 'test',
                name: 'Test User',
                emails: [{ address: 'test@example.com' }],
              },
            },
          });
        }
      });

      // Call 5: Generate SSO token
      mockedAxios.post.mockImplementationOnce((url, data, config) => {
        if (url.includes('/api/v1/users.createToken')) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                authToken: 'user-sso-token',
              },
            },
          });
        }
      });

      const response = await request(app)
        .get('/api/rocketchat/login')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authToken');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('serverUrl');
      expect(response.body).toHaveProperty('username');
      expect(response.body.authToken).toBe('user-sso-token');
      expect(response.body.userId).toBe('rc-user-id');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/rocketchat/login');

      expect(response.status).toBe(401);
    });

    it('should handle Rocket.Chat server errors', async () => {
      // Mock admin login failure
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server error' } },
      });

      const response = await request(app)
        .get('/api/rocketchat/login')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/rocketchat/users', () => {
    beforeEach(() => {
      // Mock admin authentication for all tests
      mockedAxios.post.mockResolvedValue({
        data: {
          status: 'success',
          data: {
            authToken: 'admin-token',
            userId: 'admin-user-id',
          },
        },
      });
    });

    it('should return list of clinicians for patient user', async () => {
      // Create a clinician user
      const clinician = await User.create({
        email: 'clinician@example.com',
        password: 'hashedpassword',
        role: 'clinician',
        name: 'Dr. Smith',
      });

      // Setup mocks to handle the sequence of calls
      // 1. Admin login (if adminAuthToken is null)
      mockedAxios.post.mockImplementation((url, data, config) => {
        if (url && url.includes('/api/v1/login')) {
          return Promise.resolve({
            data: {
              status: 'success',
              data: {
                authToken: 'admin-token',
                userId: 'admin-user-id',
              },
            },
          });
        }
        // For user creation
        if (url && url.includes('/api/v1/users.create')) {
          return Promise.resolve({
            data: {
              success: true,
              user: {
                _id: 'rc-clinician-id',
                username: 'clinician',
                name: 'Dr. Smith',
                emails: [{ address: 'clinician@example.com' }],
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected POST call'));
      });

      // 2. User lookup by username (fails - user doesn't exist)
      mockedAxios.get.mockImplementation((url, config) => {
        if (url && url.includes('/api/v1/users.info')) {
          return Promise.reject({ response: { status: 404 } });
        }
        // For user list by email
        if (url && url.includes('/api/v1/users.list')) {
          return Promise.reject({ response: { status: 404 } });
        }
        return Promise.reject(new Error('Unexpected GET call'));
      });

      const response = await request(app)
        .get('/api/rocketchat/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users[0]).toHaveProperty('_id');
      expect(response.body.users[0]).toHaveProperty('username');
      expect(response.body.users[0]).toHaveProperty('email');
    });

    it('should return list of patients for clinician user', async () => {
      // Create clinician user and token
      const clinician = await User.create({
        email: 'clinician@example.com',
        password: 'hashedpassword',
        role: 'clinician',
        name: 'Dr. Smith',
      });

      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const clinicianToken = jwt.sign({ id: clinician._id }, JWT_SECRET, { expiresIn: '1h' });

      // Create a patient user
      const patient = await User.create({
        email: 'patient2@example.com',
        password: 'hashedpassword',
        role: 'patient',
        name: 'Patient Two',
      });

      // Setup mocks to handle the sequence of calls
      // 1. Admin login
      mockedAxios.post.mockImplementation((url, data, config) => {
        if (url && url.includes('/api/v1/login')) {
          return Promise.resolve({
            data: {
              status: 'success',
              data: {
                authToken: 'admin-token',
                userId: 'admin-user-id',
              },
            },
          });
        }
        // For user creation
        if (url && url.includes('/api/v1/users.create')) {
          return Promise.resolve({
            data: {
              success: true,
              user: {
                _id: 'rc-patient-id',
                username: 'patient2',
                name: 'Patient Two',
                emails: [{ address: 'patient2@example.com' }],
              },
            },
          });
        }
        return Promise.reject(new Error('Unexpected POST call'));
      });

      // 2. User lookup by username (fails - user doesn't exist)
      mockedAxios.get.mockImplementation((url, config) => {
        if (url && url.includes('/api/v1/users.info')) {
          return Promise.reject({ response: { status: 404 } });
        }
        // For user list by email
        if (url && url.includes('/api/v1/users.list')) {
          return Promise.reject({ response: { status: 404 } });
        }
        return Promise.reject(new Error('Unexpected GET call'));
      });

      const response = await request(app)
        .get('/api/rocketchat/users')
        .set('Authorization', `Bearer ${clinicianToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/rocketchat/users');

      expect(response.status).toBe(401);
    });

    it('should handle errors when Rocket.Chat is unavailable', async () => {
      // Reset all mocks
      jest.clearAllMocks();
      
      // Create a clinician user so there's someone to look up
      await User.create({
        email: 'clinician@example.com',
        password: 'hashedpassword',
        role: 'clinician',
        name: 'Dr. Smith',
      });
      
      // Mock all Rocket.Chat API calls to fail
      mockedAxios.post.mockImplementation((url) => {
        if (url && url.includes('/api/v1/login')) {
          const error = new Error('Rocket.Chat server error');
          error.response = { status: 500, data: { error: 'Rocket.Chat server error' } };
          return Promise.reject(error);
        }
        if (url && url.includes('/api/v1/users.create')) {
          const error = new Error('Rocket.Chat server error');
          error.response = { status: 500, data: { error: 'Rocket.Chat server error' } };
          return Promise.reject(error);
        }
        return Promise.reject(new Error('Unexpected POST call'));
      });

      mockedAxios.get.mockImplementation((url) => {
        const error = new Error('Rocket.Chat server error');
        error.response = { status: 500, data: { error: 'Rocket.Chat server error' } };
        return Promise.reject(error);
      });

      const response = await request(app)
        .get('/api/rocketchat/users')
        .set('Authorization', `Bearer ${authToken}`);

      // Note: The current implementation catches errors in the loop and returns
      // 200 with an empty array. If getAdminAuthToken fails at the top level,
      // it would return 500, but that's hard to test due to module-level state.
      // This test verifies that errors are handled gracefully.
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      // When Rocket.Chat is unavailable, users array will be empty due to caught errors
      expect(response.body.users.length).toBe(0);
    });
  });
});

