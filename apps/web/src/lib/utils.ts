export function isAdmin(session: { user?: { role?: string } }): boolean {
  return session?.user?.role === "admin";
}

import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(
  date: Date | string | number,
  formatStr = "dd-MM-yyyy"
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return format(d, formatStr, { locale: pl });
}

export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, "dd.MM.yyyy HH:mm");
}
