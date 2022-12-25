import XLSX from "xlsx";

const workbook = XLSX.readFile("wb-gi-26967625.xlsx");

const worksheets = {};

for (const sheetName of workbook.SheetNames) {
  worksheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

const stringWithInfo = JSON.stringify(worksheets.Sheet1);

const arrayOfObjects = JSON.parse(stringWithInfo);

const getArgs = arrayOfObjects.map((el) => ({
  label: el["Стикер"].slice(-4),
  data: el["Название товара"],
}));

const getSortedArr = getArgs.sort((a, b) => a.label - b.label);
console.log(getSortedArr);
