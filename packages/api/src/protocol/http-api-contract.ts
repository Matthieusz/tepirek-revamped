import { HttpApi } from "effect/unstable/httpapi";

import { AnnouncementHttpApiGroup } from "./announcement/http-api-contract.ts";
import { AuctionHttpApiGroup } from "./auction/http-api-contract.ts";
import { SessionMiddleware } from "./auth/http-api-middleware.ts";
import { BetHttpApiGroup } from "./bet/http-api-contract.ts";
import { EventHttpApiGroup } from "./event/http-api-contract.ts";
import { HeroesHttpApiGroup } from "./heroes/http-api-contract.ts";
import { RankingHttpApiGroup } from "./ranking/http-api-contract.ts";
import { SkillsHttpApiGroup } from "./skills/http-api-contract.ts";
import { SquadBuilderAccountImportGroup } from "./squad-builder/account-import/http-api-contract.ts";
import { SquadBuilderAccountRefetchGroup } from "./squad-builder/account-refetch/http-api-contract.ts";
import { SquadBuilderAccountSharingGroup } from "./squad-builder/account-sharing/http-api-contract.ts";
import { SquadBuilderSquadGroupSharingGroup } from "./squad-builder/squad-group-sharing/http-api-contract.ts";
import { SquadBuilderSquadGroupGroup } from "./squad-builder/squad-groups/http-api-contract.ts";
import { TodoHttpApiGroup } from "./todo/http-api-contract.ts";
import { UserHttpApiGroup } from "./user/http-api-contract.ts";
import { VaultHttpApiGroup } from "./vault/http-api-contract.ts";

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
