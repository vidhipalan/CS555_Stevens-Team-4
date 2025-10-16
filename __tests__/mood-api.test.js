/**
 * @jest-environment jsdom
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock the environment variable
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:5050';

// Import the functions to test
const { getToday, saveToday, getHistory } = require('../app/api/moods');

describe('Mood API Functions', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getToday', () => {
    it('should fetch mood for today when no date provided', async () => {
      const mockResponse = {
        mood: 'happy',
        note: 'Great day!',
        date: '2024-01-15T00:00:00.000Z'
      };

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await getToday('fake-token');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods/today',
        {
          headers: { Authorization: 'Bearer fake-token' }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch mood for specific date', async () => {
      const mockResponse = {
        mood: 'sad',
        note: 'Not a good day',
        date: '2024-01-16T00:00:00.000Z'
      };

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await getToday('fake-token', '2024-01-16');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods/today?date=2024-01-16',
        {
          headers: { Authorization: 'Bearer fake-token' }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return null when no mood found', async () => {
      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(null)
      });

      const result = await getToday('fake-token');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getToday('fake-token')).rejects.toThrow('Network error');
    });
  });

  describe('saveToday', () => {
    it('should save mood successfully', async () => {
      const mockResponse = {
        _id: '507f1f77bcf86cd799439011',
        mood: 'excited',
        note: 'Amazing day!',
        date: '2024-01-17T00:00:00.000Z',
        userId: '507f1f77bcf86cd799439012'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await saveToday('fake-token', 'excited', 'Amazing day!', '2024-01-17');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-token'
          },
          body: JSON.stringify({
            mood: 'excited',
            note: 'Amazing day!',
            date: '2024-01-17'
          })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should save mood without note', async () => {
      const mockResponse = {
        _id: '507f1f77bcf86cd799439013',
        mood: 'neutral',
        note: '',
        date: '2024-01-18T00:00:00.000Z',
        userId: '507f1f77bcf86cd799439012'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await saveToday('fake-token', 'neutral', '', '2024-01-18');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-token'
          },
          body: JSON.stringify({
            mood: 'neutral',
            note: '',
            date: '2024-01-18'
          })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Mood already logged for this date' })
      });

      await expect(saveToday('fake-token', 'happy', 'Test', '2024-01-19'))
        .rejects.toThrow('Mood already logged for this date');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(saveToday('fake-token', 'happy', 'Test', '2024-01-20'))
        .rejects.toThrow('Network error');
    });

    it('should pass note as provided (trimming handled by caller)', async () => {
      const mockResponse = {
        _id: '507f1f77bcf86cd799439014',
        mood: 'tired',
        note: '  Trimmed note  ',
        date: '2024-01-21T00:00:00.000Z',
        userId: '507f1f77bcf86cd799439012'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      await saveToday('fake-token', 'tired', '  Trimmed note  ', '2024-01-21');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-token'
          },
          body: JSON.stringify({
            mood: 'tired',
            note: '  Trimmed note  ',
            date: '2024-01-21'
          })
        }
      );
    });
  });

  describe('getHistory', () => {
    it('should fetch mood history with default limit', async () => {
      const mockResponse = [
        {
          _id: '507f1f77bcf86cd799439015',
          mood: 'happy',
          note: 'Great day',
          date: '2024-01-22T00:00:00.000Z'
        },
        {
          _id: '507f1f77bcf86cd799439016',
          mood: 'sad',
          note: 'Not great',
          date: '2024-01-21T00:00:00.000Z'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await getHistory('fake-token');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods?limit=60',
        {
          headers: { Authorization: 'Bearer fake-token' }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch mood history with custom limit', async () => {
      const mockResponse = [
        {
          _id: '507f1f77bcf86cd799439017',
          mood: 'excited',
          note: 'Weekend!',
          date: '2024-01-23T00:00:00.000Z'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await getHistory('fake-token', 30);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/moods?limit=30',
        {
          headers: { Authorization: 'Bearer fake-token' }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Failed to fetch mood history' })
      });

      await expect(getHistory('fake-token'))
        .rejects.toThrow('Failed to fetch mood history');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getHistory('fake-token'))
        .rejects.toThrow('Network error');
    });
  });

  describe('ensureOk helper function', () => {
    it('should throw error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Server error' })
      });

      await expect(saveToday('fake-token', 'happy', 'Test', '2024-01-24'))
        .rejects.toThrow('Server error');
    });

    it('should throw generic error when no error message provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({})
      });

      await expect(saveToday('fake-token', 'happy', 'Test', '2024-01-25'))
        .rejects.toThrow('Request failed');
    });
  });
});
