import { HttpApi } from "effect/unstable/httpapi";

import { AnnouncementHttpApiGroup } from "./announcement/http-api-contract.js";
import { AuctionHttpApiGroup } from "./auction/http-api-contract.js";
import { SessionMiddleware } from "./auth/http-api-middleware.js";
import { BetHttpApiGroup } from "./bet/http-api-contract.js";
import { EventHttpApiGroup } from "./event/http-api-contract.js";
import { HeroesHttpApiGroup } from "./heroes/http-api-contract.js";
import { RankingHttpApiGroup } from "./ranking/http-api-contract.js";
import { SkillsHttpApiGroup } from "./skills/http-api-contract.js";
import { SquadBuilderAccountImportGroup } from "./squad-builder/account-import/http-api-contract.js";
import { SquadBuilderAccountRefetchGroup } from "./squad-builder/account-refetch/http-api-contract.js";
import { SquadBuilderAccountSharingGroup } from "./squad-builder/account-sharing/http-api-contract.js";
import { SquadBuilderSquadGroupSharingGroup } from "./squad-builder/squad-group-sharing/http-api-contract.js";
import { SquadBuilderSquadGroupGroup } from "./squad-builder/squad-groups/http-api-contract.js";
import { TodoHttpApiGroup } from "./todo/http-api-contract.js";
import { UserHttpApiGroup } from "./user/http-api-contract.js";
import { VaultHttpApiGroup } from "./vault/http-api-contract.js";

/** Application-level Effect HttpApi contract for migrated API groups. */
export const AppHttpApi = HttpApi.make("tepirekApi")
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
  .add(SquadBuilderAccountImportGroup.middleware(SessionMiddleware))
  .add(SquadBuilderAccountRefetchGroup.middleware(SessionMiddleware))
  .add(SquadBuilderSquadGroupGroup.middleware(SessionMiddleware))
  .add(SquadBuilderAccountSharingGroup.middleware(SessionMiddleware))
  .add(SquadBuilderSquadGroupSharingGroup.middleware(SessionMiddleware));

export type AppHttpApi = typeof AppHttpApi;
