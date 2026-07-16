import * as Layer from "effect/Layer";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../protocol/http-api-contract.ts";
import { AnnouncementHttpApiHandlers } from "./announcement/http-api-handlers.ts";
import { AuctionHttpApiHandlers } from "./auction/http-api-handlers.ts";
import { SessionMiddlewareLayer } from "./auth/session-middleware.ts";
import { BetHttpApiHandlers } from "./bet/http-api-handlers.ts";
import { EventHttpApiHandlers } from "./event/http-api-handlers.ts";
import { HeroesHttpApiHandlers } from "./heroes/http-api-handlers.ts";
import { RankingHttpApiHandlers } from "./ranking/http-api-handlers.ts";
import { SkillsHttpApiHandlers } from "./skills/http-api-handlers.ts";
import { SquadBuilderAccountImportHttpApiHandlers } from "./squad-builder/account-import/http-api-handlers.ts";
import { SquadBuilderAccountRefetchHttpApiHandlers } from "./squad-builder/account-refetch/http-api-handlers.ts";
import { SquadBuilderAccountSharingHttpApiHandlers } from "./squad-builder/account-sharing/http-api-handlers.ts";
import { SquadBuilderSquadGroupSharingHttpApiHandlers } from "./squad-builder/squad-group-sharing/http-api-handlers.ts";
import { SquadBuilderSquadGroupHttpApiHandlers } from "./squad-builder/squad-groups/http-api-handlers.ts";
import { TodoHttpApiHandlers } from "./todo/http-api-handlers.ts";
import { UserHttpApiHandlers } from "./user/http-api-handlers.ts";
import { VaultHttpApiHandlers } from "./vault/http-api-handlers.ts";

/** Application-level Effect HttpApi route layer for all migrated API groups. */
const AppEndpointHandlers = Layer.mergeAll(
  AnnouncementHttpApiHandlers,
  TodoHttpApiHandlers,
  HeroesHttpApiHandlers,
  EventHttpApiHandlers,
  SkillsHttpApiHandlers,
  AuctionHttpApiHandlers,
  BetHttpApiHandlers,
  RankingHttpApiHandlers,
  UserHttpApiHandlers,
  VaultHttpApiHandlers,
  SquadBuilderSquadGroupSharingHttpApiHandlers,
  SquadBuilderAccountSharingHttpApiHandlers,
  SquadBuilderSquadGroupHttpApiHandlers,
  SquadBuilderAccountImportHttpApiHandlers,
  SquadBuilderAccountRefetchHttpApiHandlers
);

export const AppHttpApiHandlers = AppEndpointHandlers.pipe(
  Layer.provideMerge(SessionMiddlewareLayer)
);

export const AppHttpApiLayer = HttpApiBuilder.layer(AppHttpApi).pipe(
  Layer.provide(AppHttpApiHandlers)
);
