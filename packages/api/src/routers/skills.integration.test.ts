import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "../effect-app.js";
import { SkillsStore } from "../modules/skills/skills-store.js";
import {
  createProfession,
  createRange,
  createVerifiedMember,
} from "../test/integration/builders.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
const runStoreEffect = <A, E>(effect: Effect.Effect<A, E, SkillsStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl))));
const runStoreExit = <A, E>(effect: Effect.Effect<A, E, SkillsStore>) =>
  Effect.runPromiseExit(
    effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl)))
  );

describe("skills HttpApi store Postgres integration", () => {
  it("creates professions and ranges", async () => {
    await runStoreEffect(
      SkillsStore.use((store) => store.createProfession({ name: "Paladyn" }))
    );
    await runStoreEffect(
      SkillsStore.use((store) =>
        store.createRange({
          image: "https://example.com/range.png",
          level: 100,
          name: "Przedział 100",
        })
      )
    );
    await expect(
      runStoreEffect(SkillsStore.use((store) => store.listProfessions()))
    ).resolves.toMatchObject([{ name: "Paladyn" }]);
    await expect(
      runStoreEffect(SkillsStore.use((store) => store.listRanges()))
    ).resolves.toMatchObject([
      {
        image: "https://example.com/range.png",
        level: 100,
        name: "Przedział 100",
        slug: "przedzial-100",
      },
    ]);
  });

  it("creates skills for a range", async () => {
    const member = await createVerifiedMember({
      id: "skill-author",
      image: "https://example.com/skill-author.png",
      name: "Skill Author",
    });
    const profession = await createProfession({ name: "Tropiciel" });
    const range = await createRange({ name: "Elita 120" });
    await runStoreEffect(
      SkillsStore.use((store) =>
        store.createSkill({
          link: "https://example.com/skill",
          mastery: true,
          name: "Podwójny strzał",
          professionId: profession.id,
          rangeId: range.id,
          userId: member.id,
        })
      )
    );
    await expect(
      runStoreEffect(
        SkillsStore.use((store) =>
          store.listSkillsByRange({ rangeId: range.id })
        )
      )
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

  it("rejects invalid links and duplicate or empty slugs", async () => {
    const member = await createVerifiedMember({
      id: "skill-invalid-link-author",
    });
    const profession = await createProfession({ name: "Łowca" });
    const range = await createRange({ name: "Elita 140" });
    await expect(
      runStoreExit(
        SkillsStore.use((store) =>
          store.createSkill({
            link: "ftp://example.com/skill",
            mastery: false,
            name: "Nieprawidłowy link",
            professionId: profession.id,
            rangeId: range.id,
            userId: member.id,
          })
        )
      )
    ).resolves.toMatchObject({ _tag: "Failure" });
    await expect(
      runStoreExit(
        SkillsStore.use((store) =>
          store.createRange({
            image: "https://example.com/empty.png",
            level: 100,
            name: "++--",
          })
        )
      )
    ).resolves.toMatchObject({ _tag: "Failure" });
    await runStoreEffect(
      SkillsStore.use((store) =>
        store.createRange({
          image: "https://example.com/first.png",
          level: 100,
          name: "Przedział 100",
        })
      )
    );
    await expect(
      runStoreExit(
        SkillsStore.use((store) =>
          store.createRange({
            image: "https://example.com/second.png",
            level: 101,
            name: "Przedzial 100!!!",
          })
        )
      )
    ).resolves.toMatchObject({ _tag: "Failure" });
  });
});
