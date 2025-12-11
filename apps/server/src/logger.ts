import pino, { stdTimeFunctions } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

export const logger = pino({
  name: "tepirek-server",
  level,
  timestamp: stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    service: "server",
  },
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
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
});

export type Logger = typeof logger;
