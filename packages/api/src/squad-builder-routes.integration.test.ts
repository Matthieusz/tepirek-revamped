import { describe, expect, it as effectIt } from "@effect/vitest";
import { makeBetterAuthServiceLayer } from "@tepirek-revamped/auth";
import { user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { HttpServer } from "effect/unstable/http";

import { SquadGroupSummarySchema } from "./protocol/squad-builder/squad-groups/squad-groups-schema.ts";
import { makeApiLiveLayerFromValues } from "./server/effect-app.ts";
import { AppHttpApiLayer } from "./server/http-api-handlers.ts";
import { testAuth } from "./test/integration/auth.ts";
import { testDatabaseUrl, testDb } from "./test/integration/database.ts";
import { integrationHandler } from "./test/integration/http-handler.ts";
import type { IntegrationHandler } from "./test/integration/http-handler.ts";

const apiLiveLayer = makeApiLiveLayerFromValues({
  databaseUrl: testDatabaseUrl,
  discordGuildId: "test-discord-server-id",
  firecrawl: {
    apiKey: Redacted.make("test-firecrawl-api-key"),
    monthlyRequestBudget: 900,
  },
});

const appHttpApiLayer = AppHttpApiLayer.pipe(
  Layer.provideMerge(apiLiveLayer),
  Layer.provideMerge(makeBetterAuthServiceLayer(testAuth)),
  Layer.provide(HttpServer.layerServices)
);

const withAppHttpApi = <A>(
  use: (appHttpApi: IntegrationHandler) => Promise<A>
) =>
  Effect.gen(function* acquireAppHttpApi() {
    const appHttpApi = yield* integrationHandler(appHttpApiLayer);
    return yield* Effect.promise(async () => await use(appHttpApi));
  });

const requestHttpApi = async (
  appHttpApi: IntegrationHandler,
  path: string,
  init?: RequestInit
) =>
  await appHttpApi.handler(new Request(`http://localhost:3000${path}`, init));

const createSignedInUser = async (name: string, verified = true) => {
  const email = `${name}@example.com`;
  const response = await testAuth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      body: JSON.stringify({
        email,
        name,
        password: "super-secret-password",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  );

  if (!response.ok) {
    throw new Error(`sign up failed: ${await response.text()}`);
  }

  const [createdUser] = await testDb
    .update(user)
    .set({ verified })
    .where(eq(user.email, email))
    .returning();

  if (!createdUser) {
    throw new Error("Expected sign up to create a user");
  }

  const cookie = response.headers.get("set-cookie");
  if (!cookie) {
    throw new Error("Expected sign up to create a session cookie");
  }

  return { cookie, id: createdUser.id };
};

const jsonPost = (
  body: Parameters<typeof JSON.stringify>[0],
  cookie?: string
): RequestInit => {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie !== undefined) {
    headers.set("Cookie", cookie);
  }

  return {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  };
};

const expectUnauthorized = async (response: Response) => {
  expect(response.status).toBe(401);
  expect(response.headers.get("content-type")).toBe("application/json");
  await expect(response.json()).resolves.toMatchObject({
    _tag: "SquadBuilderUnauthorized",
  });
};

describe("squad-builder squad-group route auth", () => {
  effectIt.effect("returns 401 for unauthenticated create squad group", () =>
    withAppHttpApi(async (appHttpApi) => {
      const response = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups",
        jsonPost({ name: "My Group" })
      );

      await expectUnauthorized(response);
    })
  );

  effectIt.effect(
    "returns 401 for unauthenticated list owned squad groups",
    () =>
      withAppHttpApi(async (appHttpApi) => {
        const response = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups/owned",
          jsonPost({})
        );

        await expectUnauthorized(response);
      })
  );

  effectIt.effect(
    "returns 401 for unauthenticated get squad group detail",
    () =>
      withAppHttpApi(async (appHttpApi) => {
        const response = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups/detail",
          jsonPost({ groupId: 1 })
        );

        await expectUnauthorized(response);
      })
  );

  effectIt.effect(
    "ignores actorUserId in create payload and derives actor from session",
    () =>
      withAppHttpApi(async (appHttpApi) => {
        const user1 = await createSignedInUser("spoof-user1");
        const user2 = await createSignedInUser("spoof-user2");

        const createResponse = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups",
          jsonPost(
            { actorUserId: user2.id, name: "Spoofed Group" },
            user1.cookie
          )
        );

        expect(createResponse.status).toBe(200);

        const user1OwnedResponse = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups/owned",
          jsonPost({}, user1.cookie)
        );
        expect(user1OwnedResponse.status).toBe(200);
        const user1Owned = Schema.decodeUnknownSync(
          Schema.Array(SquadGroupSummarySchema)
        )(await user1OwnedResponse.json());
        expect(user1Owned).toHaveLength(1);
        expect(user1Owned[0]).toMatchObject({ name: "Spoofed Group" });

        const user2OwnedResponse = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups/owned",
          jsonPost({}, user2.cookie)
        );
        expect(user2OwnedResponse.status).toBe(200);
        const user2Owned = await user2OwnedResponse.json();
        expect(user2Owned).toHaveLength(0);
      })
  );

  effectIt.effect("authenticated user only sees their own squad groups", () =>
    withAppHttpApi(async (appHttpApi) => {
      const user1 = await createSignedInUser("owner-1");
      const user2 = await createSignedInUser("owner-2");

      const response1 = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups",
        jsonPost({ name: "User1 Group" }, user1.cookie)
      );
      expect(response1.status).toBe(200);

      const response2 = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups",
        jsonPost({ name: "User2 Group" }, user2.cookie)
      );
      expect(response2.status).toBe(200);

      const owned1 = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups/owned",
        jsonPost({}, user1.cookie)
      );
      expect(owned1.status).toBe(200);
      const owned1Json = Schema.decodeUnknownSync(
        Schema.Array(SquadGroupSummarySchema)
      )(await owned1.json());
      expect(owned1Json).toHaveLength(1);
      expect(owned1Json[0]).toMatchObject({ name: "User1 Group" });

      const owned2 = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups/owned",
        jsonPost({}, user2.cookie)
      );
      expect(owned2.status).toBe(200);
      const owned2Json = Schema.decodeUnknownSync(
        Schema.Array(SquadGroupSummarySchema)
      )(await owned2.json());
      expect(owned2Json).toHaveLength(1);
      expect(owned2Json[0]).toMatchObject({ name: "User2 Group" });
    })
  );

  effectIt.effect("only the owner can permanently delete a squad group", () =>
    withAppHttpApi(async (appHttpApi) => {
      const owner = await createSignedInUser("delete-owner");
      const otherUser = await createSignedInUser("delete-other");
      const createResponse = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups",
        jsonPost({ name: "Delete Me" }, owner.cookie)
      );
      expect(createResponse.status).toBe(200);
      const created = Schema.decodeUnknownSync(SquadGroupSummarySchema)(
        await createResponse.json()
      );

      const forbiddenResponse = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups/delete",
        jsonPost({ groupId: created.groupId }, otherUser.cookie)
      );
      expect(forbiddenResponse.status).toBe(403);

      const deleteResponse = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups/delete",
        jsonPost({ groupId: created.groupId }, owner.cookie)
      );
      expect(deleteResponse.status).toBe(200);
      await expect(deleteResponse.json()).resolves.toEqual({
        groupId: created.groupId,
      });

      const detailResponse = await requestHttpApi(
        appHttpApi,
        "/squad-builder/squad-groups/detail",
        jsonPost({ groupId: created.groupId }, owner.cookie)
      );
      expect(detailResponse.status).toBe(404);
    })
  );

  effectIt.effect(
    "rejects a warmed session immediately after admin privileges are removed",
    () =>
      withAppHttpApi(async (appHttpApi) => {
        const admin = await createSignedInUser("revoked-admin");
        await testDb
          .update(user)
          .set({ role: "admin" })
          .where(eq(user.id, admin.id));

        const warmedResponse = await requestHttpApi(
          appHttpApi,
          "/events",
          jsonPost(
            {
              endTime: "2030-01-01T00:00:00.000Z",
              name: "Warmed Admin Event",
            },
            admin.cookie
          )
        );
        expect(warmedResponse.status).toBe(200);

        await testDb
          .update(user)
          .set({ role: "user" })
          .where(eq(user.id, admin.id));

        const revokedResponse = await requestHttpApi(
          appHttpApi,
          "/events",
          jsonPost(
            {
              endTime: "2030-01-02T00:00:00.000Z",
              name: "Should Be Rejected",
            },
            admin.cookie
          )
        );
        expect(revokedResponse.status).not.toBe(200);
        await expect(revokedResponse.json()).resolves.toMatchObject({
          _tag: "EventForbidden",
        });
      })
  );

  effectIt.effect(
    "accepts a warmed session immediately after verification is granted",
    () =>
      withAppHttpApi(async (appHttpApi) => {
        const userToVerify = await createSignedInUser("newly-verified", false);

        const warmedResponse = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups",
          jsonPost({ name: "Before Verification" }, userToVerify.cookie)
        );
        expect(warmedResponse.status).toBe(403);

        await testDb
          .update(user)
          .set({ verified: true })
          .where(eq(user.id, userToVerify.id));

        const verifiedResponse = await requestHttpApi(
          appHttpApi,
          "/squad-builder/squad-groups",
          jsonPost({ name: "After Verification" }, userToVerify.cookie)
        );
        expect(verifiedResponse.status).toBe(200);
      })
  );
});
