import * as Layer from "effect/Layer";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "./http-api-contract.js";
import { AnnouncementHttpApiHandlers } from "./modules/announcement/http-api-handlers.js";
import { AuctionHttpApiHandlers } from "./modules/auction/http-api-handlers.js";
import { EventHttpApiHandlers } from "./modules/event/http-api-handlers.js";
import { AppHealthHttpApiHandlers } from "./modules/health/http-api-handlers.js";
import { HeroesHttpApiHandlers } from "./modules/heroes/http-api-handlers.js";
import { SkillsHttpApiHandlers } from "./modules/skills/http-api-handlers.js";
import { SquadBuilderHttpApiHandlers } from "./modules/squad-builder/http-api-handlers.js";
import { TodoHttpApiHandlers } from "./modules/todo/http-api-handlers.js";

/** Application-level Effect HttpApi route layer for all migrated API groups. */
export const AppHttpApiHandlers = Layer.mergeAll(
  AppHealthHttpApiHandlers,
  AnnouncementHttpApiHandlers,
  TodoHttpApiHandlers,
  HeroesHttpApiHandlers,
  EventHttpApiHandlers,
  SkillsHttpApiHandlers,
  AuctionHttpApiHandlers,
  SquadBuilderHttpApiHandlers
);

export const AppHttpApiLayer = HttpApiBuilder.layer(AppHttpApi).pipe(
  Layer.provide(AppHttpApiHandlers)
);
