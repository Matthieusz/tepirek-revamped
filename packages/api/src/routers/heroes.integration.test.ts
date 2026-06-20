import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createEvent,
  createVerifiedMember,
} from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

const heroInput = {
  image: "https://example.com/hero.png",
  level: 120,
  name: "Testowy Heros",
} as const;

describe("heroes router Postgres integration", () => {
  it("lets an admin create a hero that verified members can read", async () => {
    const event = await createEvent({ name: "Hero Event" });
    const admin = await createAdmin({ id: "heroes-admin" });
    const member = await createVerifiedMember({ id: "heroes-member" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await adminClient.heroes.create({ ...heroInput, eventId: event.id });

    await expect(memberClient.heroes.getAll()).resolves.toMatchObject([
      {
        eventId: event.id,
        image: heroInput.image,
        level: heroInput.level,
        name: heroInput.name,
      },
    ]);
    await expect(
      memberClient.heroes.getByEventId({ eventId: event.id })
    ).resolves.toMatchObject([
      {
        eventId: event.id,
        name: heroInput.name,
      },
    ]);
  });

  it("prevents verified non-admin members from creating or deleting heroes", async () => {
    const event = await createEvent({ name: "Protected Hero Event" });
    const admin = await createAdmin({ id: "heroes-owner" });
    const member = await createVerifiedMember({ id: "heroes-non-admin" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await expect(
      memberClient.heroes.create({ ...heroInput, eventId: event.id })
    ).rejects.toBeInstanceOf(ORPCError);

    await adminClient.heroes.create({ ...heroInput, eventId: event.id });
    const [createdHero] = await adminClient.heroes.getAll();

    await expect(
      memberClient.heroes.delete({ id: createdHero?.id ?? 0 })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(adminClient.heroes.getAll()).resolves.toHaveLength(1);
  });

  it("lets an admin delete a hero", async () => {
    const event = await createEvent({ name: "Deleted Hero Event" });
    const admin = await createAdmin({ id: "heroes-delete-admin" });
    const client = createAuthenticatedRouterClient(admin);

    await client.heroes.create({ ...heroInput, eventId: event.id });
    const [createdHero] = await client.heroes.getAll();

    await expect(
      client.heroes.delete({ id: createdHero?.id ?? 0 })
    ).resolves.toBeDefined();

    await expect(
      client.heroes.getByEventId({ eventId: event.id })
    ).resolves.toEqual([]);
  });
});
