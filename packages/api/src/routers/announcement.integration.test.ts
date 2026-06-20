import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createVerifiedMember,
} from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

const announcementInput = {
  description: "Zbiórka pod aukcje zaczyna się o 20:00",
  title: "Ważna informacja gildyjna",
} as const;

describe("announcement router Postgres integration", () => {
  it("lets an admin create an announcement that verified members can read", async () => {
    const admin = await createAdmin({
      id: "announcement-admin",
      image: "https://example.com/admin.png",
      name: "Announcement Admin",
    });
    const member = await createVerifiedMember({ id: "announcement-member" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await adminClient.announcement.create(announcementInput);

    await expect(memberClient.announcement.getAll()).resolves.toMatchObject([
      {
        description: announcementInput.description,
        title: announcementInput.title,
        user: {
          id: admin.id,
          image: "https://example.com/admin.png",
          name: "Announcement Admin",
        },
      },
    ]);
  });

  it("prevents verified non-admin members from creating or deleting announcements", async () => {
    const admin = await createAdmin({ id: "announcement-owner" });
    const member = await createVerifiedMember({ id: "announcement-non-admin" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await expect(
      memberClient.announcement.create(announcementInput)
    ).rejects.toBeInstanceOf(ORPCError);

    await adminClient.announcement.create(announcementInput);
    const [createdAnnouncement] = await adminClient.announcement.getAll();

    await expect(
      memberClient.announcement.delete({ id: createdAnnouncement?.id ?? 0 })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(adminClient.announcement.getAll()).resolves.toHaveLength(1);
  });

  it("lets an admin delete an announcement", async () => {
    const admin = await createAdmin({ id: "announcement-delete-admin" });
    const client = createAuthenticatedRouterClient(admin);

    await client.announcement.create(announcementInput);
    const [createdAnnouncement] = await client.announcement.getAll();

    await expect(
      client.announcement.delete({ id: createdAnnouncement?.id ?? 0 })
    ).resolves.toBeDefined();

    await expect(client.announcement.getAll()).resolves.toEqual([]);
  });
});
