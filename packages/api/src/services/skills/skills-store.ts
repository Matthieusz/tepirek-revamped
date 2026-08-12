import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type {
  ProfessionId,
  SkillId,
  SkillRangeId,
} from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationInvalidInput,
} from "../application-errors.ts";

export interface CreateProfessionInput {
  readonly name: string;
}
export interface CreateRangeInput {
  readonly image: string;
  readonly level: number;
  readonly name: string;
}
export interface CreateSkillInput {
  readonly link: string;
  readonly mastery: boolean;
  readonly name: string;
  readonly professionId: ProfessionId;
  readonly rangeId: SkillRangeId;
  readonly userId: AppUserId;
}
export interface DeleteRangeInput {
  readonly id: SkillRangeId;
}
export interface DeleteSkillInput {
  readonly id: SkillId;
}
export interface GetRangeBySlugInput {
  readonly slug: string;
}
export interface GetSkillsByRangeInput {
  readonly rangeId: SkillRangeId;
}
export interface ProfessionSummary {
  readonly id: ProfessionId;
  readonly name: string;
}
export interface RangeSummary {
  readonly id: SkillRangeId;
  readonly image: string | null;
  readonly level: number;
  readonly name: string;
  readonly slug: string;
}
export interface SkillSummary {
  readonly addedBy: string | null;
  readonly addedByImage: string | null;
  readonly id: SkillId;
  readonly link: string;
  readonly mastery: boolean;
  readonly name: string;
  readonly professionId: ProfessionId;
  readonly professionName: string;
}

type DependencyFailure = ApplicationDependencyUnavailable;

/** Persistence port for skill use cases. */
export class SkillsStore extends Context.Service<
  SkillsStore,
  {
    readonly createProfession: (
      input: CreateProfessionInput
    ) => Effect.Effect<void, DependencyFailure>;
    readonly createRange: (
      input: CreateRangeInput
    ) => Effect.Effect<
      void,
      ApplicationInvalidInput | ApplicationConflict | DependencyFailure
    >;
    readonly createSkill: (
      input: CreateSkillInput
    ) => Effect.Effect<void, ApplicationInvalidInput | DependencyFailure>;
    readonly deleteRange: (
      input: DeleteRangeInput
    ) => Effect.Effect<void, DependencyFailure>;
    readonly deleteSkill: (
      input: DeleteSkillInput
    ) => Effect.Effect<void, DependencyFailure>;
    readonly listProfessions: () => Effect.Effect<
      readonly ProfessionSummary[],
      DependencyFailure
    >;
    readonly listRanges: () => Effect.Effect<
      readonly RangeSummary[],
      DependencyFailure
    >;
    readonly getRangeBySlug: (
      input: GetRangeBySlugInput
    ) => Effect.Effect<RangeSummary | null, DependencyFailure>;
    readonly listSkillsByRange: (
      input: GetSkillsByRangeInput
    ) => Effect.Effect<readonly SkillSummary[], DependencyFailure>;
  }
>()("@tepirek-revamped/api/SkillsStore") {}
