const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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
  await User.deleteMany({});
});

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email.toLowerCase());
      expect(savedUser.createdAt).toBeDefined();
    });

    it('should fail to create user without email', async () => {
      const user = new User({ password: 'password123' });

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail to create user without password', async () => {
      const user = new User({ email: 'test@example.com' });

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail to create user with invalid email', async () => {
      const user = new User({
        email: 'invalid-email',
        password: 'password123',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail to create user with password less than 6 characters', async () => {
      const user = new User({
        email: 'test@example.com',
        password: '12345',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const user = new User({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim email whitespace', async () => {
      const user = new User({
        email: '  test@example.com  ',
        password: 'password123',
      });
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'unique@example.com',
        password: 'password123',
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'mySecretPassword';
      const user = new User({
        email: 'hash@example.com',
        password: plainPassword,
      });
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(plainPassword);
      expect(savedUser.password.length).toBeGreaterThan(plainPassword.length);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should not rehash password if not modified', async () => {
      const user = new User({
        email: 'nohash@example.com',
        password: 'password123',
      });
      const savedUser = await user.save();
      const firstHash = savedUser.password;

      savedUser.email = 'newemail@example.com';
      await savedUser.save();

      expect(savedUser.password).toBe(firstHash);
    });

    it('should rehash password if modified', async () => {
      const user = new User({
        email: 'rehash@example.com',
        password: 'password123',
      });
      const savedUser = await user.save();
      const firstHash = savedUser.password;

      savedUser.password = 'newpassword123';
      await savedUser.save();

      expect(savedUser.password).not.toBe(firstHash);
    });
  });

  describe('comparePassword Method', () => {
    let user;
    const plainPassword = 'testPassword123';

    beforeEach(async () => {
      user = new User({
        email: 'compare@example.com',
        password: plainPassword,
      });
      await user.save();
    });

    it('should return true for correct password', async () => {
      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const isMatch = await user.comparePassword('');
      expect(isMatch).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const specialUser = new User({
        email: 'special@example.com',
        password: 'P@ssw0rd!#$%',
      });
      await specialUser.save();

      const isMatch = await specialUser.comparePassword('P@ssw0rd!#$%');
      expect(isMatch).toBe(true);
    });
  });

  describe('User Creation Timestamps', () => {
    it('should set createdAt timestamp on creation', async () => {
      const user = new User({
        email: 'timestamp@example.com',
        password: 'password123',
      });
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.createdAt).toBeInstanceOf(Date);
    });

    it('should have createdAt close to current time', async () => {
      const beforeCreate = new Date();
      const user = new User({
        email: 'timenow@example.com',
        password: 'password123',
      });
      const savedUser = await user.save();
      const afterCreate = new Date();

      expect(savedUser.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(savedUser.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('User Query Operations', () => {
    beforeEach(async () => {
      await User.create([
        { email: 'user1@example.com', password: 'password1' },
        { email: 'user2@example.com', password: 'password2' },
        { email: 'user3@example.com', password: 'password3' },
      ]);
    });

    it('should find user by email', async () => {
      const user = await User.findOne({ email: 'user1@example.com' });

      expect(user).toBeDefined();
      expect(user.email).toBe('user1@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await User.findOne({ email: 'nonexistent@example.com' });

      expect(user).toBeNull();
    });

    it('should find all users', async () => {
      const users = await User.find({});

      expect(users).toHaveLength(3);
    });

    it('should delete user by id', async () => {
      const user = await User.findOne({ email: 'user2@example.com' });
      await User.findByIdAndDelete(user._id);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();

      const remainingUsers = await User.find({});
      expect(remainingUsers).toHaveLength(2);
    });

    it('should update user email', async () => {
      const user = await User.findOne({ email: 'user3@example.com' });
      user.email = 'updated@example.com';
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.email).toBe('updated@example.com');
    });
  });
});
