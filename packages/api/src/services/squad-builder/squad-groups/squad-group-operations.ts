import type {
  DeleteSquadGroupStoreInput,
  GetSquadGroupDetailInput,
  ListMySquadGroupsInput,
} from "./squad-group-store.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** List squad groups owned by the actor. */
export const listMine = (input: ListMySquadGroupsInput) =>
  SquadGroupStoreService.use((store) => store.listMySquadGroups(input));

/** Load a squad group visible to the actor. */
export const getMine = (input: GetSquadGroupDetailInput) =>
  SquadGroupStoreService.use((store) => store.getSquadGroupDetail(input));

/** Permanently delete a squad group owned by the actor. */
export const deleteSquadGroup = (input: DeleteSquadGroupStoreInput) =>
  SquadGroupStoreService.use((store) => store.deleteSquadGroup(input));
