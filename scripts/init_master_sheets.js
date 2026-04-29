const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.split('\\n').join('\n');

async function initMasterSheets() {
  console.log('--- UPGRADING MASTER SHEETS ---');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Cập nhật tiêu đề mới cho Supermarkets (Code | Name)
    console.log('Action: Updating Supermarkets headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Supermarkets!A1:B1',
      valueInputOption: 'RAW',
      requestBody: { values: [['SupermarketCode', 'SupermarketName']] }
    });

    console.log('Success: Supermarkets headers upgraded to (Code, Name).');
    console.log('--- UPGRADE READY ---');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initMasterSheets();
