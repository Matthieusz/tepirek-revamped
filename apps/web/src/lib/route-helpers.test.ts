import { describe, expect, it } from "vitest";

import type { AuthSession } from "@/types/route";

import { isAdmin } from "./route-helpers";

const createSession = (role: "admin" | "user"): AuthSession =>
  ({
    session: {
      id: "session-id",
      token: "session-token",
      userId: "user-id",
    },
    user: {
      email: "user@example.com",
      id: "user-id",
      name: "Test User",
      role,
      verified: true,
    },
  }) as AuthSession;

describe("route helpers", () => {
  it("detects admin sessions", () => {
    expect(isAdmin(createSession("admin"))).toBe(true);
    expect(isAdmin(createSession("user"))).toBe(false);
  });
});
