import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createProfession,
  createRange,
  createVerifiedMember,
} from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

describe("skills router Postgres integration", () => {
  it("lets admins create professions and ranges that verified members can list", async () => {
    const admin = await createAdmin({ id: "skills-admin" });
    const member = await createVerifiedMember({ id: "skills-member" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await adminClient.skills.createProfession({ name: "Paladyn" });
    await adminClient.skills.createRange({
      image: "https://example.com/range.png",
      level: 100,
      name: "Przedział 100",
    });

    await expect(
      memberClient.skills.getAllProfessions()
    ).resolves.toMatchObject([{ name: "Paladyn" }]);
    await expect(memberClient.skills.getAllRanges()).resolves.toMatchObject([
      {
        image: "https://example.com/range.png",
        level: 100,
        name: "Przedział 100",
        slug: "przedzial-100",
      },
    ]);
  });

  it("lets a verified member create a skill for a range", async () => {
    const member = await createVerifiedMember({
      id: "skill-author",
      image: "https://example.com/skill-author.png",
      name: "Skill Author",
    });
    const profession = await createProfession({ name: "Tropiciel" });
    const range = await createRange({ name: "Elita 120" });
    const client = createAuthenticatedRouterClient(member);

    await client.skills.createSkill({
      link: "https://example.com/skill",
      mastery: true,
      name: "Podwójny strzał",
      professionId: profession.id,
      rangeId: range.id,
    });

    await expect(
      client.skills.getSkillsByRange({ rangeId: range.id })
    ).resolves.toMatchObject([
      {
        addedBy: "Skill Author",
        addedByImage: "https://example.com/skill-author.png",
        link: "https://example.com/skill",
        mastery: true,
        name: "Podwójny strzał",
        professionId: profession.id,
        professionName: "Tropiciel",
      },
    ]);
  });

  it("rejects non-http skill links and does not persist them", async () => {
    const member = await createVerifiedMember({
      id: "skill-invalid-link-author",
    });
    const profession = await createProfession({ name: "Łowca" });
    const range = await createRange({ name: "Elita 140" });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.skills.createSkill({
        link: "ftp://example.com/skill",
        mastery: false,
        name: "Nieprawidłowy link",
        professionId: profession.id,
        rangeId: range.id,
      })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(
      client.skills.getSkillsByRange({ rangeId: range.id })
    ).resolves.toEqual([]);
  });

  it("finds ranges by persisted slug and returns null for a missing slug", async () => {
    const member = await createVerifiedMember({ id: "slug-member" });
    await createRange({ name: "Elita Łódowa" });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.skills.getRangeBySlug({ slug: "elita-lodowa" })
    ).resolves.toMatchObject({ name: "Elita Łódowa", slug: "elita-lodowa" });
    await expect(
      client.skills.getRangeBySlug({ slug: "brak-przedzialu" })
    ).resolves.toBeNull();
  });

  it("stores Polish range slugs created through the API", async () => {
    const admin = await createAdmin({ id: "range-slug-admin" });
    const member = await createVerifiedMember({ id: "range-slug-member" });
    const adminClient = createAuthenticatedRouterClient(admin);
    const memberClient = createAuthenticatedRouterClient(member);

    await adminClient.skills.createRange({
      image: "https://example.com/lowca.png",
      level: 300,
      name: "Łowca 300+",
    });

    await expect(memberClient.skills.getAllRanges()).resolves.toEqual([
      expect.objectContaining({ name: "Łowca 300+", slug: "lowca-300" }),
    ]);
    await expect(
      memberClient.skills.getRangeBySlug({ slug: "lowca-300" })
    ).resolves.toMatchObject({ name: "Łowca 300+" });
  });

  it("rejects duplicate normalized range slugs", async () => {
    const admin = await createAdmin({ id: "range-conflict-admin" });
    const client = createAuthenticatedRouterClient(admin);

    await client.skills.createRange({
      image: "https://example.com/first.png",
      level: 100,
      name: "Przedział 100",
    });

    await expect(
      client.skills.createRange({
        image: "https://example.com/second.png",
        level: 101,
        name: "Przedzial 100!!!",
      })
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("rejects range names without usable slug characters", async () => {
    const admin = await createAdmin({ id: "range-empty-slug-admin" });
    const client = createAuthenticatedRouterClient(admin);

    await expect(
      client.skills.createRange({
        image: "https://example.com/empty.png",
        level: 100,
        name: "++--",
      })
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("prevents verified non-admin members from deleting ranges or skills", async () => {
    const member = await createVerifiedMember({ id: "skills-non-admin" });
    const profession = await createProfession({ name: "Mag" });
    const range = await createRange({ name: "Zakres Chroniony" });
    const client = createAuthenticatedRouterClient(member);

    await client.skills.createSkill({
      link: "https://example.com/protected-skill",
      mastery: false,
      name: "Chroniona umiejętność",
      professionId: profession.id,
      rangeId: range.id,
    });
    const [createdSkill] = await client.skills.getSkillsByRange({
      rangeId: range.id,
    });

    await expect(
      client.skills.deleteRange({ id: range.id })
    ).rejects.toBeInstanceOf(ORPCError);
    await expect(
      client.skills.deleteSkill({ id: createdSkill?.id ?? 0 })
    ).rejects.toBeInstanceOf(ORPCError);

    await expect(client.skills.getAllRanges()).resolves.toHaveLength(1);
    await expect(
      client.skills.getSkillsByRange({ rangeId: range.id })
    ).resolves.toHaveLength(1);
  });
});
