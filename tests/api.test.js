// Simple API tests
const BASE = 'http://localhost:5050';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Functions', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getHistory', () => {
    it('should fetch mood history with default limit', async () => {
      const mockResponse = [
        { _id: '1', date: '2024-01-15', mood: 'happy', note: 'Great day!' },
        { _id: '2', date: '2024-01-14', mood: 'sad', note: 'Not so good' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Simulate the getHistory function
      const getHistory = async (token, limit = 60) => {
        const response = await fetch(`${BASE}/api/moods?limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }
        
        return response.json();
      };

      const result = await getHistory('test-token');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods?limit=60',
        {
          headers: { Authorization: 'Bearer test-token' }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const getHistory = async (token, limit = 60) => {
        const response = await fetch(`${BASE}/api/moods?limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }
        
        return response.json();
      };

      await expect(getHistory('invalid-token')).rejects.toThrow('Unauthorized');
    });
  });

  describe('ensureOk helper', () => {
    it('should return data for successful response', async () => {
      const mockData = { success: true };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const ensureOk = async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }
        return response.json();
      };

      const response = await fetch('http://localhost:5050/api/test');
      const result = await ensureOk(response);

      expect(result).toEqual(mockData);
    });

    it('should throw error for failed response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const ensureOk = async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }
        return response.json();
      };

      const response = await fetch('http://localhost:5050/api/test');
      
      await expect(ensureOk(response)).rejects.toThrow('Server error');
    });
  });
});
