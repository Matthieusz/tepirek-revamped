import type {
  RangeSummary,
  SkillSummary,
} from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import { Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type SkillRange = typeof RangeSummary.Type;
type Skill = typeof SkillSummary.Type;

const emptySkills: readonly Skill[] = [];
const disabledSkillsByRangeAtom = Atom.make(AsyncResult.success(emptySkills));

const removeSkillRangeById = (
  ranges: readonly SkillRange[],
  input: { readonly id: number }
) => ranges.filter((range) => range.id !== input.id);

const removeSkillById = (
  skills: readonly Skill[],
  input: { readonly id: number }
) => skills.filter((skill) => skill.id !== input.id);

/** Resource atom for skill ranges. */
export const skillRangesAtom = appHttpApiAtom(
  Effect.gen(function* listSkillRangesEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.skills.listRanges({});
  })
);

/** Resource atom for skill professions. */
export const skillProfessionsAtom = appHttpApiAtom(
  Effect.gen(function* listSkillProfessionsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.skills.listProfessions({});
  })
);

/** Resource atom for one skill range by slug. */
const skillRangeBySlugFamilyAtom = Atom.family((slug: string) =>
  appHttpApiAtom(
    Effect.gen(function* getSkillRangeBySlugEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.skills.getRangeBySlug({ payload: { slug } });
    })
  )
);

export const skillRangeBySlugAtom = (slug: string) =>
  skillRangeBySlugFamilyAtom(slug);

/** Resource atom for skills in one range. */
const skillsByRangeIdAtom = Atom.family((rangeId: number) =>
  appHttpApiAtom(
    Effect.gen(function* listSkillsByRangeEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.skills.listSkillsByRange({ payload: { rangeId } });
    })
  )
);

export const skillsByRangeAtom = (rangeId: number) =>
  rangeId > 0 ? skillsByRangeIdAtom(rangeId) : disabledSkillsByRangeAtom;

/** Mutation atom for creating a skill profession. */
export const createSkillProfessionAtom = appHttpApiFn(
  Effect.fnUntraced(function* createSkillProfessionEffect(
    payload: { readonly name: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const profession = yield* client.skills.createProfession({ payload });
    get.refresh(skillProfessionsAtom);
    return profession;
  })
);

/** Mutation atom for creating a skill range. */
export const createSkillRangeAtom = appHttpApiFn(
  Effect.fnUntraced(function* createSkillRangeEffect(
    payload: {
      readonly image: string;
      readonly level: number;
      readonly name: string;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const range = yield* client.skills.createRange({ payload });
    get.refresh(skillRangesAtom);
    return range;
  })
);

/** Mutation atom for creating a skill. */
export const createSkillAtom = appHttpApiFn(
  Effect.fnUntraced(function* createSkillEffect(
    payload: {
      readonly link: string;
      readonly mastery: boolean;
      readonly name: string;
      readonly professionId: number;
      readonly rangeId: number;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const skill = yield* client.skills.createSkill({ payload });
    get.refresh(skillsByRangeAtom(payload.rangeId));
    return skill;
  })
);

const deleteSkillRangeRequestAtom = appHttpApiFn(
  Effect.fnUntraced(function* deleteSkillRangeEffect(input: {
    readonly id: number;
  }) {
    const client = yield* AppHttpApiClient;
    return yield* client.skills.deleteRange({ payload: input });
  })
);

const deleteSkillRequestAtom = appHttpApiFn(
  Effect.fnUntraced(function* deleteSkillEffect(input: {
    readonly id: number;
  }) {
    const client = yield* AppHttpApiClient;
    return yield* client.skills.deleteSkill({ payload: input });
  })
);

/** Optimistic skill-range resource that preserves loading and failure states. */
export const optimisticSkillRangesAtom = Atom.optimistic(skillRangesAtom);

/** Optimistic mutation atom for deleting a skill range from the list. */
export const deleteSkillRangeAtom = Atom.optimisticFn(
  optimisticSkillRangesAtom,
  {
    fn: deleteSkillRangeRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (ranges) =>
        removeSkillRangeById(ranges, input)
      ),
  }
);

/** Optimistic skill resource that preserves loading and failure states. */
const optimisticSkillsByRangeIdAtom = Atom.family((rangeId: number) =>
  Atom.optimistic(skillsByRangeAtom(rangeId))
);

export const optimisticSkillsByRangeAtom = (rangeId: number) =>
  optimisticSkillsByRangeIdAtom(rangeId);

/** Optimistic mutation atom for deleting a skill from one range detail list. */
const deleteSkillFromRangeIdAtom = Atom.family((rangeId: number) =>
  Atom.optimisticFn(optimisticSkillsByRangeAtom(rangeId), {
    fn: deleteSkillRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (skills) => removeSkillById(skills, input)),
  })
);

export const deleteSkillFromRangeAtom = (rangeId: number) =>
  deleteSkillFromRangeIdAtom(rangeId);
