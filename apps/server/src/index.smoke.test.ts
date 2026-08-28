import { expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { makeServerApplicationLayer, ServerApplication } from "./index.js";
import type { ServerApplicationService } from "./index.js";

const serverApplicationLayer = makeServerApplicationLayer({
  auth: {
    betterAuthSecret: Redacted.make("test-secret-at-least-32-characters"),
    betterAuthUrl: new URL("http://localhost:3000"),
    corsOrigin: new URL("http://localhost:3001"),
    discordClientId: "test-discord-client-id",
    discordClientSecret: Redacted.make("test-discord-client-secret"),
    isProduction: false,
  },
  corsOrigin: "http://localhost:3001",
  databaseUrl: Redacted.make(
    "postgresql://postgres:password@localhost:5433/tepirek-revamped-test"
  ),
  discordGuildId: "test-discord-server-id",
  firecrawl: {
    apiKey: Redacted.make("test-firecrawl-api-key"),
    monthlyRequestBudget: 900,
    perUserMonthlyRequestBudget: 100,
  },
  observability: {
    deploymentEnvironmentName: "test",
    minimumLogLevel: "Info",
    printLogs: false,
    serviceVersion: "0.0.0-test",
  },
});

const withServerApplication = <A>(
  use: (application: ServerApplicationService) => Effect.Effect<A>
) =>
  Effect.scoped(
    Effect.gen(function* scopedServerApplication() {
      const context = yield* Layer.build(serverApplicationLayer);
      return yield* use(Context.get(context, ServerApplication));
    })
  );

it.effect("responds to the Effect HttpApi health endpoint", () =>
  withServerApplication(({ app }) =>
    Effect.gen(function* healthRequest() {
      const response = yield* Effect.promise(
        async () => await app.request("/health")
      );
      const body = yield* Effect.promise(async () => await response.json());

      expect(body).toBe("OK");
      expect(response.status).toBe(200);
    })
  )
);

it.effect("forwards application API routes to the Effect handler", () =>
  withServerApplication(({ app }) =>
    Effect.gen(function* applicationApiRequest() {
      const response = yield* Effect.promise(
        async () => await app.request("/announcements")
      );
      const body = yield* Effect.promise(async () => await response.text());

      expect(body).toContain("AnnouncementUnauthorized");
      expect(response.status).not.toBe(404);
    })
  )
);

it.effect("handles CORS preflight for the configured origin", () =>
  withServerApplication(({ app }) =>
    Effect.gen(function* corsRequest() {
      const response = yield* Effect.promise(
        async () =>
          await app.request("/health", {
            headers: {
              "Access-Control-Request-Method": "POST",
              Origin: "http://localhost:3001",
            },
            method: "OPTIONS",
          })
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "http://localhost:3001"
      );
    })
  )
);
