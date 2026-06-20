import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createVerifiedMember,
} from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

const eventInput = {
  color: "#22c55e",
  endTime: "2030-01-02T03:04:05.000Z",
  icon: "calendar",
  name: "Guild Boss Hunt",
} as const;

describe("event router Postgres integration", () => {
  it("lets an admin create an event that verified members can read", async () => {
    const admin = await createAdmin({ id: "event-admin" });
    const member = await createVerifiedMember({ id: "event-member" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await adminClient.event.create(eventInput);

    await expect(memberClient.event.getAll()).resolves.toMatchObject([
      {
        active: true,
        color: "#22c55e",
        icon: "calendar",
        name: "Guild Boss Hunt",
      },
    ]);
  });

  it("prevents verified non-admin members from creating events", async () => {
    const member = await createVerifiedMember({ id: "event-non-admin" });
    const client = createAuthenticatedRouterClient(member);

    await expect(client.event.create(eventInput)).rejects.toBeInstanceOf(
      ORPCError
    );

    await expect(client.event.getAll()).resolves.toEqual([]);
  });
});
