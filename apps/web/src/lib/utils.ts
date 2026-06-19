import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const slugify = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/[^a-z0-9-]/gu, "")
    .replaceAll(/--+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

export const formatDate = (
  date: Date | string | number,
  formatStr = "dd-MM-yyyy"
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return format(d, formatStr, { locale: pl });
};

export const formatDateTime = (date: Date | string | number): string =>
  formatDate(date, "dd.MM.yyyy HH:mm");
