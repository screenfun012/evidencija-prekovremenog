import { getDay, parseISO } from "date-fns";

export function isWeekend(dateStr: string): boolean {
  const d = parseISO(dateStr);
  const day = getDay(d); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr?.trim()) return 0;
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h)) return 0;
  return (h % 24) * 60 + (Number.isNaN(m) ? 0 : Math.min(59, Math.max(0, m)));
}

export function timeDiffHours(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  let endMin = parseTimeToMinutes(end);
  if (endMin < startMin) endMin += 24 * 60; // next day
  return (endMin - startMin) / 60;
}

export interface OperationTotals {
  workDays: number;
  weekend: number;
  total: number;
}

/** Računa ukupno vreme po radnim danima i vikendu iz operacija. */
export function computeTotals(
  operations: { datum: string; ukupnoVreme: number }[]
): OperationTotals {
  let workDays = 0;
  let weekend = 0;
  for (const op of operations) {
    if (!op.datum) {
      workDays += op.ukupnoVreme;
      continue;
    }
    if (isWeekend(op.datum)) {
      weekend += op.ukupnoVreme;
    } else {
      workDays += op.ukupnoVreme;
    }
  }
  return { workDays, weekend, total: workDays + weekend };
}

function isValidTime(s: string): boolean {
  if (!s?.trim()) return false;
  const parts = s.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return !Number.isNaN(h) && h >= 0 && h <= 23 && !Number.isNaN(m) && m >= 0 && m <= 59;
}

export interface OperationWithTime {
  id: string;
  datum: string;
  pocetak: string;
  kraj: string;
  ukupnoVreme: number;
}

/**
 * Za grupe po datumu: ako prvi red ima početak a poslednji kraj,
 * računa se jedan blok (scenarij "od na prvom, do na poslednjem").
 * Inače svaki red koristi svoje od–do.
 */
export function effectiveOperationsWithGroupTime<T extends OperationWithTime>(
  operations: T[]
): T[] {
  const byDate = new Map<string, T[]>();
  for (const op of operations) {
    const d = op.datum || "\uFFFF";
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(op);
  }
  const result: T[] = [];
  for (const [, ops] of byDate) {
    const first = ops[0];
    const last = ops[ops.length - 1];
    const useGroupBlock =
      first.pocetak?.trim() &&
      last.kraj?.trim() &&
      isValidTime(first.pocetak) &&
      isValidTime(last.kraj);
    if (useGroupBlock) {
      const groupTotal = timeDiffHours(first.pocetak, last.kraj);
      ops.forEach((op, i) =>
        result.push({
          ...op,
          ukupnoVreme: i === 0 ? groupTotal : 0,
        } as T)
      );
    } else {
      ops.forEach((op) => result.push({ ...op } as T));
    }
  }
  return result;
}
