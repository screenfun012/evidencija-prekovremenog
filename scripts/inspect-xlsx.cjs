const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const base = "/Users/nikola/Documents/Dokumentacija za dacinu aplikaciju";
const files = [
  "ČEKIRANJA RADNIKA.xlsx",
  "proba.xlsx",
  "Damir Cvetković_Spent Time_2026-02-01_2026-02-28.xlsx",
];

function cellStr(cell) {
  let v = cell.value;
  if (v && typeof v === "object" && v.text) v = v.text;
  if (typeof v === "number" && v < 1 && v > 0) return "[time:" + v + "]";
  return String(v ?? "").slice(0, 30);
}

function dumpSheet(ws, name, maxRows = 20, maxCols = 10) {
  const rows = ws.rowCount || 0;
  const cols = ws.columnCount || 0;
  console.log("\n=== " + name + " === rows: " + rows + ", cols: " + cols + "\n");
  for (let r = 1; r <= Math.min(maxRows, rows || 30); r++) {
    const row = ws.getRow(r);
    const cells = [];
    for (let c = 1; c <= Math.min(maxCols, cols || 15); c++) {
      cells.push(JSON.stringify(cellStr(row.getCell(c))));
    }
    console.log("R" + r + ": " + cells.join(" | "));
  }
  // Horizontalni format: jedna KOLONA ima u redovima "Ime", "Prezime", "Posle smene"
  console.log("\n--- Kolone (prvih 5 kol, prvih 12 redova) ---");
  for (let c = 1; c <= Math.min(5, cols || 10); c++) {
    const vals = [];
    for (let r = 1; r <= Math.min(12, rows || 20); r++) {
      vals.push(cellStr(ws.getRow(r).getCell(c)));
    }
    console.log("C" + c + ": " + vals.join(" ; "));
  }
}

async function main() {
  for (const file of files) {
    const filePath = path.join(base, file);
    if (!fs.existsSync(filePath)) {
      console.log("SKIP (not found): " + file);
      continue;
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    if (!ws) {
      console.log("No sheet in " + file);
      continue;
    }
    dumpSheet(ws, file, 25, 12);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
