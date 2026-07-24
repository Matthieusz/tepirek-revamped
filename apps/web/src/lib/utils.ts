import { format } from "date-fns";
import { pl } from "date-fns/locale";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

export { cn } from "cnfast";

const isValidDate = Schema.is(Schema.Date.check(Schema.isDateValid()));

export const formatDate = (
  date: Date | string | number,
  formatStr = "dd-MM-yyyy"
): string => {
  const d = Predicate.isDate(date) ? date : new Date(date);
  if (!isValidDate(d)) {
    return "";
  }
  return format(d, formatStr, { locale: pl });
};

export const formatDateTime = (date: Date | string | number): string =>
  formatDate(date, "dd.MM.yyyy HH:mm");
