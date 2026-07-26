import * as Config from "effect/Config";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { FirecrawlConfigService } from "../../../services/squad-builder/firecrawl-config.ts";
import type { FirecrawlConfig } from "../../../services/squad-builder/firecrawl-config.ts";

const NonEmptyString = Schema.String.check(Schema.isNonEmpty());
const NonEmptyRedactedString = Schema.Redacted(NonEmptyString);

const MonthlyRequestBudget = Schema.Int.check(
  Schema.isBetween({
    maximum: 1000,
    minimum: 1,
  })
);

/** Firecrawl configuration parsed from the active Effect Config provider. */
export const readFirecrawlConfig = Config.all({
  apiKey: Config.schema(NonEmptyRedactedString, "FIRECRAWL_API_KEY"),
  monthlyRequestBudget: Config.schema(
    MonthlyRequestBudget,
    "FIRECRAWL_MONTHLY_REQUEST_BUDGET"
  ).pipe(Config.withDefault(900)),
});

/** Provide an already-parsed Firecrawl configuration. */
export const makeFirecrawlConfigLayer = (config: FirecrawlConfig) =>
  Layer.succeed(FirecrawlConfigService, config);
