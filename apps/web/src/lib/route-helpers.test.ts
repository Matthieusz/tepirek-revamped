import { describe, expect, it } from "vitest";

import type { AuthSession } from "@/types/route";

import { isAdmin } from "./route-helpers";

const createSession = (role: "admin" | "user"): AuthSession => ({
  session: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    id: "session-id",
    ipAddress: null,
    token: "session-token",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userAgent: null,
    userId: "user-id",
  },
  user: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "user@example.com",
    emailVerified: true,
    id: "user-id",
    image: null,
    name: "Test User",
    role,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    verified: true,
  },
});

describe("route helpers", () => {
  it("detects admin sessions", () => {
    expect(isAdmin(createSession("admin"))).toBe(true);
    expect(isAdmin(createSession("user"))).toBe(false);
  });
});
