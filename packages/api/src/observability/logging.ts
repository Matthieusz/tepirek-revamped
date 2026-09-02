import { Formatter, Logger } from "effect";
import * as Arr from "effect/Array";
import type { LogLevel } from "effect/LogLevel";
import * as Predicate from "effect/Predicate";
import * as RecordUtils from "effect/Record";

const LOG_LEVELS = {
  DEBUG: "Debug",
  ERROR: "Error",
  INFO: "Info",
  WARN: "Warn",
} as const satisfies Record<string, LogLevel>;
const LOG_LEVELS_BY_NAME = LOG_LEVELS satisfies Readonly<
  Record<string, LogLevel>
>;
type LogValue = Parameters<typeof Formatter.format>[0];
type LogObject = Record<string, LogValue>;

const SIMPLE_LOG_VALUE_PATTERN = /^[^\s="\\]+$/u;

const isPlainObject = (input: LogValue): input is LogObject => {
  if (!Predicate.isObject(input)) {
    return false;
  }

  const prototype = Reflect.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
};

const flatten = (
  input: LogObject,
  prefix = "",
  seen = new WeakSet<object>()
): (readonly [string, LogValue])[] => {
  if (seen.has(input)) {
    return [[prefix, "[Circular]"]];
  }

  seen.add(input);

  const entries = RecordUtils.toEntries(input);
  if (Arr.isArrayEmpty(entries) && prefix) {
    return [[prefix, input]];
  }

  return Arr.flatMap(([key, value]: readonly [string, LogValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isPlainObject(value)
      ? flatten(value, path, seen)
      : [[path, value] as const];
  })(entries);
};

const formatValue = (input: LogValue): string => {
  const value = Predicate.isString(input) ? input : Formatter.format(input);
  return SIMPLE_LOG_VALUE_PATTERN.test(value) ? value : JSON.stringify(value);
};

const formatter = (runId: string) =>
  Logger.formatStructured.pipe(
    Logger.map((output) => {
      const messages = Arr.isArray(output.message)
        ? output.message
        : [output.message];

      return Arr.map(
        ([key, value]: readonly [string, LogValue]) =>
          `${key}=${formatValue(value)}`
      )([
        ["timestamp", output.timestamp],
        ["level", output.level],
        ["run", runId],
        ...Arr.flatMap((value: LogValue) =>
          isPlainObject(value) ? flatten(value) : [["message", value] as const]
        )(messages),
        ...(output.cause === undefined
          ? []
          : [["cause", output.cause] as const]),
        ...flatten(output.spans),
        ...flatten(output.annotations),
      ]).join(" ");
    })
  );

/** Create the structured stderr logger with an injectable output sink. */
export const makeStderrLogger = (
  runId: string,
  write: (output: string) => void = (output) => process.stderr.write(output)
) =>
  Logger.make((options) => {
    write(`${formatter(runId).log(options)}\n`);
  });

const isLogLevelName = (value: string): value is keyof typeof LOG_LEVELS =>
  Object.hasOwn(LOG_LEVELS_BY_NAME, value);

/** Parse a configured minimum log level. */
export const parseLogLevel = (value: string): LogLevel | undefined => {
  const normalized = value.toUpperCase();
  return isLogLevelName(normalized) ? LOG_LEVELS[normalized] : undefined;
};
