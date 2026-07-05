import { afterEach, describe, expect, it, vi } from "vitest";

import { resource } from "./otlp.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("OTLP resource metadata", () => {
  it("sets complete built-in resource metadata after parsed OTEL attributes", () => {
    vi.stubEnv(
      "OTEL_RESOURCE_ATTRIBUTES",
      "deployment.environment.name=from-otel,service.instance.id=from-otel,tepirek.run=from-otel,custom.attribute=custom"
    );
    vi.stubEnv("OTEL_DEPLOYMENT_ENVIRONMENT_NAME", "test");
    vi.stubEnv("npm_package_version", "1.2.3");

    const metadata = resource();

    expect(metadata.serviceName).toBe("tepirek-revamped-api");
    expect(metadata.serviceVersion).toBe("1.2.3");
    expect(metadata.attributes).toMatchObject({
      "custom.attribute": "custom",
      "deployment.environment.name": "test",
      "service.instance.id": expect.any(String),
      "tepirek.run": expect.any(String),
    });
    expect(metadata.attributes["service.instance.id"]).toBe(
      metadata.attributes["tepirek.run"]
    );
    expect(metadata.attributes["service.instance.id"]).not.toBe("from-otel");
  });
});
