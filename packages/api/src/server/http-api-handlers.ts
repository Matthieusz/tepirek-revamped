import * as Layer from "effect/Layer";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AuctionHttpApiHandlers } from "../modules/auction/http-api-handlers.js";
import { BetHttpApiHandlers } from "../modules/bet/http-api-handlers.js";
import { HeroesHttpApiHandlers } from "../modules/heroes/http-api-handlers.js";
import { RankingHttpApiHandlers } from "../modules/ranking/http-api-handlers.js";
import { SkillsHttpApiHandlers } from "../modules/skills/http-api-handlers.js";
import { SquadBuilderHttpApiHandlers } from "../modules/squad-builder/http-api-handlers.js";
import { UserHttpApiHandlers } from "../modules/user/http-api-handlers.js";
import { VaultHttpApiHandlers } from "../modules/vault/http-api-handlers.js";
import { AppHttpApi } from "../protocol/http-api-contract.js";
import { AnnouncementHttpApiHandlers } from "./announcement/http-api-handlers.js";
import { EventHttpApiHandlers } from "./event/http-api-handlers.js";
import { AppHealthHttpApiHandlers } from "./health/http-api-handlers.js";
import { TodoHttpApiHandlers } from "./todo/http-api-handlers.js";

/** Application-level Effect HttpApi route layer for all migrated API groups. */
export const AppHttpApiHandlers = Layer.mergeAll(
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
  SquadBuilderHttpApiHandlers
);

export const AppHttpApiLayer = HttpApiBuilder.layer(AppHttpApi).pipe(
  Layer.provide(AppHttpApiHandlers)
);
