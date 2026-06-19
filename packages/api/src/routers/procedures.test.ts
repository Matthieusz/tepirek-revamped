import { describe, expect, it } from "vitest";

import { isAdminSession, isVerifiedSession } from "./procedures";

describe("authorization predicates", () => {
  it("treats a null session as neither verified nor admin", () => {
    expect(isVerifiedSession(null)).toBe(false);
    expect(isAdminSession(null)).toBe(false);
  });

  it("rejects authenticated unverified users", () => {
    const session = { user: { role: "user", verified: false } };

    expect(isVerifiedSession(session)).toBe(false);
    expect(isAdminSession(session)).toBe(false);
  });

  it("accepts verified normal users without admin access", () => {
    const session = { user: { role: "user", verified: true } };

    expect(isVerifiedSession(session)).toBe(true);
    expect(isAdminSession(session)).toBe(false);
  });

  it("accepts verified admins as admins", () => {
    const session = { user: { role: "admin", verified: true } };

    expect(isVerifiedSession(session)).toBe(true);
    expect(isAdminSession(session)).toBe(true);
  });
});
