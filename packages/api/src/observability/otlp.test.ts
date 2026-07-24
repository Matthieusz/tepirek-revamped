import { describe, expect, it } from "vitest";

import { resource } from "./otlp.ts";

describe("OTLP resource metadata", () => {
  it("sets the application-specific resource defaults", () => {
    const metadata = resource(
      {
        deploymentEnvironmentName: "test",
        serviceVersion: "1.2.3",
      },
      "test-run"
    );

    expect(metadata).toEqual({
      attributes: {
        "deployment.environment.name": "test",
        "service.instance.id": "test-run",
        "tepirek.run": "test-run",
      },
      serviceName: "tepirek-revamped-api",
      serviceVersion: "1.2.3",
    });
  });
});
