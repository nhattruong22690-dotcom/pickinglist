const XLSX = require('xlsx');
const workbook = XLSX.readFile('abc.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(data[0])); // Print headers
