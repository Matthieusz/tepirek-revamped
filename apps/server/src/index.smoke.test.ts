import { createServer } from "node:http";

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { HttpServer } from "effect/http";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { makeServerApplicationLayer, makeServerHostLayer } from "./index.js";

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
    process.env.TEST_DATABASE_URL ??
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

it.live(
  "starts the full application with health, protected API, and Better Auth routes",
  () =>
    Effect.gen(function* assembledServerSmoke() {
      const context = yield* Layer.build(
        makeServerHostLayer(
          serverApplicationLayer,
          NodeHttpServer.layerServer(createServer, {
            host: "127.0.0.1",
            port: 0,
          })
        )
      );

      const server = Context.get(context, HttpServer.HttpServer);
      const baseUrl = HttpServer.formatAddress(server.address);

      for (const [path, status, body] of [
        ["/health", 200, '"OK"'],
        ["/announcements", 401, "AnnouncementUnauthorized"],
        ["/api/auth/get-session", 200, "null"],
      ] as const) {
        const response = yield* Effect.promise(
          async () => await fetch(new URL(path, baseUrl))
        );

        expect(response.status, path).toBe(status);
        expect(
          yield* Effect.promise(async () => await response.text())
        ).toContain(body);
      }
    })
);
