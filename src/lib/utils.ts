import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(hours: number): string {
  if (Number.isNaN(hours) || !Number.isFinite(hours)) return "0 h";
  if (hours === 0) return "0 h";
  const h = Math.round(hours * 100) / 100;
  return h % 1 === 0 ? `${h} h` : `${h.toFixed(2)} h`;
}
