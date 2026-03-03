import { getDay, parseISO } from "date-fns";

export function isWeekend(dateStr: string): boolean {
  const d = parseISO(dateStr);
  const day = getDay(d); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function timeDiffHours(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  let endMin = parseTimeToMinutes(end);
  if (endMin < startMin) endMin += 24 * 60; // next day
  return (endMin - startMin) / 60;
}
