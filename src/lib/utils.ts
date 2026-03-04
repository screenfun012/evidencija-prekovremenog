import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Prikazuje vreme u formatu "1h 2m" (sati i minuti). */
export function formatHours(hours: number): string {
  if (Number.isNaN(hours) || !Number.isFinite(hours)) return "0 h";
  if (hours <= 0) return "0 h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} h`;
  return `${h}h ${m}m`;
}
