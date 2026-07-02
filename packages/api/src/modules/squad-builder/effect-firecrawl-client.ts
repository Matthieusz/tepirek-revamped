import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import type { FirecrawlClient } from "./firecrawl-client.js";
import { FirecrawlSdkClient } from "./firecrawl-client.js";
import { EffectFirecrawlConfig } from "./firecrawl-config.js";

/** Effect service tag for the Firecrawl profile-scraping capability. */
export class EffectFirecrawlClient extends Context.Service<
  EffectFirecrawlClient,
  FirecrawlClient
>()("@tepirek-revamped/api/squad-builder/EffectFirecrawlClient") {}

/** SDK-backed live Firecrawl client layer. */
export const EffectFirecrawlClientLiveLayer: Layer.Layer<
  EffectFirecrawlClient,
  never,
  EffectFirecrawlConfig
> = Layer.effect(
  EffectFirecrawlClient,
  EffectFirecrawlConfig.useSync((config) =>
    EffectFirecrawlClient.of(new FirecrawlSdkClient(config.apiKey))
  )
);
