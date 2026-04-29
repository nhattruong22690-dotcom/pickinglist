const { google } = require('googleapis');
require('dotenv').config();

async function upgradeSheetStructure() {
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
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets.map(s => s.properties.title);

    // 1. Create Products sheet if not exists
    if (!existingSheets.includes('Products')) {
      console.log('Creating Products sheet...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Products' } } }]
        }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Products!A1:D1',
        valueInputOption: 'RAW',
        requestBody: { values: [['SKU', 'ProductName', 'Specs', 'Weight']] }
      });
    }

    // 2. Update Items headers to include extra fields
    // ID | SessionID | Supermarket | ProductName | Quantity | SKU | Specs | Weight | ActualQty | IsPicked
    console.log('Updating Items sheet headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Items!A1:J1',
      valueInputOption: 'RAW',
      requestBody: { 
        values: [['ID', 'SessionID', 'Supermarket', 'ProductName', 'Quantity', 'SKU', 'Specs', 'Weight', 'ActualQty', 'IsPicked']] 
      }
    });

    console.log('Upgrade successful!');
  } catch (error) {
    console.error('Upgrade failed:', error.message);
  }
}

upgradeSheetStructure();
