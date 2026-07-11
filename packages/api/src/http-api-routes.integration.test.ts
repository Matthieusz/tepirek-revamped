import { user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { describe, expect, it } from "vitest";

import { AnnouncementStoreError } from "./adapters/announcement/announcement-store-error.js";
import { AnnouncementStore } from "./adapters/announcement/announcement-store.js";
import { makeBetterAuthAdapterLayer } from "./server/auth/better-auth-adapter.js";
import { makeApiLiveLayerFromConfig } from "./server/effect-app.js";
import { AppHttpApiLayer } from "./server/http-api-handlers.js";
import { Service as PreviewMargonemProfileImportService } from "./services/squad-builder/account-import/preview-margonem-profile-import-service.js";
import { FirecrawlRequestFailed } from "./services/squad-builder/firecrawl-client.js";
import { testAuth } from "./test/integration/auth.js";
import {
  createHero,
  createVerifiedMember,
} from "./test/integration/builders.js";
import { testDb } from "./test/integration/database.js";

process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DISCORD_CLIENT_ID ??= "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET ??= "test-discord-client-secret";

const appHttpApiLayer = AppHttpApiLayer.pipe(
  Layer.provideMerge(makeApiLiveLayerFromConfig()),
  Layer.provideMerge(makeBetterAuthAdapterLayer(testAuth)),
  Layer.provide(HttpServer.layerServices)
);

const appHttpApi = HttpRouter.toWebHandler(appHttpApiLayer, {
  disableLogger: true,
});

const requestHttpApi = (path: string, init?: RequestInit) =>
  appHttpApi.handler(new Request(`http://localhost:3000${path}`, init));

const sensitivePersistenceCause = new Error(
  "DatabaseError: relation users does not exist at postgres://admin:secret@database.internal/app"
);
const failingAnnouncementStoreLayer = Layer.succeed(
  AnnouncementStore,
  AnnouncementStore.of({
    create: () =>
      Effect.fail(
        new AnnouncementStoreError({
          cause: sensitivePersistenceCause,
          operation: "createAnnouncement",
        })
      ),
    delete: () =>
      Effect.fail(
        new AnnouncementStoreError({
          cause: sensitivePersistenceCause,
          operation: "deleteAnnouncement",
        })
      ),
    list: () =>
      Effect.fail(
        new AnnouncementStoreError({
          cause: sensitivePersistenceCause,
          operation: "listAnnouncements",
        })
      ),
  })
);
const failingProfilePreviewLayer = Layer.succeed(
  PreviewMargonemProfileImportService,
  PreviewMargonemProfileImportService.of({
    preview: () =>
      Effect.fail(
        new FirecrawlRequestFailed({
          cause: new Error(
            "FetchError: https://provider.example/profile?token=secret"
          ),
          profileId: 123,
        })
      ),
  })
);
const failingAnnouncementHttpApi = HttpRouter.toWebHandler(
  AppHttpApiLayer.pipe(
    Layer.provideMerge(
      Layer.merge(failingAnnouncementStoreLayer, failingProfilePreviewLayer)
    ),
    Layer.provideMerge(makeApiLiveLayerFromConfig()),
    Layer.provideMerge(makeBetterAuthAdapterLayer(testAuth)),
    Layer.provide(HttpServer.layerServices)
  ),
  { disableLogger: true }
);

const createSignedInAdmin = async (name: string) => {
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
    .set({ role: "admin", verified: true })
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

const jsonPost = (body: unknown, cookie: string): RequestInit => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json", Cookie: cookie },
  method: "POST",
});

const authenticatedGet = (cookie: string): RequestInit => ({
  headers: { Cookie: cookie },
  method: "GET",
});

describe("migrated Effect HttpApi routes", () => {
  it("redacts persistence causes from route responses", async () => {
    const { cookie } = await createSignedInAdmin("redaction-admin");
    const response = await failingAnnouncementHttpApi.handler(
      new Request("http://localhost:3000/announcements", {
        ...authenticatedGet(cookie),
      })
    );

    expect(response.status).toBe(500);
    const responseBody = await response.text();
    expect(responseBody).toContain("AnnouncementPersistenceUnavailable");
    expect(responseBody).toContain("listAnnouncements");
    expect(responseBody).not.toContain("cause");
    expect(responseBody).not.toContain("DatabaseError");
    expect(responseBody).not.toContain("postgres://");
    expect(responseBody).not.toContain("secret");
    expect(responseBody).not.toContain("database.internal");
  });

  it("redacts upstream causes from route responses", async () => {
    const { cookie } = await createSignedInAdmin("upstream-redaction-admin");
    const response = await failingAnnouncementHttpApi.handler(
      new Request(
        "http://localhost:3000/squad-builder/account-imports/preview-profile",
        jsonPost(
          { profileUrl: "https://www.margonem.pl/profile/view,123" },
          cookie
        )
      )
    );

    expect(response.status).toBe(502);
    const responseBody = await response.text();
    expect(responseBody).toContain("SquadBuilderUpstreamUnavailable");
    expect(responseBody).toContain("FirecrawlRequestFailed");
    expect(responseBody).not.toContain("cause");
    expect(responseBody).not.toContain("FetchError");
    expect(responseBody).not.toContain("provider.example");
    expect(responseBody).not.toContain("token");
    expect(responseBody).not.toContain("secret");
  });

  it("serves bet routes through the final HttpApi handler seam", async () => {
    const admin = await createSignedInAdmin("bet-admin");
    const member = await createVerifiedMember({ id: "bet-member" });
    const hero = await createHero({ name: "Bet Hero" });
    const { cookie } = admin;

    const createResponse = await requestHttpApi(
      "/bet",
      jsonPost({ heroId: hero.id, userIds: [member.id] }, cookie)
    );

    expect(createResponse.status).toBe(200);
    await expect(createResponse.json()).resolves.toMatchObject({
      createdBy: admin.id,
      heroId: hero.id,
      memberCount: 1,
    });

    const listResponse = await requestHttpApi("/bet", authenticatedGet(cookie));

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject([
      { heroId: hero.id, heroName: "Bet Hero", memberCount: 1 },
    ]);
  });

  it("serves ranking routes through the final HttpApi handler seam", async () => {
    const admin = await createSignedInAdmin("ranking-admin");
    const member = await createVerifiedMember({ id: "ranking-member" });
    const hero = await createHero({ name: "Ranking Hero" });
    const { cookie } = admin;

    await requestHttpApi(
      "/bet",
      jsonPost({ heroId: hero.id, userIds: [member.id] }, cookie)
    );

    const response = await requestHttpApi(
      "/ranking/hero-stats",
      jsonPost({ heroId: hero.id }, cookie)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      currentPointWorth: 0,
      heroId: hero.id,
      heroName: "Ranking Hero",
      totalBets: 1,
      totalPoints: 20,
    });

    const rankingResponse = await requestHttpApi(
      "/ranking",
      jsonPost({ heroId: hero.id }, cookie)
    );

    expect(rankingResponse.status).toBe(200);
    await expect(rankingResponse.json()).resolves.toMatchObject({
      pointWorth: 0,
      ranking: [
        {
          totalBets: 1,
          totalEarnings: "0.00",
          totalPoints: "20.00",
          userId: member.id,
        },
      ],
      totalBets: 1,
    });
  });

  it("serves vault routes through the final HttpApi handler seam", async () => {
    const admin = await createSignedInAdmin("vault-admin");
    const member = await createVerifiedMember({ id: "vault-member" });
    const hero = await createHero({ name: "Vault Hero" });
    const { cookie } = admin;

    await requestHttpApi(
      "/bet",
      jsonPost({ heroId: hero.id, userIds: [member.id] }, cookie)
    );

    const distributeResponse = await requestHttpApi(
      "/vault/distribute-gold",
      jsonPost({ goldAmount: 100_000_000, heroId: hero.id }, cookie)
    );

    expect(distributeResponse.status).toBe(200);
    await expect(distributeResponse.json()).resolves.toMatchObject({
      goldAmount: 100_000_000,
      heroId: hero.id,
      heroName: "Vault Hero",
      pointWorth: 5_000_000,
      success: true,
      totalPoints: 20,
      usersUpdated: 1,
    });

    const vaultResponse = await requestHttpApi("/vault", jsonPost({}, cookie));

    expect(vaultResponse.status).toBe(200);
    await expect(vaultResponse.json()).resolves.toMatchObject([
      { totalEarnings: "100000000.00", userId: member.id },
    ]);
  });
});
