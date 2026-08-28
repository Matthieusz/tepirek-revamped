import { describe, expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { TestClock } from "effect/testing";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { FirecrawlClientService } from "../../../services/squad-builder/firecrawl-client.ts";
import { FirecrawlClientServiceLiveLayer } from "./firecrawl-client.ts";
import { makeFirecrawlConfigLayer } from "./firecrawl-config.ts";

const TEST_API_KEY = "test-firecrawl-key";
const TEST_CONFIG = {
  apiKey: Redacted.make(TEST_API_KEY),
  monthlyRequestBudget: 900,
  perUserMonthlyRequestBudget: 100,
};

type ClientStep = (
  request: HttpClientRequest.HttpClientRequest
) => Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError
>;

const jsonResponse =
  (body: Parameters<typeof Response.json>[0], status = 200): ClientStep =>
  (request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, Response.json(body, { status }))
    );

const textResponse =
  (body: string, status = 200): ClientStep =>
  (request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(body, { status }))
    );

const emptyResponse =
  (status: number): ClientStep =>
  (request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(null, { status }))
    );

const makeSequenceClient = (
  steps: readonly ClientStep[],
  requests: HttpClientRequest.HttpClientRequest[] = []
): HttpClient.HttpClient => {
  let attempt = 0;
  return HttpClient.make((request) =>
    Effect.suspend(() => {
      requests.push(request);
      const step = steps[attempt];
      attempt += 1;
      return step === undefined
        ? Effect.die(new Error("Unexpected Firecrawl HTTP attempt"))
        : step(request);
    })
  );
};

const provideFirecrawlClient = (client: HttpClient.HttpClient) =>
  Effect.provide(
    FirecrawlClientServiceLiveLayer.pipe(
      Layer.provide(
        Layer.merge(
          makeFirecrawlConfigLayer(TEST_CONFIG),
          Layer.succeed(HttpClient.HttpClient, client)
        )
      )
    )
  );

const scrapeWith = (client: HttpClient.HttpClient, profileId: number) =>
  Effect.gen(function* scrapeProfile() {
    const parsedProfileId = yield* parseMargonemProfileId(profileId);
    return yield* FirecrawlClientService.use((service) =>
      service.scrapeProfileHtml(parsedProfileId)
    );
  }).pipe(provideFirecrawlClient(client));

const scrapeUrlWith = (client: HttpClient.HttpClient, url: string) =>
  FirecrawlClientService.use((service) => service.scrapeUrlHtml(url)).pipe(
    provideFirecrawlClient(client)
  );

const readRequestBody = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.gen(function* readBody() {
    const webRequest = yield* HttpClientRequest.toWeb(request);
    const body = yield* Effect.tryPromise(() => webRequest.text());
    const parsedBody: unknown = JSON.parse(body);
    return parsedBody;
  });

interface TestDocument {
  readonly html?: string;
  readonly metadata?: unknown;
}

const DEFAULT_DOCUMENT: TestDocument = { html: "<html>profile</html>" };

const successEnvelope = (data?: TestDocument) => ({
  data: data ?? DEFAULT_DOCUMENT,
  success: true,
});

const NO_RETRY_CASES: readonly (readonly [string, ClientStep])[] = [
  ["a 502 response", emptyResponse(502)],
  [
    "a transport failure",
    (request) =>
      Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({
            cause: new Error("network unavailable"),
            request,
          }),
        })
      ),
  ],
];

describe("FirecrawlClientServiceLiveLayer", () => {
  it.effect("constructs the authenticated Firecrawl scrape request", () =>
    Effect.gen(function* requestProfile() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [jsonResponse(successEnvelope())],
        requests
      );

      yield* scrapeWith(client, 123);

      expect(requests).toHaveLength(1);
      const [request] = requests;
      expect(request).toBeDefined();
      if (request === undefined) {
        return;
      }

      expect(request).toMatchObject({
        headers: {
          accept: "application/json",
          authorization: `Bearer ${TEST_API_KEY}`,
          "content-type": "application/json",
        },
        method: "POST",
        url: "https://api.firecrawl.dev/v2/scrape",
      });
      expect(JSON.stringify(request)).not.toContain(TEST_API_KEY);
      expect(yield* readRequestBody(request)).toEqual({
        formats: ["html"],
        url: "https://www.margonem.pl/profile/view,123",
      });
    })
  );

  it.effect("requests complete HTML when scraping an arbitrary URL", () =>
    Effect.gen(function* requestUrl() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [jsonResponse(successEnvelope())],
        requests
      );
      const url =
        "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0";

      yield* scrapeUrlWith(client, url);

      const [request] = requests;
      expect(request).toBeDefined();
      if (request !== undefined) {
        expect(yield* readRequestBody(request)).toEqual({
          formats: ["html"],
          onlyMainContent: false,
          url,
        });
      }
    })
  );

  it.effect("decodes HTML and supported metadata", () =>
    Effect.gen(function* decodeSuccess() {
      const result = yield* scrapeWith(
        makeSequenceClient([
          jsonResponse(
            successEnvelope({
              html: "<html>profile</html>",
              metadata: {
                cacheState: "hit",
                contentType: "text/html",
                creditsUsed: 3,
                sourceURL: "https://www.margonem.pl/profile/view,123",
                statusCode: 200,
                url: "https://www.margonem.pl/profile/view,123",
              },
            })
          ),
        ]),
        123
      );

      expect(result).toEqual({
        html: "<html>profile</html>",
        metadata: {
          cacheState: "hit",
          contentType: "text/html",
          creditsUsed: 3,
          sourceURL: "https://www.margonem.pl/profile/view,123",
          statusCode: 200,
          url: "https://www.margonem.pl/profile/view,123",
        },
      });
    })
  );

  it.effect("defaults omitted creditsUsed to one", () =>
    Effect.gen(function* defaultCredits() {
      const result = yield* scrapeWith(
        makeSequenceClient([jsonResponse(successEnvelope())]),
        123
      );

      expect(result.metadata.creditsUsed).toBe(1);
    })
  );

  it.effect.each([
    ["empty HTML", successEnvelope({ html: "" })],
    [
      "malformed metadata",
      successEnvelope({ html: "ok", metadata: { statusCode: "200" } }),
    ],
    [
      "invalid credits",
      successEnvelope({ html: "ok", metadata: { creditsUsed: -1 } }),
    ],
    [
      "malformed success envelope",
      { data: { html: "ok", metadata: [] }, success: true },
    ],
  ])("maps %s to FirecrawlResponseNotParseable", ([, body]) =>
    Effect.gen(function* rejectMalformedResponse() {
      const error = yield* Effect.flip(
        scrapeWith(makeSequenceClient([jsonResponse(body)]), 456)
      );

      expect(error).toMatchObject({
        _tag: "FirecrawlResponseNotParseable",
        profileId: 456,
      });
    })
  );

  it.effect("maps malformed JSON to FirecrawlResponseNotParseable", () =>
    Effect.gen(function* rejectMalformedJson() {
      const error = yield* Effect.flip(
        scrapeWith(makeSequenceClient([textResponse("{")]), 456)
      );

      expect(error).toMatchObject({
        _tag: "FirecrawlResponseNotParseable",
        profileId: 456,
      });
    })
  );

  it.effect("maps a provider failure envelope with bounded diagnostics", () =>
    Effect.gen(function* rejectProviderFailure() {
      const error = yield* Effect.flip(
        scrapeWith(
          makeSequenceClient([
            jsonResponse({
              code: "RATE_LIMITED",
              error: "Too many requests",
              success: false,
            }),
          ]),
          456
        )
      );

      expect(error).toMatchObject({
        _tag: "FirecrawlRequestFailed",
        cause: {
          code: "RATE_LIMITED",
          error: "Too many requests",
          status: 200,
        },
        profileId: 456,
      });
    })
  );

  it.effect.each([401, 502])(
    "maps non-200 status %s to FirecrawlRequestFailed",
    (status) =>
      Effect.gen(function* rejectStatus() {
        const error = yield* Effect.flip(
          scrapeWith(makeSequenceClient([emptyResponse(status)]), 456)
        );

        expect(error).toMatchObject({
          _tag: "FirecrawlRequestFailed",
          cause: { status },
          profileId: 456,
        });
      })
  );

  it.effect("fails at the complete 30-second application deadline", () =>
    Effect.gen(function* enforceDeadline() {
      const client = HttpClient.make(() => Effect.never);
      const fiber = yield* scrapeWith(client, 456).pipe(Effect.forkChild);

      yield* Effect.yieldNow;
      yield* TestClock.adjust("30 seconds");

      const error = yield* Effect.flip(Fiber.join(fiber));
      expect(error).toMatchObject({
        _tag: "FirecrawlRequestFailed",
        profileId: 456,
      });
      expect(error.cause).toEqual(new Error("Firecrawl scrape timed out"));
    })
  );

  it.effect("propagates interruption to the injected HTTP client", () =>
    Effect.gen(function* interruptHttpClient() {
      const started = yield* Deferred.make<true>();
      const interrupted = yield* Deferred.make<true>();
      const client = HttpClient.make((_request) =>
        Deferred.succeed(started, true).pipe(
          Effect.andThen(
            Effect.never.pipe(
              Effect.ensuring(Deferred.succeed(interrupted, true))
            )
          )
        )
      );

      const fiber = yield* scrapeWith(client, 456).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      yield* Deferred.await(interrupted);

      const exit = yield* Fiber.await(fiber);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.hasInterruptsOnly(exit.cause)).toBe(true);
      }
    })
  );

  it.effect.each(NO_RETRY_CASES)("does not retry %s", ([, step]) =>
    Effect.gen(function* makeOneAttempt() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const error = yield* Effect.flip(
        scrapeWith(makeSequenceClient([step], requests), 456)
      );

      expect(requests).toHaveLength(1);
      expect(error._tag).toBe("FirecrawlRequestFailed");
    })
  );
});
