import { HttpApi } from "effect/unstable/httpapi";

import { AnnouncementHttpApiGroup } from "./modules/announcement/http-api-contract.js";
import { AuctionHttpApiGroup } from "./modules/auction/http-api-contract.js";
import { EventHttpApiGroup } from "./modules/event/http-api-contract.js";
import { HealthHttpApiGroup } from "./modules/health/http-api-contract.js";
import { HeroesHttpApiGroup } from "./modules/heroes/http-api-contract.js";
import { SkillsHttpApiGroup } from "./modules/skills/http-api-contract.js";
import {
  SquadBuilderAccountImportGroup,
  SquadBuilderAccountRefetchGroup,
  SquadBuilderAccountSharingGroup,
  SquadBuilderSquadGroupSharingGroup,
} from "./modules/squad-builder/http-api-contract.js";
import { TodoHttpApiGroup } from "./modules/todo/http-api-contract.js";

/** Application-level Effect HttpApi contract for migrated API groups. */
export const AppHttpApi = HttpApi.make("tepirekApi")
  .add(HealthHttpApiGroup)
  .add(AnnouncementHttpApiGroup)
  .add(TodoHttpApiGroup)
  .add(HeroesHttpApiGroup)
  .add(EventHttpApiGroup)
  .add(SkillsHttpApiGroup)
  .add(AuctionHttpApiGroup)
  .add(SquadBuilderAccountImportGroup)
  .add(SquadBuilderAccountRefetchGroup)
  .add(SquadBuilderAccountSharingGroup)
  .add(SquadBuilderSquadGroupSharingGroup);

export type AppHttpApi = typeof AppHttpApi;
