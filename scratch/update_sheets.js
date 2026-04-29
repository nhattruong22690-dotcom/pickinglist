const { google } = require('googleapis');
require('dotenv').config();

async function updateSheetStructure() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    console.log('Updating Sessions sheet headers...');
    // New headers for Sessions: ID | WeekKey | Supermarket | Status | CreatedAt
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sessions!A1:E1`,
      valueInputOption: 'RAW',
      requestBody: { 
        values: [['ID', 'WeekKey', 'Supermarket', 'Status', 'CreatedAt']] 
      }
    });
    console.log('Update successful!');
  } catch (error) {
    console.error('Update failed:', error.message);
  }
}

updateSheetStructure();
