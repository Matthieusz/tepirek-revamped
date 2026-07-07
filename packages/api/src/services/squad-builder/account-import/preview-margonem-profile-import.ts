import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.js";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.js";
import type { FirecrawlScrapeError } from "../../../modules/squad-builder/firecrawl-client.js";
import type { FirecrawlCreditCount } from "../../../modules/squad-builder/firecrawl-config.js";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  ProfileAccessState,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";

export type { DuplicateMargonemAccountError };

/** Clock dependency for deterministic time and Firecrawl budget months. */
export interface Clock {
  readonly now: () => Date;
}

/** Input for previewing a Margonem profile import. */
export interface PreviewMargonemProfileImportInput {
  readonly actorUserId: AppUserId;
  readonly profileUrl: string;
}

/** Output returned to the router/UI before import confirmation. */
export interface PreviewMargonemProfileImportOutput {
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Expected failures returned by the profile import preview service. */
export type PreviewMargonemProfileImportError =
  | ParseMargonemProfileUrlError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

export const profileAccessStateToDuplicateError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined => {
  switch (state._tag) {
    case "Available": {
      return undefined;
    }
    case "OwnedByActor": {
      return { _tag: "MargonemAccountAlreadyOwnedByActor" };
    }
    case "OwnedByAnotherUser": {
      return { _tag: "MargonemAccountOwnedByAnotherUser" };
    }
    case "SharedWithActor": {
      return { _tag: "MargonemAccountAlreadySharedWithActor" };
    }
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

/** System clock implementation for production composition. */
export const systemClock: Clock = {
  now: () => new Date(),
};
