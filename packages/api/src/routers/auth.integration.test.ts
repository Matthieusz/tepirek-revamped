import { user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { testDb } from "../test/integration/database";

// Ensure the auth module can import against the integration database and
// dummy Discord/better-auth env values. These must be set before the auth
// module is imported, so they live above the dynamic import below.
process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DISCORD_CLIENT_ID ??= "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET ??= "test-discord-client-secret";

const signUpRequest = async (body: Record<string, unknown>) => {
  const { auth } = await import("@tepirek-revamped/auth");

  return auth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  );
};

describe("Better Auth signup privilege field injection", () => {
  const signUpViaAuthHandler = async (
    body: Record<string, unknown>,
    email: string
  ) => {
    const response = await signUpRequest({ email, ...body });
    if (!response.ok) {
      throw new Error(`signup failed: ${await response.text()}`);
    }
    const [createdUser] = await testDb
      .select()
      .from(user)
      .where(eq(user.email, email));
    return createdUser;
  };

  it("ignores client-supplied role and verified fields and persists defaults", async () => {
    const email = "privilege-injection@example.com";

    const createdUser = await signUpViaAuthHandler(
      {
        name: "Privilege Injector",
        password: "super-secret-password",
        role: "admin",
        verified: true,
      },
      email
    );

    expect(createdUser).toBeDefined();
    expect(createdUser?.role).toBe("user");
    expect(createdUser?.verified).toBe(false);
  });

  it("creates a new user with default role and verified=false when privilege fields are omitted", async () => {
    const email = "safe-signup@example.com";

    const createdUser = await signUpViaAuthHandler(
      {
        name: "Safe Signup",
        password: "super-secret-password",
      },
      email
    );

    expect(createdUser).toBeDefined();
    expect(createdUser?.role).toBe("user");
    expect(createdUser?.verified).toBe(false);
  });
});
