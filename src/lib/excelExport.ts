import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import type { WorkerCard } from "@/types";

const HEADER_ROW = 1;
const DATA_START_ROW = 2;
const SATI_LABEL_ROW = 27;
const COL_COUNT = 6;

const HIGHLIGHT_COLOR = "DDEBF7";

const THIN_BORDER: Partial<ExcelJS.Border> = { style: "thin" };
const ALL_BORDERS: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

function formatDateSerbian(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd.MM.yyyy.");
  } catch {
    return dateStr;
  }
}

function formatDuration(hours: number): string {
  if (hours <= 0 || Number.isNaN(hours)) return "0";
  const h = Math.round(hours * 100) / 100;
  return h % 1 === 0 ? `${h}` : h.toFixed(2);
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr || !timeStr.includes(":")) return "";
  const [h, m] = timeStr.split(":").map(Number);
  return `${h ?? 0}:${String(m ?? 0).padStart(2, "0")}`;
}

function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "List";
  let out = base;
  let n = 1;
  while (used.has(out)) {
    const suffix = ` (${n})`;
    out = (base.slice(0, 31 - suffix.length) + suffix).trim();
    n++;
  }
  used.add(out);
  return out;
}

function applyHighlight(row: ExcelJS.Row, colCount: number): void {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HIGHLIGHT_COLOR },
    };
  }
}

function applyBordersToRow(row: ExcelJS.Row, colCount: number): void {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = ALL_BORDERS;
  }
}

async function buildSheet(
  wb: ExcelJS.Workbook,
  card: WorkerCard,
  sheetName: string
): Promise<void> {
  const ws = wb.addWorksheet(sheetName);

  // Širine kolona: A široka za datum/napomenu, ostale prilagođene
  ws.getColumn(1).width = 35; // A: RADNA OPERACIJA / DATUM / napomena
  ws.getColumn(2).width = 14; // B: R.NALOG
  ws.getColumn(3).width = 12; // C: POČETAK
  ws.getColumn(4).width = 12; // D: KRAJ
  ws.getColumn(5).width = 16; // E: VREME PO OPERACIJI
  ws.getColumn(6).width = 16; // F: UKUPNO VREME

  const sorted = [...card.operations].sort((a, b) => a.datum.localeCompare(b.datum));

  // --- Row 1: Headers (plava pozadina kao na slici) ---
  const headers = ["RADNA OPERACIJA", "R.NALOG", "POČETAK ", "KRAJ", "VREME PO OPERACIJI", "UKUPNO VREME"];
  const r2 = ws.getRow(HEADER_ROW);
  headers.forEach((h, i) => {
    r2.getCell(i + 1).value = h;
    r2.getCell(i + 1).font = { bold: true };
    r2.getCell(i + 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  applyHighlight(r2, COL_COUNT);
  applyBordersToRow(r2, COL_COUNT);

  // --- Data rows: svaki datum dobija svoj plavi red, pa ispod njega operacije ---
  type DataItem =
    | { type: "datum"; datum: string }
    | { type: "op"; op: (typeof sorted)[0] };
  const items: DataItem[] = [];
  let currentDate = "";
  for (const op of sorted) {
    if (op.datum !== currentDate) {
      currentDate = op.datum;
      items.push({ type: "datum", datum: op.datum });
    }
    items.push({ type: "op", op });
  }

  let rowIdx = DATA_START_ROW;

  for (const item of items) {
    const row = ws.getRow(rowIdx);
    if (item.type === "datum") {
      row.getCell(1).value = formatDateSerbian(item.datum);
      row.getCell(1).font = { bold: true };
      applyHighlight(row, COL_COUNT);
    } else {
      const op = item.op;
      row.getCell(1).value = op.napomena || "";
      row.getCell(2).value = op.radniNalog || "";
      row.getCell(3).value = formatTimeDisplay(op.pocetak);
      row.getCell(4).value = formatTimeDisplay(op.kraj);
      row.getCell(6).value = formatDuration(op.ukupnoVreme);
    }
    applyBordersToRow(row, COL_COUNT);
    rowIdx++;
  }

  // Prazni redovi sa borederima do SATI reda
  const satiLabelRow = Math.max(SATI_LABEL_ROW, rowIdx + 1);
  for (let r = rowIdx; r < satiLabelRow; r++) {
    applyBordersToRow(ws.getRow(r), COL_COUNT);
  }

  // --- SATI row ---
  const satiRow = ws.getRow(satiLabelRow);
  satiRow.getCell(1).value = "SATI";
  satiRow.getCell(1).font = { bold: true };
  satiRow.getCell(2).value = "CENA";
  satiRow.getCell(2).font = { bold: true };
  satiRow.getCell(4).value = "IZNOS";
  satiRow.getCell(4).font = { bold: true };
  applyHighlight(satiRow, COL_COUNT);
  applyBordersToRow(satiRow, COL_COUNT);
  // Merges: B:C and D:E for sati label row
  ws.mergeCells(satiLabelRow, 2, satiLabelRow, 3);
  ws.mergeCells(satiLabelRow, 4, satiLabelRow, 5);

  // --- Values row ---
  const valRow = satiLabelRow + 1;
  const vr = ws.getRow(valRow);
  const ukupnoSati = Math.round(card.operations.reduce((acc, op) => acc + op.ukupnoVreme, 0) * 100) / 100;
  vr.getCell(1).value = ukupnoSati;
  vr.getCell(1).font = { bold: true };
  applyHighlight(vr, COL_COUNT);
  applyBordersToRow(vr, COL_COUNT);
  ws.mergeCells(valRow, 2, valRow, 3);
  ws.mergeCells(valRow, 4, valRow, 5);
}

export async function exportCardsToExcel(cards: WorkerCard[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  for (const card of cards) {
    const sheetName = safeSheetName(card.workerName, usedNames);
    await buildSheet(wb, card, sheetName);
  }

  return wb;
}

export async function downloadExcel(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}
