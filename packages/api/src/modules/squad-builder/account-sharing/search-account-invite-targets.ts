import * as Schema from "effect/Schema";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";

/** Search policy for account invite target queries. */
export const accountInviteTargetSearchPolicy = {
  maxQueryLength: 40,
  maxResults: 10,
  minQueryLength: 2,
} as const;

/** Expected failure when an invite target search query is invalid. */
export class InvalidAccountInviteTargetQuery extends Schema.TaggedErrorClass<InvalidAccountInviteTargetQuery>()(
  "InvalidAccountInviteTargetQuery",
  { message: Schema.String },
  {}
) {}

/** Input for searching account invite targets. */
export interface SearchAccountInviteTargetsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
}
