import { user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import * as Layer from "effect/Layer";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "./server/effect-app.js";
import { AppHttpApiLayer } from "./server/http-api-handlers.js";
import { testDb } from "./test/integration/database.js";

process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DISCORD_CLIENT_ID ??= "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET ??= "test-discord-client-secret";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const appHttpApiLayer = AppHttpApiLayer.pipe(
  Layer.provide(makeApiLiveLayer(databaseUrl)),
  Layer.provide(HttpServer.layerServices)
) as Layer.Layer<HttpRouter.HttpRouter>;

const appHttpApi = HttpRouter.toWebHandler(appHttpApiLayer, {
  disableLogger: true,
});

const requestHttpApi = (path: string, init?: RequestInit) =>
  appHttpApi.handler(new Request(`http://localhost:3000${path}`, init));

const createSignedInUser = async (name: string) => {
  const { auth } = await import("@tepirek-revamped/auth");
  const email = `${name}@example.com`;
  const response = await auth.handler(
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
    .set({ verified: true })
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

const jsonPost = (body: unknown, cookie?: string): RequestInit => ({
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
    ...(cookie === undefined ? {} : { Cookie: cookie }),
  },
  method: "POST",
});

const expectUnauthorized = (response: Response) => {
  expect(response.status).toBe(500);
  expect(response.headers.get("content-type")).toBe("application/json");
  return expect(response.json()).resolves.toMatchObject({
    _tag: "SquadBuilderUnauthorized",
  });
};

describe("squad-builder squad-group route auth", () => {
  it("returns 401 for unauthenticated create squad group", async () => {
    const response = await requestHttpApi(
      "/squad-builder/squad-groups",
      jsonPost({ name: "My Group" })
    );

    await expectUnauthorized(response);
  });

  it("returns 401 for unauthenticated list owned squad groups", async () => {
    const response = await requestHttpApi(
      "/squad-builder/squad-groups/owned",
      jsonPost({})
    );

    await expectUnauthorized(response);
  });

  it("returns 401 for unauthenticated get squad group detail", async () => {
    const response = await requestHttpApi(
      "/squad-builder/squad-groups/detail",
      jsonPost({ groupId: 1 })
    );

    await expectUnauthorized(response);
  });

  it("ignores actorUserId in create payload and derives actor from session", async () => {
    const user1 = await createSignedInUser("spoof-user1");
    const user2 = await createSignedInUser("spoof-user2");

    const createResponse = await requestHttpApi(
      "/squad-builder/squad-groups",
      jsonPost({ actorUserId: user2.id, name: "Spoofed Group" }, user1.cookie)
    );

    expect(createResponse.status).toBe(200);

    const user1OwnedResponse = await requestHttpApi(
      "/squad-builder/squad-groups/owned",
      jsonPost({}, user1.cookie)
    );
    expect(user1OwnedResponse.status).toBe(200);
    const user1Owned = await user1OwnedResponse.json();
    expect(user1Owned).toHaveLength(1);
    expect(user1Owned[0]).toMatchObject({ name: "Spoofed Group" });

    const user2OwnedResponse = await requestHttpApi(
      "/squad-builder/squad-groups/owned",
      jsonPost({}, user2.cookie)
    );
    expect(user2OwnedResponse.status).toBe(200);
    const user2Owned = await user2OwnedResponse.json();
    expect(user2Owned).toHaveLength(0);
  });

  it("authenticated user only sees their own squad groups", async () => {
    const user1 = await createSignedInUser("owner-1");
    const user2 = await createSignedInUser("owner-2");

    const response1 = await requestHttpApi(
      "/squad-builder/squad-groups",
      jsonPost({ name: "User1 Group" }, user1.cookie)
    );
    expect(response1.status).toBe(200);

    const response2 = await requestHttpApi(
      "/squad-builder/squad-groups",
      jsonPost({ name: "User2 Group" }, user2.cookie)
    );
    expect(response2.status).toBe(200);

    const owned1 = await requestHttpApi(
      "/squad-builder/squad-groups/owned",
      jsonPost({}, user1.cookie)
    );
    expect(owned1.status).toBe(200);
    const owned1Json = await owned1.json();
    expect(owned1Json).toHaveLength(1);
    expect(owned1Json[0]).toMatchObject({ name: "User1 Group" });

    const owned2 = await requestHttpApi(
      "/squad-builder/squad-groups/owned",
      jsonPost({}, user2.cookie)
    );
    expect(owned2.status).toBe(200);
    const owned2Json = await owned2.json();
    expect(owned2Json).toHaveLength(1);
    expect(owned2Json[0]).toMatchObject({ name: "User2 Group" });
  });
});
