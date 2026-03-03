import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Zaokružuje sate: ≥ 0.5 na gore (9.5 → 10), inače na dole (9.49 → 9). */
export function roundHours(hours: number): number {
  if (Number.isNaN(hours) || !Number.isFinite(hours)) return 0;
  return Math.round(hours);
}

export function formatHours(hours: number): string {
  if (hours === 0) return "0 h";
  const rounded = roundHours(hours);
  return `${rounded} h`;
}
