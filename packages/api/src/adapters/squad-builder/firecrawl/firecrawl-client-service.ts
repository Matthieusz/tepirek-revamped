import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { FirecrawlClientService } from "../../../services/squad-builder/firecrawl-client.ts";
import { FirecrawlConfigService } from "../../../services/squad-builder/firecrawl-config.ts";
import { FirecrawlSdkClient } from "./firecrawl-client.ts";

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
