import pino, { stdTimeFunctions } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

export const logger = pino({
  base: {
    env: process.env.NODE_ENV,
    service: "server",
  },
  level,
  name: "tepirek-server",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
  timestamp: stdTimeFunctions.isoTime,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: false,
        },
      },
});

export type Logger = typeof logger;
