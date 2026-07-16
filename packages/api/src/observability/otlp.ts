import { Effect, Layer } from "effect";
import * as Redacted from "effect/Redacted";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as OtlpLogger from "effect/unstable/observability/OtlpLogger";
import * as OtlpSerialization from "effect/unstable/observability/OtlpSerialization";
import * as OtlpTracer from "effect/unstable/observability/OtlpTracer";

import { runId } from "./shared.ts";

export interface OtlpConfig {
  readonly deploymentEnvironmentName: string;
  readonly endpoint?: string;
  readonly headers?: Redacted.Redacted;
  readonly resourceAttributes: Readonly<Record<string, string>>;
  readonly serviceVersion: string;
}

const parseHeaders = (
  headers: Redacted.Redacted | undefined
): Record<string, string> | undefined => {
  if (headers === undefined) {
    return undefined;
  }
  return Object.fromEntries(
    Redacted.value(headers)
      .split(",")
      .map((entry) => {
        const separator = entry.indexOf("=");
        return [
          entry.slice(0, separator).trim(),
          entry.slice(separator + 1).trim(),
        ];
      })
  );
};

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

export const resource = (
  config: OtlpConfig
): {
  readonly attributes: Record<string, string>;
  readonly serviceName: string;
  readonly serviceVersion: string;
} => ({
  attributes: {
    ...config.resourceAttributes,
    "deployment.environment.name": config.deploymentEnvironmentName,
    "service.instance.id": runId,
    "tepirek.run": runId,
  },
  serviceName: "tepirek-revamped-api",
  serviceVersion: config.serviceVersion,
});

/** Build OTLP loggers from configuration parsed by the executable boundary. */
export const loggers = (config: OtlpConfig) => {
  const url = otlpUrl("logs", config.endpoint);

  return url === undefined
    ? []
    : [
        OtlpLogger.make({
          headers: parseHeaders(config.headers),
          resource: resource(config),
          url,
        }).pipe(Effect.provide(otlpSupportLayer)),
      ];
};

/** Build the OTLP tracing layer from executable-boundary configuration. */
export const tracingLayer = (config: OtlpConfig) => {
  const url = otlpUrl("traces", config.endpoint);

  return Promise.resolve(
    url === undefined
      ? Layer.empty
      : OtlpTracer.layer({
          headers: parseHeaders(config.headers),
          resource: resource(config),
          url,
        }).pipe(Layer.provide(otlpSupportLayer))
  );
};
