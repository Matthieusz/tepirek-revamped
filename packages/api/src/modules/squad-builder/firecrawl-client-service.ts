import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import type { FirecrawlClient } from "./firecrawl-client.js";
import { FirecrawlSdkClient } from "./firecrawl-client.js";
import { FirecrawlConfigService } from "./firecrawl-config.js";

/** Service tag for the Firecrawl profile-scraping capability. */
export class FirecrawlClientService extends Context.Service<
  FirecrawlClientService,
  FirecrawlClient
>()("@tepirek-revamped/api/squad-builder/FirecrawlClientService") {}

/** SDK-backed live Firecrawl client layer. */
export const FirecrawlClientServiceLiveLayer: Layer.Layer<
  FirecrawlClientService,
  never,
  FirecrawlConfigService
> = Layer.effect(
  FirecrawlClientService,
  FirecrawlConfigService.useSync((config) =>
    FirecrawlClientService.of(
      new FirecrawlSdkClient(Redacted.value(config.apiKey))
    )
  )
);
