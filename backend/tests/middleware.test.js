const jwt = require('jsonwebtoken');
const authMiddleware = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Token', () => {
    it('should call next() with valid token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key');

      mockReq.header.mockReturnValue(`Bearer ${token}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.id).toBe(userId);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should extract userId from token and attach to request', () => {
      const userId = '123456789';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key');

      mockReq.header.mockReturnValue(`Bearer ${token}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.id).toBe(userId);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 when no token is provided', () => {
      mockReq.header.mockReturnValue(undefined);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No token, authorization denied',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      mockReq.header.mockReturnValue('Bearer invalid-token');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token is not valid',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const userId = '507f1f77bcf86cd799439011';
      const expiredToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '-1s' } // Already expired
      );

      mockReq.header.mockReturnValue(`Bearer ${expiredToken}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token is not valid',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer prefix is missing', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key');

      mockReq.header.mockReturnValue(token); // Without "Bearer "

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token is not valid',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token has wrong signature', () => {
      const token = jwt.sign({ id: '123' }, 'wrong-secret');

      mockReq.header.mockReturnValue(`Bearer ${token}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token is not valid',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty Authorization header', () => {
      mockReq.header.mockReturnValue('');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Authorization header with only "Bearer"', () => {
      mockReq.header.mockReturnValue('Bearer ');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed token', () => {
      mockReq.header.mockReturnValue('Bearer malformed.token.here');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token is not valid',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
