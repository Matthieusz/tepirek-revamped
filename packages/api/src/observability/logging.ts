import { Formatter, Logger } from "effect";
import type { LogLevel } from "effect/LogLevel";

import { runId } from "./shared.js";

const LOG_LEVELS = {
  DEBUG: "Debug",
  ERROR: "Error",
  INFO: "Info",
  WARN: "Warn",
} as const satisfies Record<string, LogLevel>;

const SIMPLE_LOG_VALUE_PATTERN = /^[^\s="\\]+$/u;

const isPlainObject = (input: unknown): input is Record<string, unknown> => {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
};

const flatten = (
  input: Record<string, unknown>,
  prefix = "",
  seen = new WeakSet<object>()
): (readonly [string, unknown])[] => {
  if (seen.has(input)) {
    return [[prefix, "[Circular]"]];
  }

  seen.add(input);

  const entries = Object.entries(input);
  if (entries.length === 0 && prefix) {
    return [[prefix, input]];
  }

  return entries.flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isPlainObject(value) ? flatten(value, path, seen) : [[path, value]];
  });
};

const formatValue = (input: unknown): string => {
  const value = typeof input === "string" ? input : Formatter.format(input);
  return SIMPLE_LOG_VALUE_PATTERN.test(value) ? value : JSON.stringify(value);
};

const formatter = (id: string = runId) =>
  Logger.formatStructured.pipe(
    Logger.map((output) => {
      const messages = Array.isArray(output.message)
        ? output.message
        : [output.message];

      return [
        ["timestamp", output.timestamp],
        ["level", output.level],
        ["run", id],
        ...messages.flatMap((value) =>
          isPlainObject(value) ? flatten(value) : [["message", value] as const]
        ),
        ...(output.cause === undefined
          ? []
          : [["cause", output.cause] as const]),
        ...flatten(output.spans),
        ...flatten(output.annotations),
      ]
        .map(([key, value]) => `${key}=${formatValue(value)}`)
        .join(" ");
    })
  );

/** Create the structured stderr logger with an injectable output sink. */
export const makeStderrLogger = (
  write: (output: string) => unknown = (output) => process.stderr.write(output)
) => Logger.make((options) => write(`${formatter().log(options)}\n`));

/** Production structured logger writing to process stderr. */
export const stderrLogger = makeStderrLogger();

const isLogLevelName = (value: string): value is keyof typeof LOG_LEVELS =>
  value in LOG_LEVELS;

/** Parse a configured minimum log level. */
export const parseLogLevel = (value: string): LogLevel | undefined => {
  const normalized = value.toUpperCase();
  return isLogLevelName(normalized) ? LOG_LEVELS[normalized] : undefined;
};
