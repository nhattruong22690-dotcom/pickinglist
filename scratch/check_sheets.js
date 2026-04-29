const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = '1HAS8WG-NB98EToI9OvJ9tJwWKUy5hOAsn-EHdXnFvYs';

async function debugData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  const sessions = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sessions!A1:F5',
  });
  
  const items = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Items!A1:N5',
  });

  console.log('--- SESSIONS HEADERS & SAMPLE ---');
  console.log(sessions.data.values);
  console.log('--- ITEMS HEADERS & SAMPLE ---');
  console.log(items.data.values);
}

debugData();
