import * as Layer from "effect/Layer";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../protocol/http-api-contract.js";
import { AnnouncementHttpApiHandlers } from "./announcement/http-api-handlers.js";
import { AuctionHttpApiHandlers } from "./auction/http-api-handlers.js";
import { SessionMiddlewareLayer } from "./auth/session-middleware.js";
import { BetHttpApiHandlers } from "./bet/http-api-handlers.js";
import { EventHttpApiHandlers } from "./event/http-api-handlers.js";
import { AppHealthHttpApiHandlers } from "./health/http-api-handlers.js";
import { HeroesHttpApiHandlers } from "./heroes/http-api-handlers.js";
import { RankingHttpApiHandlers } from "./ranking/http-api-handlers.js";
import { SkillsHttpApiHandlers } from "./skills/http-api-handlers.js";
import { SquadBuilderAccountImportHttpApiHandlers } from "./squad-builder/account-import/http-api-handlers.js";
import { SquadBuilderAccountRefetchHttpApiHandlers } from "./squad-builder/account-refetch/http-api-handlers.js";
import { SquadBuilderAccountSharingHttpApiHandlers } from "./squad-builder/account-sharing/http-api-handlers.js";
import { SquadBuilderSquadGroupSharingHttpApiHandlers } from "./squad-builder/squad-group-sharing/http-api-handlers.js";
import { SquadBuilderSquadGroupHttpApiHandlers } from "./squad-builder/squad-groups/http-api-handlers.js";
import { TodoHttpApiHandlers } from "./todo/http-api-handlers.js";
import { UserHttpApiHandlers } from "./user/http-api-handlers.js";
import { VaultHttpApiHandlers } from "./vault/http-api-handlers.js";

/** Application-level Effect HttpApi route layer for all migrated API groups. */
const AppEndpointHandlers = Layer.mergeAll(
  AppHealthHttpApiHandlers,
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
