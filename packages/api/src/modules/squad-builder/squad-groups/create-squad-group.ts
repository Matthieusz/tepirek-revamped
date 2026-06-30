import type { AppUserId } from "../app-user-id";
import { err, isError } from "../result";
import type { Result } from "../result";
import { parseSquadGroupName } from "../squad-name";
import type { InvalidSquadGroupName } from "../squad-name";
import type {
  CreateSquadGroupStoreInput,
  SquadBuilderPersistenceUnavailable,
  SquadGroupStore,
  SquadGroupSummary,
} from "./squad-group-store";

/** Input for creating an empty squad group. */
export interface CreateSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly name: string;
}

/** Expected failures returned by squad group creation. */
export type CreateSquadGroupError =
  | InvalidSquadGroupName
  | SquadBuilderPersistenceUnavailable;

/** Service module for creating personal squad groups. */
export class CreateSquadGroup {
  private readonly store: Pick<SquadGroupStore, "createSquadGroup">;

  constructor(store: Pick<SquadGroupStore, "createSquadGroup">) {
    this.store = store;
  }

  /** Create an empty private squad group owned by the actor. */
  create(
    input: CreateSquadGroupInput
  ): Promise<Result<SquadGroupSummary, CreateSquadGroupError>> {
    const name = parseSquadGroupName(input.name);

    if (isError(name)) {
      return Promise.resolve(err(name.error));
    }

    const storeInput: CreateSquadGroupStoreInput = {
      actorUserId: input.actorUserId,
      name: name.value,
    };

    return this.store.createSquadGroup(storeInput);
  }
}
