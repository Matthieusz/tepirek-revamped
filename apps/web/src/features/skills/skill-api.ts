import type {
  CreateProfessionPayload,
  CreateRangePayload,
  CreateSkillPayload,
  ProfessionSummary,
  RangeSummary,
  SkillSummary,
} from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import { Effect } from "effect";

import { asProfessionId, asSkillId, asSkillRangeId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** A skill range returned by the API. */
export type SkillRange = RangeSummary;

/** A profession returned by the API. */
export type SkillProfession = ProfessionSummary;

/** A skill returned by the API. */
export type Skill = SkillSummary;

/** Lists all skill ranges. */
export const listSkillRanges = Effect.fn("Web.Skill.listRanges")(
  function* listSkillRangesEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.listRanges({});
  }
);

/** Lists all skill professions. */
export const listSkillProfessions = Effect.fn("Web.Skill.listProfessions")(
  function* listSkillProfessionsEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.listProfessions({});
  }
);

/** Looks up a skill range by its URL slug. */
export const getSkillRangeBySlug = Effect.fn("Web.Skill.getRangeBySlug")(
  function* getSkillRangeBySlugEffect(slug: string) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.getRangeBySlug({ payload: { slug } });
  }
);

/** Lists skills belonging to one range after decoding its browser ID. */
export const listSkillsByRange = Effect.fn("Web.Skill.listByRange")(
  function* listSkillsByRangeEffect(rangeId: number) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.listSkillsByRange({
      payload: { rangeId: yield* asSkillRangeId(rangeId) },
    });
  }
);

/** Creates a skill profession. */
export const createSkillProfession = Effect.fn("Web.Skill.createProfession")(
  function* createSkillProfessionEffect(payload: CreateProfessionPayload) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.createProfession({ payload });
  }
);

/** Creates a skill range. */
export const createSkillRange = Effect.fn("Web.Skill.createRange")(
  function* createSkillRangeEffect(payload: CreateRangePayload) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.createRange({ payload });
  }
);

/** Browser input for creating a skill before its IDs are branded. */
export interface CreateSkillInput extends Omit<
  CreateSkillPayload,
  "professionId" | "rangeId"
> {
  readonly professionId: number;
  readonly rangeId: number;
}

/** Creates a skill after decoding its browser-provided IDs. */
export const createSkill = Effect.fn("Web.Skill.create")(
  function* createSkillEffect(payload: CreateSkillInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.createSkill({
      payload: {
        ...payload,
        professionId: yield* asProfessionId(payload.professionId),
        rangeId: yield* asSkillRangeId(payload.rangeId),
      },
    });
  }
);

/** Deletes a skill range after decoding its browser-provided ID. */
export const deleteSkillRange = Effect.fn("Web.Skill.deleteRange")(
  function* deleteSkillRangeEffect(id: number) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.deleteRange({
      payload: { id: yield* asSkillRangeId(id) },
    });
  }
);

/** Deletes a skill after decoding its browser-provided ID. */
export const deleteSkill = Effect.fn("Web.Skill.delete")(
  function* deleteSkillEffect(id: number) {
    const client = yield* AppHttpApiClient;

    return yield* client.skills.deleteSkill({
      payload: { id: yield* asSkillId(id) },
    });
  }
);

/** Promise runner type used by skill query and mutation adapters. */
export type SkillApiRunner = typeof runAppHttpApi;
