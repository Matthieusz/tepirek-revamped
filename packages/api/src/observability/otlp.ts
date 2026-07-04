import { Layer } from "effect";

import { runId } from "./shared.js";

const parseHeaders = (
  value: string | undefined
): Record<string, string> | undefined => {
  if (!value) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  for (const entry of value.split(",")) {
    const [key, ...rawValue] = entry.split("=");
    if (key) {
      headers[key] = rawValue.join("=");
    }
  }

  return headers;
};

const parseResourceAttributes = (): Record<string, string> => {
  const value = process.env.OTEL_RESOURCE_ATTRIBUTES;
  if (!value) {
    return {};
  }

  try {
    return Object.fromEntries(
      value.split(",").map((entry) => {
        const index = entry.indexOf("=");
        if (index < 1) {
          throw new Error("Invalid OTEL_RESOURCE_ATTRIBUTES entry");
        }
        return [
          decodeURIComponent(entry.slice(0, index)),
          decodeURIComponent(entry.slice(index + 1)),
        ];
      })
    );
  } catch {
    return {};
  }
};

export const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
export const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

export const resource = (): {
  readonly attributes: Record<string, string>;
  readonly serviceName: string;
  readonly serviceVersion: string;
} => ({
  attributes: {
    ...parseResourceAttributes(),
    "service.instance.id": runId,
    "tepirek.run": runId,
  },
  serviceName: "tepirek-revamped-api",
  serviceVersion: process.env.npm_package_version ?? "0.0.0",
});

export const loggers = () => [];

export const tracingLayer = () => Promise.resolve(Layer.empty);
