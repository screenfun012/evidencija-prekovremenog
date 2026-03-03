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
