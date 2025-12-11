import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { capitalize, emojiFor, formatDate } from './moodUtils';

type MoodItem = {
  _id: string;
  date: string;
  mood: string;
  note?: string;
};

/**
 * Generates an HTML document for the mood history PDF
 */
function generateMoodHistoryHTML(moods: MoodItem[]): string {
  const currentDate = new Date().toLocaleDateString();

  const moodRows = moods.map(mood => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${formatDate(mood.date)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 24px;">${emojiFor(mood.mood)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${capitalize(mood.mood)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; max-width: 300px;">${mood.note || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 40px;
            color: #111827;
            background-color: #ffffff;
          }
          .header {
            margin-bottom: 30px;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
          }
          h1 {
            color: #1F2937;
            margin: 0 0 10px 0;
            font-size: 32px;
          }
          .subtitle {
            color: #6B7280;
            font-size: 14px;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          thead {
            background-color: #F3F4F6;
          }
          th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #E5E7EB;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #9CA3AF;
            font-size: 12px;
          }
          .summary {
            background-color: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .summary-item {
            display: inline-block;
            margin-right: 30px;
            margin-bottom: 10px;
          }
          .summary-label {
            color: #6B7280;
            font-size: 14px;
          }
          .summary-value {
            color: #111827;
            font-size: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mood History Report</h1>
          <p class="subtitle">Generated on ${currentDate}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Entries</div>
            <div class="summary-value">${moods.length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Date Range</div>
            <div class="summary-value">
              ${moods.length > 0 ? `${formatDate(moods[moods.length - 1].date)} - ${formatDate(moods[0].date)}` : 'N/A'}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Emoji</th>
              <th>Mood</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${moodRows}
          </tbody>
        </table>

        <div class="footer">
          <p>This is a confidential mood tracking report.</p>
          <p>Keep this document secure and share only with trusted healthcare providers.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates a PDF from mood history data and returns the URI
 * @param moods Array of mood entries to include in the PDF
 * @returns Promise with the PDF file URI
 */
export async function generateMoodHistoryPDF(moods: MoodItem[]): Promise<string> {
  try {
    const html = generateMoodHistoryHTML(moods);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    return uri;
  } catch (error) {
    throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Generates and shares a PDF of mood history
 * @param moods Array of mood entries to include in the PDF
 */
export async function shareMoodHistoryPDF(moods: MoodItem[]): Promise<void> {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    // Generate the PDF
    const pdfUri = await generateMoodHistoryPDF(moods);

    // Share the PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Mood History',
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    throw new Error('Failed to share PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
