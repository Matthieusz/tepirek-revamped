import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createUnverifiedUser,
  createVerifiedMember,
} from "../test/integration/builders";
import {
  createAuthenticatedRouterClient,
  createUnauthenticatedRouterClient,
} from "../test/integration/router-client";

const expectOrpcError = async (
  action: Promise<unknown>,
  code: string,
  message?: string
) => {
  try {
    await action;
    throw new Error("Expected router call to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({ code });
    if (message) {
      expect(error).toMatchObject({ message });
    }
  }
};

describe("API router authorization gates", () => {
  it("rejects unauthenticated callers from protected router behavior", async () => {
    const client = createUnauthenticatedRouterClient();

    await expectOrpcError(client.user.getSession(), "UNAUTHORIZED");
  });

  it("rejects unverified users from verified-only guild-critical behavior with a Polish message", async () => {
    const user = await createUnverifiedUser({ id: "unverified-member" });
    const client = createAuthenticatedRouterClient(user);

    await expectOrpcError(
      client.auction.getStats({ profession: "paladin", type: "main" }),
      "FORBIDDEN",
      "Konto oczekuje na weryfikację"
    );
  });

  it("allows verified members through verified-only guild-critical behavior", async () => {
    const member = await createVerifiedMember({ id: "verified-member" });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.auction.getStats({ profession: "paladin", type: "main" })
    ).resolves.toEqual({ totalSignups: 0, uniqueUsers: 0 });
  });

  it("rejects verified non-admin members from admin-only behavior", async () => {
    const targetUser = await createUnverifiedUser({ id: "admin-target" });
    const member = await createVerifiedMember({ id: "non-admin-member" });
    const client = createAuthenticatedRouterClient(member);

    await expectOrpcError(
      client.user.setVerified({ userId: targetUser.id, verified: true }),
      "FORBIDDEN"
    );
  });

  it("allows admins through admin-only behavior", async () => {
    const targetUser = await createUnverifiedUser({
      id: "admin-verified-target",
    });
    const admin = await createAdmin({ id: "admin-member" });
    const client = createAuthenticatedRouterClient(admin);

    await expect(
      client.user.setVerified({ userId: targetUser.id, verified: true })
    ).resolves.toMatchObject({ id: targetUser.id, verified: true });
  });
});

describe("admin self-lockout guardrails", () => {
  it("prevents a verified admin from demoting themselves", async () => {
    const admin = await createAdmin({ id: "self-demotion-admin" });
    const client = createAuthenticatedRouterClient(admin);

    await expectOrpcError(
      client.user.setRole({ role: "user", userId: admin.id }),
      "FORBIDDEN"
    );

    await expect(client.user.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: admin.id, role: "admin" }),
      ])
    );
  });

  it("prevents a verified admin from unverifying themselves", async () => {
    const admin = await createAdmin({ id: "self-unverify-admin" });
    const client = createAuthenticatedRouterClient(admin);

    await expectOrpcError(
      client.user.setVerified({ userId: admin.id, verified: false }),
      "FORBIDDEN"
    );

    await expect(client.user.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: admin.id, verified: true }),
      ])
    );
  });

  it("protects the last verified admin from being demoted, even when targeted explicitly", async () => {
    const soleAdmin = await createAdmin({ id: "sole-admin" });
    const client = createAuthenticatedRouterClient(soleAdmin);

    await expectOrpcError(
      client.user.setRole({ role: "user", userId: soleAdmin.id }),
      "FORBIDDEN",
      "Nie można odebrać uprawnień ostatniemu administratorowi"
    );
  });

  it("allows an admin to demote another verified admin when one remains", async () => {
    const remaining = await createAdmin({ id: "remaining-admin" });
    const target = await createAdmin({ id: "demoted-admin" });
    const client = createAuthenticatedRouterClient(remaining);

    await expect(
      client.user.setRole({ role: "user", userId: target.id })
    ).resolves.toMatchObject({ id: target.id, role: "user" });

    await expect(client.user.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: remaining.id, role: "admin" }),
      ])
    );
  });

  it("serializes concurrent admin demotions so one verified admin remains", async () => {
    const adminOne = await createAdmin({ id: "concurrent-admin-one" });
    const adminTwo = await createAdmin({ id: "concurrent-admin-two" });
    const adminOneClient = createAuthenticatedRouterClient(adminOne);
    const adminTwoClient = createAuthenticatedRouterClient(adminTwo);

    const results = await Promise.allSettled([
      adminOneClient.user.setRole({ role: "user", userId: adminTwo.id }),
      adminTwoClient.user.setRole({ role: "user", userId: adminOne.id }),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected")
    ).toHaveLength(1);

    const rejectedResult = results.find(
      (result) => result.status === "rejected"
    );
    expect(rejectedResult?.status).toBe("rejected");
    if (rejectedResult?.status === "rejected") {
      expect(rejectedResult.reason).toBeInstanceOf(ORPCError);
    }

    const users = await adminOneClient.user.list();

    expect(
      users.filter((member) => member.role === "admin" && member.verified)
    ).toHaveLength(1);
  });
});
