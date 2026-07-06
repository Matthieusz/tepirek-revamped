import { HttpApi } from "effect/unstable/httpapi";

import { BetHttpApiGroup } from "../modules/bet/http-api-contract.js";
import {
  SquadBuilderAccountImportGroup,
  SquadBuilderAccountRefetchGroup,
  SquadBuilderSquadGroupGroup,
  SquadBuilderAccountSharingGroup,
  SquadBuilderSquadGroupSharingGroup,
} from "../modules/squad-builder/http-api-contract.js";
import { AnnouncementHttpApiGroup } from "./announcement/http-api-contract.js";
import { AuctionHttpApiGroup } from "./auction/http-api-contract.js";
import { EventHttpApiGroup } from "./event/http-api-contract.js";
import { HealthHttpApiGroup } from "./health/http-api-contract.js";
import { HeroesHttpApiGroup } from "./heroes/http-api-contract.js";
import { RankingHttpApiGroup } from "./ranking/http-api-contract.js";
import { SkillsHttpApiGroup } from "./skills/http-api-contract.js";
import { TodoHttpApiGroup } from "./todo/http-api-contract.js";
import { UserHttpApiGroup } from "./user/http-api-contract.js";
import { VaultHttpApiGroup } from "./vault/http-api-contract.js";

/** Application-level Effect HttpApi contract for migrated API groups. */
export const AppHttpApi = HttpApi.make("tepirekApi")
  .add(HealthHttpApiGroup)
  .add(AnnouncementHttpApiGroup)
  .add(TodoHttpApiGroup)
  .add(HeroesHttpApiGroup)
  .add(EventHttpApiGroup)
  .add(SkillsHttpApiGroup)
  .add(AuctionHttpApiGroup)
  .add(BetHttpApiGroup)
  .add(RankingHttpApiGroup)
  .add(UserHttpApiGroup)
  .add(VaultHttpApiGroup)
  .add(SquadBuilderAccountImportGroup)
  .add(SquadBuilderAccountRefetchGroup)
  .add(SquadBuilderSquadGroupGroup)
  .add(SquadBuilderAccountSharingGroup)
  .add(SquadBuilderSquadGroupSharingGroup);

export type AppHttpApi = typeof AppHttpApi;
