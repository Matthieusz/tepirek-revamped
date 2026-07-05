import { Atom, Result } from "@effect-atom/atom-react";
import type {
  RangeSummary,
  SkillSummary,
} from "@tepirek-revamped/api/modules/skills/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type SkillRange = typeof RangeSummary.Type;
type Skill = typeof SkillSummary.Type;

const emptySkillRanges: readonly SkillRange[] = [];
const emptySkills: readonly Skill[] = [];

const getSkillRangeListOrEmpty = (
  result: Result.Result<readonly SkillRange[], unknown>
) => (Result.isSuccess(result) ? result.value : emptySkillRanges);

const getSkillListOrEmpty = (
  result: Result.Result<readonly Skill[], unknown>
) => (Result.isSuccess(result) ? result.value : emptySkills);

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
  skillsByRangeIdAtom(rangeId);

/** Mutation atom for creating a skill profession. */
export const createSkillProfessionAtom = appHttpApiFn(
  (payload: { readonly name: string }, get) =>
    Effect.gen(function* createSkillProfessionEffect() {
      const client = yield* AppHttpApiClient;
      const profession = yield* client.skills.createProfession({ payload });
      get.refresh(skillProfessionsAtom);
      return profession;
    })
);

/** Mutation atom for creating a skill range. */
export const createSkillRangeAtom = appHttpApiFn(
  (
    payload: {
      readonly image: string;
      readonly level: number;
      readonly name: string;
    },
    get
  ) =>
    Effect.gen(function* createSkillRangeEffect() {
      const client = yield* AppHttpApiClient;
      const range = yield* client.skills.createRange({ payload });
      get.refresh(skillRangesAtom);
      return range;
    })
);

/** Mutation atom for creating a skill. */
export const createSkillAtom = appHttpApiFn(
  (
    payload: {
      readonly link: string;
      readonly mastery: boolean;
      readonly name: string;
      readonly professionId: number;
      readonly rangeId: number;
    },
    get
  ) =>
    Effect.gen(function* createSkillEffect() {
      const client = yield* AppHttpApiClient;
      const skill = yield* client.skills.createSkill({ payload });
      get.refresh(skillsByRangeAtom(payload.rangeId));
      return skill;
    })
);

const deleteSkillRangeRequestAtom = appHttpApiFn(
  (payload: { readonly id: number }) =>
    Effect.gen(function* deleteSkillRangeEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.skills.deleteRange({ payload });
    })
);

const deleteSkillRequestAtom = appHttpApiFn(
  (payload: { readonly id: number }) =>
    Effect.gen(function* deleteSkillEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.skills.deleteSkill({ payload });
    })
);

/** Optimistic skill range list atom backed by the Result-returning range resource. */
export const optimisticSkillRangesAtom = Atom.optimistic(
  skillRangesAtom.pipe(Atom.map(getSkillRangeListOrEmpty))
);

/** Optimistic mutation atom for deleting a skill range from the list. */
export const deleteSkillRangeAtom = Atom.optimisticFn(
  optimisticSkillRangesAtom,
  {
    fn: deleteSkillRangeRequestAtom,
    reducer: removeSkillRangeById,
  }
);

/** Optimistic skill list atom backed by a Result-returning range detail resource. */
const optimisticSkillsByRangeIdAtom = Atom.family((rangeId: number) =>
  Atom.optimistic(
    skillsByRangeAtom(rangeId).pipe(Atom.map(getSkillListOrEmpty))
  )
);

export const optimisticSkillsByRangeAtom = (rangeId: number) =>
  optimisticSkillsByRangeIdAtom(rangeId);

/** Optimistic mutation atom for deleting a skill from one range detail list. */
const deleteSkillFromRangeIdAtom = Atom.family((rangeId: number) =>
  Atom.optimisticFn(optimisticSkillsByRangeAtom(rangeId), {
    fn: deleteSkillRequestAtom,
    reducer: removeSkillById,
  })
);

export const deleteSkillFromRangeAtom = (rangeId: number) =>
  deleteSkillFromRangeIdAtom(rangeId);

/** Mutation atom for deleting a skill when the caller does not own a range list. */
export const deleteSkillAtom = deleteSkillRequestAtom;
