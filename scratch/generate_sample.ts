import * as XLSX from 'xlsx';
import * as fs from 'fs';

const data = [
  ['Siêu thị', 'Tương ớt pet 130g', 'Nước tương lên men 300ml', 'Sate tôm pet 90g'],
  ['Co.op Mart Cống Quỳnh', 50, 20, 10],
  ['Co.op Mart Hùng Vương', 30, 15, 5],
  ['WinMart Thảo Điền', 100, 50, 25],
  ['Lotte Mart Quận 7', 10, 10, 10]
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('sample_import.xlsx', buf);

console.log('Created sample_import.xlsx');
