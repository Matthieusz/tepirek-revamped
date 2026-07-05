/* eslint-disable max-classes-per-file -- Batch preview error schemas are intentionally collocated with the service contract. */
import * as Schema from "effect/Schema";

import { parseAccountDisplayName } from "../account-display-name.js";
import type { AccountDisplayName } from "../account-display-name.js";
import type { AppUserId } from "../app-user-id.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import type { FirecrawlCreditCount } from "../firecrawl-config.js";
import type { MargonemCharacterPreview } from "../margonem-character.js";
import type { ParseMargonemProfileHtmlError } from "../margonem-profile-html-parser.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import { profileIdToNumber } from "../margonem-profile-id.js";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../margonem-profile-url.js";
import type { ParseMargonemProfileUrlError } from "../margonem-profile-url.js";
import { fail, isFailure, isSuccess, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { PendingMargonemAccountImportId } from "../pending-margonem-account-import-id.js";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  PendingMargonemAccountImportStore,
  ProfileAccessState,
  SquadBuilderAccountLookup,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";
import type {
  Clock,
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportInput,
  PreviewMargonemProfileImportOutput,
} from "./preview-margonem-profile-import.js";

const batchImportPolicy = {
  fetchConcurrency: 2,
  maxProfileUrls: 20,
} as const;

const pendingImportPolicy = {
  expiresAfterMinutes: 30,
} as const;

/** Input for the batch owned-account import preview service. */
export interface PreviewOwnedAccountImportsInput {
  readonly actorUserId: AppUserId;
  readonly profileUrls: readonly string[];
}

/** A successful batch preview line item. */
export interface PreviewOwnedAccountImportSuccess {
  readonly _tag: "PreviewSucceeded";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Expected failure for a later duplicate profile id in the same batch. */
export class DuplicateProfileInBatchError extends Schema.TaggedErrorClass<DuplicateProfileInBatchError>()(
  "DuplicateProfileInBatch",
  {
    firstLineNumber: Schema.Number,
  },
  {}
) {}

/** Per-line expected failure for the batch preview. */
export type PreviewOwnedAccountImportLineError =
  | ParseMargonemProfileUrlError
  | DuplicateProfileInBatchError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

/** A failed batch preview line item. */
export interface PreviewOwnedAccountImportFailure {
  readonly _tag: "PreviewFailed";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly error: PreviewOwnedAccountImportLineError;
}

export type PreviewOwnedAccountImportItem =
  | PreviewOwnedAccountImportSuccess
  | PreviewOwnedAccountImportFailure;

export interface PreviewOwnedAccountImportsOutput {
  readonly items: readonly PreviewOwnedAccountImportItem[];
}

/** Expected whole-batch failures. */
export type PreviewOwnedAccountImportsError =
  | TooManyProfileUrlsInBatch
  | EmptyProfileUrlBatch
  | SquadBuilderPersistenceUnavailable;

export class TooManyProfileUrlsInBatch extends Schema.TaggedErrorClass<TooManyProfileUrlsInBatch>()(
  "TooManyProfileUrlsInBatch",
  {
    maxUrls: Schema.Number,
  },
  {}
) {}

export class EmptyProfileUrlBatch extends Schema.TaggedErrorClass<EmptyProfileUrlBatch>()(
  "EmptyProfileUrlBatch",
  {},
  {}
) {}

/** Narrow seam over the single-profile preview service for batch use. */
export interface SingleMargonemProfilePreview {
  readonly preview: (
    input: PreviewMargonemProfileImportInput,
    options?: { readonly signal?: AbortSignal }
  ) => Promise<
    Outcome<
      PreviewMargonemProfileImportOutput,
      PreviewMargonemProfileImportError
    >
  >;
}

interface ParsedLine {
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly profileId: MargonemProfileId;
}

interface LineFailure {
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly error: PreviewOwnedAccountImportLineError;
}

const isEmpty = (value: string): boolean => value.trim().length === 0;

const defaultDisplayNameFor = (
  suggestedAccountName: string,
  profileId: MargonemProfileId
): AccountDisplayName => {
  const parsed = parseAccountDisplayName(suggestedAccountName);

  if (isSuccess(parsed)) {
    return parsed.value;
  }

  const fallback = parseAccountDisplayName(
    `Profil ${profileIdToNumber(profileId)}`
  );

  // SAFETY: the fallback template always produces a valid display name.
  return isSuccess(fallback)
    ? fallback.value
    : (suggestedAccountName as AccountDisplayName);
};

const accessStateToLineError = (
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

/** Service module that previews and persists pending owned-account imports. */
export class PreviewOwnedAccountImports {
  private readonly singlePreview: SingleMargonemProfilePreview;
  private readonly pendingImports: PendingMargonemAccountImportStore;
  private readonly accountLookup: SquadBuilderAccountLookup;
  private readonly clock: Clock;

  constructor(
    singlePreview: SingleMargonemProfilePreview,
    pendingImports: PendingMargonemAccountImportStore,
    accountLookup: SquadBuilderAccountLookup,
    clock: Clock
  ) {
    this.singlePreview = singlePreview;
    this.pendingImports = pendingImports;
    this.accountLookup = accountLookup;
    this.clock = clock;
  }

  /** Preview and persist pending imports for a batch of pasted profile URLs. */
  async preview(
    input: PreviewOwnedAccountImportsInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Promise<
    Outcome<PreviewOwnedAccountImportsOutput, PreviewOwnedAccountImportsError>
  > {
    const nonBlankLines = input.profileUrls
      .map((url, index) => ({ inputUrl: url, lineNumber: index + 1 }))
      .filter((line) => !isEmpty(line.inputUrl));

    if (nonBlankLines.length === 0) {
      return fail(new EmptyProfileUrlBatch());
    }

    if (nonBlankLines.length > batchImportPolicy.maxProfileUrls) {
      return fail(
        new TooManyProfileUrlsInBatch({
          maxUrls: batchImportPolicy.maxProfileUrls,
        })
      );
    }

    const failures: LineFailure[] = [];
    const parsedLines: ParsedLine[] = [];
    const firstLineForProfileId = new Map<number, number>();

    for (const line of nonBlankLines) {
      const parsedProfileId = parseMargonemProfileUrl(line.inputUrl);

      if (isFailure(parsedProfileId)) {
        failures.push({
          error: parsedProfileId.error,
          inputUrl: line.inputUrl,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      const profileIdNumber = profileIdToNumber(parsedProfileId.value);
      const firstLineNumber = firstLineForProfileId.get(profileIdNumber);

      if (firstLineNumber !== undefined) {
        failures.push({
          error: new DuplicateProfileInBatchError({
            firstLineNumber,
          }),
          inputUrl: line.inputUrl,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      firstLineForProfileId.set(profileIdNumber, line.lineNumber);
      parsedLines.push({
        inputUrl: line.inputUrl,
        lineNumber: line.lineNumber,
        profileId: parsedProfileId.value,
      });
    }

    const availableLines: ParsedLine[] = [];

    const accessResults = await Promise.all(
      parsedLines.map((line) =>
        this.accountLookup.findProfileAccessState({
          actorUserId: input.actorUserId,
          profileId: line.profileId,
        })
      )
    );

    for (const [index, accessState] of accessResults.entries()) {
      const line = parsedLines[index];

      if (line === undefined) {
        continue;
      }

      if (isFailure(accessState)) {
        failures.push({
          error: accessState.error,
          inputUrl: line.inputUrl,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      const lineError = accessStateToLineError(accessState.value);

      if (lineError !== undefined) {
        failures.push({
          error: lineError,
          inputUrl: line.inputUrl,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      availableLines.push(line);
    }

    const fetchResults = await this.fetchAvailableLines(
      input.actorUserId,
      availableLines,
      options
    );

    const itemsByLine = new Map<number, PreviewOwnedAccountImportItem>();

    for (const lineFailure of failures) {
      itemsByLine.set(lineFailure.lineNumber, {
        _tag: "PreviewFailed",
        error: lineFailure.error,
        inputUrl: lineFailure.inputUrl,
        lineNumber: lineFailure.lineNumber,
      });
    }

    for (const result of fetchResults) {
      itemsByLine.set(result.lineNumber, result.item);
    }

    const items = nonBlankLines
      .map((line) => itemsByLine.get(line.lineNumber))
      .filter(
        (item): item is PreviewOwnedAccountImportItem => item !== undefined
      );

    return success({ items });
  }

  private async fetchAvailableLines(
    actorUserId: AppUserId,
    availableLines: readonly ParsedLine[],
    options: { readonly signal?: AbortSignal }
  ): Promise<
    readonly {
      readonly lineNumber: number;
      readonly item: PreviewOwnedAccountImportItem;
    }[]
  > {
    const results: {
      lineNumber: number;
      item: PreviewOwnedAccountImportItem;
    }[] = [];

    let budgetExhaustedError:
      | Extract<
          PreviewMargonemProfileImportError,
          { readonly _tag: "FirecrawlMonthlyBudgetExhausted" }
        >
      | undefined;
    let cursor = 0;
    const queue = [...availableLines];

    // Bounded-concurrency fetch pool: awaiting inside the loop is intentional
    // to cap concurrent Firecrawl requests. Parallelizing would violate the
    // fetch-concurrency policy.
    const worker = async () => {
      while (cursor < queue.length) {
        if (budgetExhaustedError !== undefined) {
          return;
        }

        const line = queue[cursor];

        if (line === undefined) {
          return;
        }

        cursor += 1;

        if (budgetExhaustedError !== undefined) {
          return;
        }

        // oxlint-disable-next-line no-await-in-loop
        const preview = await this.singlePreview.preview(
          {
            actorUserId,
            profileUrl: line.inputUrl,
          },
          options.signal === undefined ? {} : { signal: options.signal }
        );

        if (isFailure(preview)) {
          if (preview.error._tag === "FirecrawlMonthlyBudgetExhausted") {
            budgetExhaustedError = preview.error;
          }

          results.push({
            item: {
              _tag: "PreviewFailed",
              error: preview.error,
              inputUrl: line.inputUrl,
              lineNumber: line.lineNumber,
            },
            lineNumber: line.lineNumber,
          });
          continue;
        }

        // oxlint-disable-next-line no-await-in-loop
        const successItem = await this.persistPendingImport(
          actorUserId,
          line,
          preview.value
        );

        results.push({ item: successItem, lineNumber: line.lineNumber });
      }
    };

    const workers = Array.from(
      { length: Math.min(batchImportPolicy.fetchConcurrency, queue.length) },
      () => worker()
    );

    await Promise.all(workers);

    if (budgetExhaustedError !== undefined) {
      for (const line of queue) {
        if (results.some((result) => result.lineNumber === line.lineNumber)) {
          continue;
        }

        results.push({
          item: {
            _tag: "PreviewFailed",
            error: budgetExhaustedError,
            inputUrl: line.inputUrl,
            lineNumber: line.lineNumber,
          },
          lineNumber: line.lineNumber,
        });
      }
    }

    return results;
  }

  private async persistPendingImport(
    actorUserId: AppUserId,
    line: ParsedLine,
    preview: PreviewMargonemProfileImportOutput
  ): Promise<PreviewOwnedAccountImportItem> {
    const now = this.clock.now();
    const expiresAt = new Date(
      now.getTime() + pendingImportPolicy.expiresAfterMinutes * 60_000
    );
    const defaultDisplayName = defaultDisplayNameFor(
      preview.suggestedAccountName,
      preview.profileId
    );

    const created = await this.pendingImports.createPendingImport({
      actorUserId,
      defaultDisplayName,
      expiresAt,
      fetchedAt: preview.lastFetchedAt,
      firecrawlCreditsUsed: preview.firecrawlCreditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(preview.profileId),
      jarunaCharacters: preview.jarunaCharacters,
      profileId: preview.profileId,
      suggestedAccountName: preview.suggestedAccountName,
    });

    if (isFailure(created)) {
      return {
        _tag: "PreviewFailed",
        error: created.error,
        inputUrl: line.inputUrl,
        lineNumber: line.lineNumber,
      };
    }

    return {
      _tag: "PreviewSucceeded",
      defaultDisplayName,
      firecrawlCreditsUsed: preview.firecrawlCreditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(preview.profileId),
      inputUrl: line.inputUrl,
      jarunaCharacters: preview.jarunaCharacters,
      lastFetchedAt: preview.lastFetchedAt,
      lineNumber: line.lineNumber,
      pendingImportId: created.value.id,
      profileId: preview.profileId,
      suggestedAccountName: preview.suggestedAccountName,
    };
  }
}
