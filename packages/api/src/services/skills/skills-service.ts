import * as Effect from "effect/Effect";

import { SkillsStore } from "./skills-store.ts";

export const createProfession = Effect.fn("Skills.createProfession")(
  function* createProfession(
    input: Parameters<(typeof SkillsStore.Service)["createProfession"]>[0]
  ) {
    const store = yield* SkillsStore;
    yield* store.createProfession(input);
  }
);

export const createRange = Effect.fn("Skills.createRange")(
  function* createRange(
    input: Parameters<(typeof SkillsStore.Service)["createRange"]>[0]
  ) {
    const store = yield* SkillsStore;
    yield* store.createRange(input);
  }
);

export const createSkill = Effect.fn("Skills.createSkill")(
  function* createSkill(
    input: Parameters<(typeof SkillsStore.Service)["createSkill"]>[0]
  ) {
    const store = yield* SkillsStore;
    yield* store.createSkill(input);
  }
);

export const deleteRange = Effect.fn("Skills.deleteRange")(
  function* deleteRange(
    input: Parameters<(typeof SkillsStore.Service)["deleteRange"]>[0]
  ) {
    const store = yield* SkillsStore;
    yield* store.deleteRange(input);
  }
);

export const deleteSkill = Effect.fn("Skills.deleteSkill")(
  function* deleteSkill(
    input: Parameters<(typeof SkillsStore.Service)["deleteSkill"]>[0]
  ) {
    const store = yield* SkillsStore;
    yield* store.deleteSkill(input);
  }
);

export const listProfessions = Effect.fn("Skills.listProfessions")(
  function* listProfessions() {
    const store = yield* SkillsStore;
    return yield* store.listProfessions();
  }
);

export const listRanges = Effect.fn("Skills.listRanges")(
  function* listRanges() {
    const store = yield* SkillsStore;
    return yield* store.listRanges();
  }
);

export const getRangeBySlug = Effect.fn("Skills.getRangeBySlug")(
  function* getRangeBySlug(
    input: Parameters<(typeof SkillsStore.Service)["getRangeBySlug"]>[0]
  ) {
    const store = yield* SkillsStore;
    return yield* store.getRangeBySlug(input);
  }
);

export const listSkillsByRange = Effect.fn("Skills.listSkillsByRange")(
  function* listSkillsByRange(
    input: Parameters<(typeof SkillsStore.Service)["listSkillsByRange"]>[0]
  ) {
    const store = yield* SkillsStore;
    return yield* store.listSkillsByRange(input);
  }
);
