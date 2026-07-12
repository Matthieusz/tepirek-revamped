import { Effect, Layer } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as OtlpLogger from "effect/unstable/observability/OtlpLogger";
import * as OtlpSerialization from "effect/unstable/observability/OtlpSerialization";
import * as OtlpTracer from "effect/unstable/observability/OtlpTracer";

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

const otlpSupportLayer = Layer.merge(
  FetchHttpClient.layer,
  OtlpSerialization.layerJson
);

const otlpUrl = (
  path: "logs" | "traces",
  otlpEndpoint: string | undefined
): string | undefined => {
  if (!otlpEndpoint) {
    return undefined;
  }

  return `${otlpEndpoint.replace(/\/+$/u, "")}/v1/${path}`;
};

const deploymentEnvironmentName = (): string =>
  process.env.OTEL_DEPLOYMENT_ENVIRONMENT_NAME ??
  process.env.NODE_ENV ??
  "development";

export const resource = (): {
  readonly attributes: Record<string, string>;
  readonly serviceName: string;
  readonly serviceVersion: string;
} => ({
  attributes: {
    ...parseResourceAttributes(),
    "deployment.environment.name": deploymentEnvironmentName(),
    "service.instance.id": runId,
    "tepirek.run": runId,
  },
  serviceName: "tepirek-revamped-api",
  serviceVersion: process.env.npm_package_version ?? "0.0.0",
});

/** Build OTLP loggers for the configured or explicitly supplied endpoint. */
export const loggers = (otlpEndpoint: string | undefined = endpoint) => {
  const url = otlpUrl("logs", otlpEndpoint);

  return url === undefined
    ? []
    : [
        OtlpLogger.make({
          headers,
          resource: resource(),
          url,
        }).pipe(Effect.provide(otlpSupportLayer)),
      ];
};

/** Build the OTLP tracing layer for the configured or supplied endpoint. */
export const tracingLayer = (otlpEndpoint: string | undefined = endpoint) => {
  const url = otlpUrl("traces", otlpEndpoint);

  return Promise.resolve(
    url === undefined
      ? Layer.empty
      : OtlpTracer.layer({
          headers,
          resource: resource(),
          url,
        }).pipe(Layer.provide(otlpSupportLayer))
  );
};
