const { emojiFor, capitalize, formatDate } = require('../app/utils/moodUtils');

describe('Mood Utils', () => {
  describe('emojiFor', () => {
    it('should return correct emoji for each valid mood', () => {
      expect(emojiFor('happy')).toBe('😊');
      expect(emojiFor('excited')).toBe('🤩');
      expect(emojiFor('neutral')).toBe('😐');
      expect(emojiFor('tired')).toBe('🥱');
      expect(emojiFor('anxious')).toBe('😟');
      expect(emojiFor('sad')).toBe('😔');
      expect(emojiFor('angry')).toBe('😠');
    });

    it('should return default emoji for invalid mood', () => {
      expect(emojiFor('invalid')).toBe('🙂');
      expect(emojiFor('')).toBe('🙂');
      expect(emojiFor('unknown')).toBe('🙂');
    });

    it('should handle case sensitivity', () => {
      expect(emojiFor('Happy')).toBe('🙂'); // Should be case sensitive
      expect(emojiFor('HAPPY')).toBe('🙂'); // Should be case sensitive
    });

    it('should handle null and undefined', () => {
      expect(emojiFor(null)).toBe('🙂');
      expect(emojiFor(undefined)).toBe('🙂');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter of string', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
      expect(capitalize('mood')).toBe('Mood');
    });

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('z')).toBe('Z');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle strings that are already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('WORLD');
    });

    it('should handle strings with numbers', () => {
      expect(capitalize('123abc')).toBe('123abc');
      expect(capitalize('abc123')).toBe('Abc123');
    });

    it('should handle special characters', () => {
      expect(capitalize('!hello')).toBe('!hello');
      expect(capitalize('@world')).toBe('@world');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date string correctly', () => {
      expect(formatDate('2024-01-15T10:30:00.000Z')).toBe('01/15/2024');
      expect(formatDate('2024-12-31T23:59:59.999Z')).toBe('12/31/2024');
      expect(formatDate('2024-02-29T00:00:00.000Z')).toBe('02/29/2024'); // Leap year
    });

    it('should handle dates with different times', () => {
      expect(formatDate('2024-01-15T00:00:00.000Z')).toBe('01/15/2024');
      expect(formatDate('2024-01-15T12:30:45.123Z')).toBe('01/15/2024');
      expect(formatDate('2024-01-15T23:59:59.999Z')).toBe('01/15/2024');
    });

    it('should handle different years', () => {
      expect(formatDate('2023-01-01T00:00:00.000Z')).toBe('01/01/2023');
      expect(formatDate('2025-12-31T00:00:00.000Z')).toBe('12/31/2025');
      expect(formatDate('2000-06-15T00:00:00.000Z')).toBe('06/15/2000');
    });

    it('should handle edge cases', () => {
      expect(formatDate('2024-01-01T00:00:00.000Z')).toBe('01/01/2024');
      expect(formatDate('2024-12-31T00:00:00.000Z')).toBe('12/31/2024');
    });

    it('should handle invalid date strings gracefully', () => {
      // Note: This will create an invalid Date object, but the function should still work
      expect(formatDate('invalid-date')).toBe('NaN/NaN/NaN');
      expect(formatDate('')).toBe('NaN/NaN/NaN');
    });

    it('should handle null and undefined', () => {
      expect(formatDate(null)).toBe('01/01/1970'); // null becomes epoch time
      expect(formatDate(undefined)).toBe('NaN/NaN/NaN'); // undefined becomes invalid date
    });

    it('should use UTC timezone', () => {
      // Test that it uses UTC regardless of local timezone
      const utcDate = '2024-01-15T12:00:00.000Z';
      const result = formatDate(utcDate);
      expect(result).toBe('01/15/2024');
    });
  });
});
