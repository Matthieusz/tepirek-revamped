import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

export { cn } from "cnfast";

const isValidDate = Schema.is(Schema.Date.check(Schema.isDateValid()));
const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const toValidDate = (date: Date | string | number): Date | undefined => {
  const value = Predicate.isDate(date) ? date : new Date(date);
  return isValidDate(value) ? value : undefined;
};

export const formatDate = (date: Date | string | number): string => {
  const value = toValidDate(date);
  return value ? dateFormatter.format(value).replaceAll(".", "-") : "";
};

export const formatDateTime = (date: Date | string | number): string => {
  const value = toValidDate(date);
  return value ? dateTimeFormatter.format(value).replace(", ", " ") : "";
};
