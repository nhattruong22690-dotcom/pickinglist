const { google } = require('googleapis');
require('dotenv').config();

async function initSheet() {
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

    const requiredSheets = [
      { name: 'Sessions', headers: ['ID', 'WeekKey', 'Status', 'CreatedAt'] },
      { name: 'Items', headers: ['ID', 'SessionID', 'Supermarket', 'ProductName', 'Quantity'] }
    ];

    for (const req of requiredSheets) {
      if (!existingSheets.includes(req.name)) {
        console.log(`Creating sheet: ${req.name}`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: req.name } } }]
          }
        });
        
        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${req.name}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [req.headers] }
        });
      } else {
        console.log(`Sheet ${req.name} already exists.`);
        // Ensure headers are there if empty
        const data = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${req.name}!A1:E1` });
        if (!data.data.values || data.data.values.length === 0) {
           await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${req.name}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [req.headers] }
          });
        }
      }
    }
    console.log('Google Sheet initialized successfully!');
  } catch (error) {
    console.error('Initialization failed:', error.message);
    if (error.message.includes('permission denied')) {
        console.log('\n🚨 LỖI QUYỀN TRUY CẬP: Bạn cần Share Google Sheet cho Email bên dưới với quyền Editor:');
        console.log(process.env.GOOGLE_CLIENT_EMAIL);
    }
  }
}

initSheet();
