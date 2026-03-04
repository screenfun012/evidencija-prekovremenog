import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import { computeTotals } from "@/lib/dateUtils";
import type { WorkerCard } from "@/types";

const HEADER_ROW = 1;
const DATA_START_ROW = 3;
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

/** Format za tabelu: "1:2" (sati:minuti). */
function formatDuration(hours: number): string {
  if (hours <= 0 || Number.isNaN(hours)) return "0:0";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}:0` : `${h}:${m}`;
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
  sheetName: string,
  companyName: string
): Promise<void> {
  const ws = wb.addWorksheet(sheetName);

  // Red 0: Naziv firme
  const companyRow = ws.getRow(1);
  companyRow.getCell(1).value = companyName;
  companyRow.getCell(1).font = { bold: true, size: 12 };
  companyRow.height = 22;

  // Širine kolona: A široka za datum/napomenu, ostale prilagođene
  ws.getColumn(1).width = 35; // A: RADNA OPERACIJA / DATUM / napomena
  ws.getColumn(2).width = 14; // B: R.NALOG
  ws.getColumn(3).width = 12; // C: POČETAK
  ws.getColumn(4).width = 12; // D: KRAJ
  ws.getColumn(5).width = 16; // E: VREME PO OPERACIJI
  ws.getColumn(6).width = 16; // F: UKUPNO VREME

  const sorted = [...card.operations].sort((a, b) => a.datum.localeCompare(b.datum));

  // --- Row 2: Headers (plava pozadina kao na slici) ---
  const headers = ["RADNA OPERACIJA", "R.NALOG", "POČETAK ", "KRAJ", "VREME PO OPERACIJI", "UKUPNO VREME"];
  const r2 = ws.getRow(HEADER_ROW + 1);
  headers.forEach((h, i) => {
    r2.getCell(i + 1).value = h;
    r2.getCell(i + 1).font = { bold: true };
    r2.getCell(i + 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  applyHighlight(r2, COL_COUNT);
  applyBordersToRow(r2, COL_COUNT);

  // --- Data rows: svaki datum dobija svoj plavi red, pa ispod njega operacije (pomeramo za +1 zbog firme) ---
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

  // --- UKUPNO redovi ---
  const t = computeTotals(card.operations);
  const round2 = (x: number) => Math.round(x * 100) / 100;

  const rows = [
    { label: "UKUPNO RADNI DANI", value: round2(t.workDays) },
    { label: "UKUPNO VIKENDI", value: round2(t.weekend) },
    { label: "UKUPNO RADNI DANI + VIKEND", value: round2(t.total) },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = ws.getRow(satiLabelRow + i);
    r.getCell(1).value = rows[i].label;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = rows[i].value;
    r.getCell(2).font = { bold: true };
    applyHighlight(r, COL_COUNT);
    applyBordersToRow(r, COL_COUNT);
    ws.mergeCells(satiLabelRow + i, 2, satiLabelRow + i, 3);
    ws.mergeCells(satiLabelRow + i, 4, satiLabelRow + i, 5);
  }
}

export async function exportCardsToExcel(
  cards: WorkerCard[],
  companyName: string
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  for (const card of cards) {
    const sheetName = safeSheetName(card.workerName, usedNames);
    await buildSheet(wb, card, sheetName, companyName);
  }

  return wb;
}

export async function downloadExcel(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, filename);
}
