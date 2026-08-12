import { describe, expect, it } from "vitest";

import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { RequestSession } from "../../protocol/auth/current-session.ts";
import { projectAuthenticatedSession } from "./http-api-handlers.ts";

const userId = AppUserId.make("session-user");

const requestSession: RequestSession = {
  session: {
    createdAt: new Date(0),
    expiresAt: new Date(1),
    id: "session-id",
    token: "session-token",
    updatedAt: new Date(0),
    userId,
  },
  user: {
    createdAt: new Date(0),
    email: "user@example.com",
    emailVerified: true,
    id: userId,
    image: null,
    name: "User",
    role: "user",
    updatedAt: new Date(0),
    verified: true,
  },
};

describe("projectAuthenticatedSession", () => {
  it("preserves null fields and omits fields that were absent", () => {
    const projected = projectAuthenticatedSession(requestSession);

    expect(Object.hasOwn(projected.session, "ipAddress")).toBe(false);
    expect(Object.hasOwn(projected.session, "userAgent")).toBe(false);
    expect(projected.user).toHaveProperty("image", null);
    expect(projected.user).toHaveProperty("role", "user");
    expect(JSON.stringify(projected)).toContain('"image":null');
  });
});
