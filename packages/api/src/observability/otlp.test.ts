import { describe, expect, it } from "vitest";

import { resource } from "./otlp.js";

describe("OTLP resource metadata", () => {
  it("sets complete built-in resource metadata after parsed OTEL attributes", () => {
    const metadata = resource({
      deploymentEnvironmentName: "test",
      resourceAttributes: {
        "custom.attribute": "custom",
        "deployment.environment.name": "from-otel",
        "service.instance.id": "from-otel",
        "tepirek.run": "from-otel",
      },
      serviceVersion: "1.2.3",
    });

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
