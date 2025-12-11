/**
 * PDF Generator Tests
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateMoodHistoryPDF, shareMoodHistoryPDF } from '../pdfGenerator';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('PDF Generator Tests', () => {
  const mockMoodData = [
    { _id: '1', date: '2024-01-15', mood: 'happy', note: 'Feeling great!' },
    { _id: '2', date: '2024-01-16', mood: 'sad', note: 'Rough day' },
    { _id: '3', date: '2024-01-17', mood: 'anxious' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMoodHistoryPDF', () => {
    it('should generate PDF successfully', async () => {
      const mockUri = 'file:///path/to/pdf.pdf';
      (Print.printToFileAsync as any).mockResolvedValue({ uri: mockUri });

      const result = await generateMoodHistoryPDF(mockMoodData);

      expect(result).toBe(mockUri);
      expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
    });

    it('should include all mood entries in HTML', async () => {
      const mockUri = 'file:///path/to/pdf.pdf';
      (Print.printToFileAsync as any).mockResolvedValue({ uri: mockUri });

      await generateMoodHistoryPDF(mockMoodData);

      const html = (Print.printToFileAsync as any).mock.calls[0][0].html;
      expect(html).toContain('happy');
      expect(html).toContain('sad');
      expect(html).toContain('anxious');
    });

    it('should handle empty array', async () => {
      const mockUri = 'file:///path/to/pdf.pdf';
      (Print.printToFileAsync as any).mockResolvedValue({ uri: mockUri });

      await generateMoodHistoryPDF([]);

      const html = (Print.printToFileAsync as any).mock.calls[0][0].html;
      expect(html).toContain('Total Entries');
      expect(html).toContain('0');
    });

    it('should handle errors', async () => {
      (Print.printToFileAsync as any).mockRejectedValue(new Error('Print failed'));

      await expect(generateMoodHistoryPDF(mockMoodData)).rejects.toThrow('Failed to generate PDF');
    });
  });

  describe('shareMoodHistoryPDF', () => {
    it('should share PDF when available', async () => {
      const mockUri = 'file:///path/to/pdf.pdf';
      (Sharing.isAvailableAsync as any).mockResolvedValue(true);
      (Print.printToFileAsync as any).mockResolvedValue({ uri: mockUri });
      (Sharing.shareAsync as any).mockResolvedValue({});

      await shareMoodHistoryPDF(mockMoodData);

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(mockUri, expect.objectContaining({
        mimeType: 'application/pdf',
      }));
    });

    it('should throw when sharing unavailable', async () => {
      (Sharing.isAvailableAsync as any).mockResolvedValue(false);

      await expect(shareMoodHistoryPDF(mockMoodData)).rejects.toThrow('Sharing is not available');
    });

    it('should handle sharing errors', async () => {
      const mockUri = 'file:///path/to/pdf.pdf';
      (Sharing.isAvailableAsync as any).mockResolvedValue(true);
      (Print.printToFileAsync as any).mockResolvedValue({ uri: mockUri });
      (Sharing.shareAsync as any).mockRejectedValue(new Error('Share failed'));

      await expect(shareMoodHistoryPDF(mockMoodData)).rejects.toThrow('Failed to share PDF');
    });
  });
});
