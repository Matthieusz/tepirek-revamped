import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

import { AnnouncementStoreLayer } from "../../adapters/announcement/announcement-store.ts";
import { AuctionStoreLayer } from "../../adapters/auction/auction-store.ts";
import { EventStoreLayer } from "../../adapters/event/event-store.ts";
import { HeroesStoreLayer } from "../../adapters/heroes/heroes-store.ts";
import { SkillsStoreLayer } from "../../adapters/skills/skills-store.ts";
import { TodoStoreLayer } from "../../adapters/todo/todo-store.ts";
import { DiscordGuildVerifierLiveLayer } from "../../adapters/user/discord-verification-service.ts";
import { UserStoreLayer } from "../../adapters/user/user-store.ts";

/** Guild tools and membership graph; the application supplies its database and Discord configuration. */
export const GuildToolsLiveLayer = Layer.mergeAll(
  AnnouncementStoreLayer,
  TodoStoreLayer,
  HeroesStoreLayer,
  EventStoreLayer,
  SkillsStoreLayer,
  AuctionStoreLayer,
  UserStoreLayer,
  DiscordGuildVerifierLiveLayer.pipe(Layer.provide(FetchHttpClient.layer))
);
