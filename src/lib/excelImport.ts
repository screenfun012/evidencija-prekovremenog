import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { WorkerCard } from "@/types";

/** HH:MM:SS, decimalni broj ili Excel serial (0–1 = dan) -> decimalni sati */
function parseTimeToDecimalHours(val: unknown): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") {
    if (Number.isNaN(val)) return 0;
    if (val >= 0 && val < 1) return val * 24;
    if (val >= 1 && val < 24) return val;
    return val * 24;
  }
  const s = cleanCell(val);
  if (!s) return 0;
  const parts = s.split(":");
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const sec = parseInt(parts[2] ?? "0", 10) || 0;
    return h + m / 60 + sec / 3600;
  }
  const n = parseFloat(s.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

/** Decimalni sati -> HH:MM:SS (sekunde 0–59, bez 60 zbog floating-point greške) */
function decimalHoursToTimeStr(hours: number): string {
  const sign = hours < 0 ? "-" : "";
  const abs = Math.abs(hours);
  const totalSeconds = Math.round(abs * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const remainderSec = totalSeconds % 3600;
  const m = Math.floor(remainderSec / 60);
  const s = remainderSec % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Uklanja đćčšž radi uparivanja (Dinić = Dinic, Tvrdišić = Tvrdisic). */
function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

function normalizeNameForMatch(name: string): string[] {
  return stripDiacritics(name)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function namesMatch(appName: string, tabelaIme: string, tabelaPrezime: string): boolean {
  const appParts = normalizeNameForMatch(appName);
  const tabelaParts = normalizeNameForMatch(`${tabelaIme} ${tabelaPrezime}`);
  if (appParts.length === 0 || tabelaParts.length === 0) return false;
  return (
    appParts.length === tabelaParts.length &&
    appParts.every((p, i) => p === tabelaParts[i])
  );
}

export interface MatchedWorkerDetail {
  name: string;
  originalPosleSmene: string;
  tabelaBTotal: string;
  newPosleSmene: string;
}

export interface ProcessResult {
  success: true;
  matchedWorkers: MatchedWorkerDetail[];
  unmatchedWorkers: string[];
  blob: Blob;
  filename: string;
}

export interface ProcessError {
  success: false;
  message: string;
}

export type ProcessOutcome = ProcessResult | ProcessError;

function workerNameInList(workerName: string, nameList: string[]): boolean {
  if (nameList.length === 0) return true;
  return nameList.some((fullName) => {
    const parts = fullName.trim().split(/\s+/);
    const ime = parts[0] ?? "";
    const prezime = parts.slice(1).join(" ") ?? "";
    return namesMatch(workerName, ime, prezime);
  });
}

/** Uklanja nevidljive Unicode znakove (npr. zero-width space) iz vrednosti. */
function cleanCell(val: unknown): string {
  return String(val ?? "")
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "")
    .trim();
}

/** Normalizuje tekst ćelije za upoređivanje naslova (ime, prezime, posle smene). */
function normHeader(val: unknown): string {
  return cleanCell(val)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Da li normalizovani header odgovara oznaci (npr. "posle smene" ili "ime"). */
function headerMatches(norm: string, label: string): boolean {
  if (!norm) return false;
  if (label === "ime") return norm === "ime";
  if (label === "prezime") return norm === "prezime";
  return norm === label || norm.includes(label);
}

/**
 * Tabela A — jednostavna kros-referenca:
 * 1. Nađi radnika (Ime + Prezime)
 * 2. Nađi kod njega "Posle smene" (vreme HH:MM:SS)
 * 3. novo = vreme_iz_tabele − ukupno_sati_sa_kartice
 * 4. Upis u istu ćeliju, izvoz nove tabele.
 *
 * Vertikalna (ČEKIRANJA): A=Ime, B=Prezime, C=polje (6. po redu "Posle smene"), D=vreme.
 * Horizontalna (proba): zaglavlje u redu (Ime, Prezime, Posle smene u kolonama), podaci u redovima ispod.
 *
 * Obrađuju se samo radnici obeleženi pri uvozu i koji imaju karticu u aplikaciji.
 */
export async function processTableA(
  file: File,
  cards: WorkerCard[],
  selectedWorkerNames?: string[]
): Promise<ProcessOutcome> {
  try {
    const cardsToUse =
      selectedWorkerNames && selectedWorkerNames.length > 0
        ? cards.filter((c) => workerNameInList(c.workerName, selectedWorkerNames))
        : cards;

    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) {
      return { success: false, message: "Nema nijednog lista u fajlu." };
    }

    const maxRows = Math.min(ws.rowCount || 2500, 2500);
    const maxCols = Math.min(ws.columnCount || 50, 50);

    const getCell = (r: number, c: number): string =>
      normHeader(ws.getRow(r)?.getCell(c)?.value);

    const matched: MatchedWorkerDetail[] = [];
    const unmatched: string[] = [];

    // --- Format "čekiranja" (vertikalni po radniku): A=Ime, B=Prezime, C=Polje, D=Vrednost. Proveri prvo. ---
    let usedRowPerField = false;
    if (maxCols >= 4) {
      for (let r = 1; r <= Math.min(maxRows, 50); r++) {
        const col3 = getCell(r, 3);
        if (headerMatches(col3, "posle smene")) {
          usedRowPerField = true;
          break;
        }
      }
    }

    if (usedRowPerField) {
      for (let r = 1; r <= maxRows; r++) {
        const row = ws.getRow(r);
        const col1 = cleanCell(row.getCell(1).value);
        const col2 = cleanCell(row.getCell(2).value);
        const col3 = normHeader(row.getCell(3).value);
        const col4 = cleanCell(row.getCell(4).value);
        if (!headerMatches(col3, "posle smene")) continue;
        const ime = col1;
        const prezime = col2;
        if (!ime && !prezime) continue;
        if (headerMatches(ime.toLowerCase(), "ime") && headerMatches(prezime.toLowerCase(), "prezime")) continue;

        const fullName = `${ime} ${prezime}`.trim();
        const card = cardsToUse.find((k) => namesMatch(k.workerName, ime, prezime));

        if (card) {
          const cardTotalHours = card.operations.reduce((acc, op) => acc + op.ukupnoVreme, 0);
          const rawCell4 = row.getCell(4).value;
          const currentHours = parseTimeToDecimalHours(rawCell4);
          const newHours = currentHours - cardTotalHours;
          const newValue = decimalHoursToTimeStr(newHours);
          const cell = ws.getCell(r, 4);
          cell.value = newValue;
          if ("formula" in cell && cell.formula) (cell as { formula?: unknown }).formula = undefined;
          matched.push({
            name: fullName,
            originalPosleSmene: col4 || "0",
            tabelaBTotal: decimalHoursToTimeStr(cardTotalHours),
            newPosleSmene: newValue,
          });
        } else {
          unmatched.push(fullName);
        }
      }
    } else {
      // --- Horizontalna tabela: zaglavlje u jednom redu (Ime, Prezime, Posle smene u kolonama), podaci u redovima ispod ---
      let imeCol = -1,
        prezimeCol = -1,
        posleSmeneCol = -1;
      let headerRow = -1;

      for (let r = 1; r <= maxRows; r++) {
        for (let c = 1; c <= maxCols; c++) {
          const v = getCell(r, c);
          if (headerMatches(v, "ime")) imeCol = c;
          if (headerMatches(v, "prezime")) prezimeCol = c;
          if (headerMatches(v, "posle smene")) posleSmeneCol = c;
        }
        if (imeCol > 0 && prezimeCol > 0 && posleSmeneCol > 0) {
          headerRow = r;
          break;
        }
        imeCol = prezimeCol = posleSmeneCol = -1;
      }

      if (headerRow > 0 && imeCol > 0 && prezimeCol > 0 && posleSmeneCol > 0) {
        // Vertikalni: podaci u redovima ispod (zaglavlje može da se ponavlja)
        for (let r = 1; r <= maxRows; r++) {
          if (r === headerRow) continue;
          const ime = cleanCell(ws.getRow(r)?.getCell(imeCol)?.value);
          const prezime = cleanCell(ws.getRow(r)?.getCell(prezimeCol)?.value);
          if (!ime && !prezime) continue;
          if (headerMatches(normHeader(ime), "ime") && headerMatches(normHeader(prezime), "prezime")) continue;

          const fullName = `${ime} ${prezime}`.trim();
          const card = cardsToUse.find((c) => namesMatch(c.workerName, ime, prezime));

          if (card) {
            const cardTotalHours = card.operations.reduce((acc, op) => acc + op.ukupnoVreme, 0);
            const currentValue = String(ws.getRow(r)?.getCell(posleSmeneCol)?.value ?? "");
            const currentHours = parseTimeToDecimalHours(currentValue);
            const newHours = currentHours - cardTotalHours;
            const newValue = decimalHoursToTimeStr(newHours);
            ws.getCell(r, posleSmeneCol).value = newValue;
            matched.push({
              name: fullName,
              originalPosleSmene: currentValue,
              tabelaBTotal: decimalHoursToTimeStr(cardTotalHours),
              newPosleSmene: newValue,
            });
          } else {
            unmatched.push(fullName);
          }
        }
    } else {
      // --- Vertikalna tabela: oznake u jednom stupcu (Ime, Prezime, Posle smene u redovima), podaci u kolonama desno ---
      imeCol = prezimeCol = posleSmeneCol = -1;
      let imeRow = -1,
        prezimeRow = -1,
        posleSmeneRow = -1;

      for (let c = 1; c <= maxCols; c++) {
        imeRow = prezimeRow = posleSmeneRow = -1;
        for (let r = 1; r <= maxRows; r++) {
          const v = getCell(r, c);
          if (headerMatches(v, "ime")) imeRow = r;
          if (headerMatches(v, "prezime")) prezimeRow = r;
          if (headerMatches(v, "posle smene")) posleSmeneRow = r;
        }
        if (imeRow > 0 && prezimeRow > 0 && posleSmeneRow > 0) {
          // Ova kolona je "oznake"; podaci su u kolonama desno (c+1, c+2, ...)
          for (let dataCol = c + 1; dataCol <= maxCols; dataCol++) {
            const ime = cleanCell(ws.getRow(imeRow)?.getCell(dataCol)?.value);
            const prezime = cleanCell(ws.getRow(prezimeRow)?.getCell(dataCol)?.value);
            if (!ime && !prezime) continue;

            const fullName = `${ime} ${prezime}`.trim();
            const card = cardsToUse.find((k) => namesMatch(k.workerName, ime, prezime));

            if (card) {
              const cardTotalHours = card.operations.reduce((acc, op) => acc + op.ukupnoVreme, 0);
              const currentValue = String(ws.getRow(posleSmeneRow)?.getCell(dataCol)?.value ?? "");
              const currentHours = parseTimeToDecimalHours(currentValue);
              const newHours = currentHours - cardTotalHours;
              const newValue = decimalHoursToTimeStr(newHours);
              ws.getCell(posleSmeneRow, dataCol).value = newValue;
              matched.push({
                name: fullName,
                originalPosleSmene: currentValue,
                tabelaBTotal: decimalHoursToTimeStr(cardTotalHours),
                newPosleSmene: newValue,
              });
            } else {
              unmatched.push(fullName);
            }
          }
          break;
        }
      }

      if (imeRow < 0 || prezimeRow < 0 || posleSmeneRow < 0) {
        return {
          success: false,
          message:
            'U fajlu nije pronađena Tabela A sa poljima "Ime", "Prezime" i "Posle smene". Proverite da li je tabela horizontalna (zaglavlje u redu), vertikalna (oznake u stupcu) ili format čekiranja.',
        };
      }
    }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const originalName = file.name.replace(/\.[^.]+$/, "");
    const filename = `${originalName}_obradjeno.xlsx`;

    return { success: true, matchedWorkers: matched, unmatchedWorkers: unmatched, blob, filename };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Greška pri obradi Excel fajla.",
    };
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}
