import { Layer } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as OtlpLogger from "effect/unstable/observability/OtlpLogger";
import * as OtlpSerialization from "effect/unstable/observability/OtlpSerialization";
import * as OtlpTracer from "effect/unstable/observability/OtlpTracer";

export interface OtlpConfig {
  readonly deploymentEnvironmentName: string;
  readonly serviceVersion: string;
}

const otlpSupportLayer = Layer.merge(
  FetchHttpClient.layer,
  OtlpSerialization.layerJson
);

export const resource = (
  config: OtlpConfig,
  runId: string
): {
  readonly attributes: Record<string, string>;
  readonly serviceName: string;
  readonly serviceVersion: string;
} => ({
  attributes: {
    "deployment.environment.name": config.deploymentEnvironmentName,
    "service.instance.id": runId,
    "tepirek.run": runId,
  },
  serviceName: "tepirek-revamped-api",
  serviceVersion: config.serviceVersion,
});

/** Build the OTLP logger layer using Effect's OpenTelemetry configuration. */
export const loggerLayer = (config: OtlpConfig, runId: string) =>
  OtlpLogger.layerFromConfig({
    mergeWithExisting: true,
    resource: resource(config, runId),
  }).pipe(Layer.provide(otlpSupportLayer));

/** Build the OTLP tracing layer using Effect's OpenTelemetry configuration. */
export const tracingLayer = (config: OtlpConfig, runId: string) =>
  OtlpTracer.layerFromConfig({
    resource: resource(config, runId),
  }).pipe(Layer.provide(otlpSupportLayer));
