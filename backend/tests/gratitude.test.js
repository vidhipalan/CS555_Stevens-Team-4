const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Gratitude = require('../src/models/Gratitude');

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

describe('Gratitude API - Create Entry Validation', () => {
  let patientToken;
  let patientId;

  beforeEach(async () => {
    // Create a patient user
    const patientRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'patient@test.com', password: 'password123', role: 'patient' });
    patientToken = patientRes.body.token;
    patientId = patientRes.body.user.id;
  });

  // CODE SMELL #1: Testing duplicate validation logic
  it('should reject gratitude entry with content exceeding 2000 characters', async () => {
    const longContent = 'a'.repeat(2001);

    const res = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Test Entry',
        content: longContent
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('2000 character limit');
  });

  it('should reject gratitude entry with title exceeding 100 characters', async () => {
    const longTitle = 'a'.repeat(101);

    const res = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: longTitle,
        content: 'Test content'
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('100 character limit');
  });

  it('should accept gratitude entry with content at 2000 characters', async () => {
    const exactContent = 'a'.repeat(2000);

    const res = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Test Entry',
        content: exactContent
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.content).toBe(exactContent);
  });

  it('should accept gratitude entry with title at 100 characters', async () => {
    const exactTitle = 'a'.repeat(100);

    const res = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: exactTitle,
        content: 'Test content'
      })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe(exactTitle);
  });
});

describe('Gratitude API - Update Entry Validation', () => {
  let patientToken;
  let entryId;

  beforeEach(async () => {
    // Create a patient user
    const patientRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'patient@test.com', password: 'password123', role: 'patient' });
    patientToken = patientRes.body.token;

    // Create a gratitude entry
    const entryRes = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Original Title',
        content: 'Original content'
      });
    entryId = entryRes.body._id;
  });

  // CODE SMELL #1: Testing duplicate validation logic in update
  it('should reject update with content exceeding 2000 characters', async () => {
    const longContent = 'b'.repeat(2001);

    const res = await request(app)
      .put(`/api/gratitude/${entryId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        content: longContent
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('2000 character limit');
  });

  it('should reject update with title exceeding 100 characters', async () => {
    const longTitle = 'b'.repeat(101);

    const res = await request(app)
      .put(`/api/gratitude/${entryId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: longTitle
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('100 character limit');
  });

  it('should accept update with content at 2000 characters', async () => {
    const exactContent = 'b'.repeat(2000);

    const res = await request(app)
      .put(`/api/gratitude/${entryId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        content: exactContent
      })
      .expect(200);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.content).toBe(exactContent);
  });

  it('should accept update with title at 100 characters', async () => {
    const exactTitle = 'b'.repeat(100);

    const res = await request(app)
      .put(`/api/gratitude/${entryId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: exactTitle
      })
      .expect(200);

    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe(exactTitle);
  });
});

describe('Gratitude API - Clinician Access', () => {
  let clinicianToken;
  let patientToken;
  let patientId;

  beforeEach(async () => {
    // Create a clinician user
    const clinicianRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'clinician@test.com', password: 'password123', role: 'clinician' });
    clinicianToken = clinicianRes.body.token;

    // Create a patient user
    const patientRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'patient@test.com', password: 'password123', role: 'patient' });
    patientToken = patientRes.body.token;
    patientId = patientRes.body.user.id;

    // Create some gratitude entries as patient
    await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Patient Entry 1',
        content: 'Patient content 1'
      });

    await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Patient Entry 2',
        content: 'Patient content 2'
      });
  });

  // CODE SMELL #2: Testing duplicate clinician authorization check
  it('should allow clinician to view all patient gratitude entries', async () => {
    const res = await request(app)
      .get('/api/gratitude/all-patients')
      .set('Authorization', `Bearer ${clinicianToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThan(0);
  });

  it('should deny patient access to all-patients gratitude endpoint', async () => {
    const res = await request(app)
      .get('/api/gratitude/all-patients')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Clinicians only');
  });

  it('should deny unauthenticated access to all-patients gratitude endpoint', async () => {
    const res = await request(app)
      .get('/api/gratitude/all-patients')
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });
});

describe('Mood API - Clinician Access', () => {
  let clinicianToken;
  let patientToken;
  let patientId;

  beforeEach(async () => {
    // Create a clinician user
    const clinicianRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'clinician@test.com', password: 'password123', role: 'clinician' });
    clinicianToken = clinicianRes.body.token;

    // Create a patient user
    const patientRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'patient@test.com', password: 'password123', role: 'patient' });
    patientToken = patientRes.body.token;
    patientId = patientRes.body.user.id;
  });

  // CODE SMELL #2: Testing duplicate clinician authorization check in mood controller
  it('should allow clinician to view all patient moods', async () => {
    const res = await request(app)
      .get('/api/moods/all-patients')
      .set('Authorization', `Bearer ${clinicianToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should deny patient access to all-patients mood endpoint', async () => {
    const res = await request(app)
      .get('/api/moods/all-patients')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Clinicians only');
  });
});

describe('Auth API - Clinician Access to Patients', () => {
  let clinicianToken;
  let patientToken;

  beforeEach(async () => {
    // Create a clinician user
    const clinicianRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'clinician@test.com', password: 'password123', role: 'clinician' });
    clinicianToken = clinicianRes.body.token;

    // Create a patient user
    const patientRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'patient@test.com', password: 'password123', role: 'patient' });
    patientToken = patientRes.body.token;
  });

  // CODE SMELL #2: Testing duplicate clinician authorization check in auth controller
  it('should allow clinician to view all patients', async () => {
    const res = await request(app)
      .get('/api/auth/patients')
      .set('Authorization', `Bearer ${clinicianToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should deny patient access to all patients endpoint', async () => {
    const res = await request(app)
      .get('/api/auth/patients')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Clinicians only');
  });
});
