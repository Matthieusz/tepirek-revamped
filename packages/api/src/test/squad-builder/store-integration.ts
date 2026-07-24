import * as Effect from "effect/Effect";

import { parseAppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../domain/squad-builder/margonem-profile-id.ts";
import { makeApiSquadBuilderLayer } from "../../server/effect-app.ts";
import { parseFirecrawlCreditCount } from "../../services/squad-builder/firecrawl-config.ts";
import { defaultTestDatabaseUrl } from "../integration/database.ts";

/** Live squad-builder layer backed by the integration test database. */
export const squadBuilderIntegrationTestLayer = makeApiSquadBuilderLayer(
  defaultTestDatabaseUrl
);

/** Parse a fixture user identifier through the production domain parser. */
export const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

/** Parse a fixture account identifier through the production domain parser. */
export const parseTestAccountId = (value: number) =>
  Effect.runSync(parseMargonemAccountId(value));

/** Parse a fixture profile identifier through the production domain parser. */
export const parseTestProfileId = (value: number) =>
  Effect.runSync(parseMargonemProfileId(value));

/** Parse fixture Firecrawl credit usage through the production service parser. */
export const parseTestCredits = (value: number) =>
  Effect.runSync(parseFirecrawlCreditCount(value));
