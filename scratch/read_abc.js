import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join(process.cwd(), 'abc.xlsx');
const wb = XLSX.readFile(filePath);

console.log('=== Sheet Names ===');
console.log(wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const ws = wb.Sheets[sheetName];
  
  // Get range
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`Range: ${ws['!ref']}`);
  console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
  
  // Get merged cells
  if (ws['!merges']) {
    console.log(`\nMerged cells: ${ws['!merges'].length}`);
    ws['!merges'].forEach((m, i) => {
      console.log(`  Merge ${i}: ${XLSX.utils.encode_range(m)}`);
    });
  }
  
  // Print all data as JSON rows
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('\n=== Raw Data (all rows) ===');
  data.forEach((row, i) => {
    console.log(`Row ${i}: ${JSON.stringify(row)}`);
  });
}
