import { readFileSync } from "node:fs";

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpClient from "effect/unstable/http/HttpClient";
import type * as HttpClientError from "effect/unstable/http/HttpClientError";
import type * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";
import { describe } from "vitest";

import {
  MargonemForumClientLiveLayer,
  MargonemForumClientService,
} from "./margonem-forum-client.ts";

const readFixture = (name: string): string =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf-8");

const htmlResponse =
  (body: string, status = 200, contentType = "text/html; charset=UTF-8") =>
  (request: HttpClientRequest.HttpClientRequest) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(body, { headers: { "Content-Type": contentType }, status })
      )
    );

const makeClient = (
  response: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<
    HttpClientResponse.HttpClientResponse,
    HttpClientError.HttpClientError
  >,
  requests: HttpClientRequest.HttpClientRequest[]
): HttpClient.HttpClient =>
  HttpClient.make((request) => {
    requests.push(request);
    return response(request);
  });

const fetchTopic = (
  client: HttpClient.HttpClient,
  category: "hero" | "elite2"
) =>
  MargonemForumClientService.use((forum) => forum.fetchTopic(category)).pipe(
    Effect.provide(
      MargonemForumClientLiveLayer.pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      )
    )
  );

describe("Margonem forum client", () => {
  it.effect("fetches both fixed ps=0 topics with descriptive headers", () =>
    Effect.gen(function* fetchBothTopics() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeClient(
        htmlResponse(readFixture("valid-topic.html")),
        requests
      );

      yield* fetchTopic(client, "hero");
      yield* fetchTopic(client, "elite2");

      expect(requests).toHaveLength(2);
      expect(requests[0]).toMatchObject({
        headers: {
          accept: "text/html",
          "user-agent":
            "tepirek-revamped legend pricing sync/0.1 (+https://tepirek.pl)",
        },
        method: "GET",
        url: "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0",
      });
      expect(requests[1]?.url).toBe(
        "https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0"
      );
    })
  );

  it.effect.each([
    ["block-page.html", "waiting or block page"],
    ["empty-page.html", "response is empty"],
    ["changed-format.html", "incomplete or unsupported HTML"],
  ] as const)("rejects unsafe fixture %s", ([fixture, expectedReason]) =>
    Effect.gen(function* rejectUnsafeFixture() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeClient(htmlResponse(readFixture(fixture)), requests);
      const error = yield* fetchTopic(client, "hero").pipe(Effect.flip);

      expect(error).toMatchObject({
        _tag: "MargonemForumDocumentRejected",
        category: "hero",
      });
      if (error._tag === "MargonemForumDocumentRejected") {
        expect(error.reason).toContain(expectedReason);
      }
    })
  );

  it.effect("rejects a non-HTML response before parsing", () =>
    Effect.gen(function* rejectContentType() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeClient(
        htmlResponse(readFixture("valid-topic.html"), 200, "text/plain"),
        requests
      );
      const error = yield* fetchTopic(client, "elite2").pipe(Effect.flip);

      expect(error).toMatchObject({
        _tag: "MargonemForumDocumentRejected",
        category: "elite2",
        reason: "response content type is not HTML",
      });
    })
  );

  it.effect("returns a typed request error for a permanent status", () =>
    Effect.gen(function* rejectStatus() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeClient(htmlResponse("not found", 404), requests);
      const error = yield* fetchTopic(client, "hero").pipe(Effect.flip);

      expect(requests).toHaveLength(1);
      expect(error).toMatchObject({
        _tag: "MargonemForumRequestFailed",
        category: "hero",
        status: 404,
      });
    })
  );
});
