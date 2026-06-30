import { describe, expect, it } from "vitest";

import { parseAppUserId } from "../app-user-id";
import type { AppUserId } from "../app-user-id";
import { parseMargonemProfileId } from "../margonem-profile-id";
import type { MargonemProfileId } from "../margonem-profile-id";
import { parsePendingMargonemAccountImportId } from "../pending-margonem-account-import-id";
import type { PendingMargonemAccountImportId } from "../pending-margonem-account-import-id";
import { err, isError, isOk, ok } from "../result";
import type { Result } from "../result";
import type {
  DuplicateMargonemAccountError,
  OwnedMargonemAccountSummary,
  OwnedMargonemAccountWriter,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportStore,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store";
import { ConfirmOwnedAccountImport } from "./confirm-owned-account-import";
import type { Clock } from "./preview-margonem-profile-import";

const parseTestUserId = (): AppUserId => {
  const userId = parseAppUserId("confirm-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestPendingId = (): PendingMargonemAccountImportId => {
  const id = parsePendingMargonemAccountImportId(42);

  if (!isOk(id)) {
    throw new Error("Expected pending id to be valid");
  }

  return id.value;
};

const parseTestProfileId = (): MargonemProfileId => {
  const id = parseMargonemProfileId(7_298_897);

  if (!isOk(id)) {
    throw new Error("Expected profile id to be valid");
  }

  return id.value;
};

const fixedClock: Clock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

const pendingForConfirmation =
  (): PendingMargonemAccountImportForConfirmation => ({
    actorUserId: parseTestUserId(),
    fetchedAt: new Date("2026-06-29T11:30:00.000Z"),
    id: parseTestPendingId(),
    jarunaCharacters: [
      {
        avatarUrl: null,
        characterId: 1_296_625 as never,
        level: 315 as never,
        name: "informati",
        profession: "tracker",
        world: "jaruna",
      },
    ],
    profileId: parseTestProfileId(),
  });

const createRecordingPendingStore = (
  found: Result<
    PendingMargonemAccountImportForConfirmation,
    { readonly _tag: "PendingMargonemAccountImportNotFound" }
  >
): PendingMargonemAccountImportStore & {
  readonly lookedUpId: () => PendingMargonemAccountImportId | undefined;
} => {
  let lookedUp: PendingMargonemAccountImportId | undefined;

  return {
    createPendingImport: () =>
      Promise.resolve(
        err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error("not used"),
          operation: "createPendingImport",
        })
      ),
    findPendingImportForConfirmation: ({ pendingImportId }) => {
      lookedUp = pendingImportId;
      return Promise.resolve(found);
    },
    lookedUpId: () => lookedUp,
    markPendingImportConfirmed: () => Promise.resolve(ok()),
  };
};

const createRecordingAccountWriter = (
  result: Result<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | SquadBuilderPersistenceUnavailable
  >
): OwnedMargonemAccountWriter & {
  readonly receivedDisplayName: () => string | undefined;
} => {
  let receivedName: string | undefined;

  return {
    createOwnedAccountFromPendingImport: ({ displayName }) => {
      receivedName = displayName as string;
      return Promise.resolve(result);
    },
    receivedDisplayName: () => receivedName,
  };
};

const savedSummary = (): OwnedMargonemAccountSummary => ({
  accountId: 1,
  characterCount: 1,
  displayName: "informati" as never,
  generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
  lastFetchedAt: new Date("2026-06-29T11:30:00.000Z"),
  profileId: parseTestProfileId(),
});

describe("ConfirmOwnedAccountImport", () => {
  it("rejects an invalid display name before loading the pending import", async () => {
    const pending = createRecordingPendingStore(ok(pendingForConfirmation()));
    const writer = createRecordingAccountWriter(ok(savedSummary()));
    const service = new ConfirmOwnedAccountImport(pending, writer, fixedClock);

    const result = await service.confirm({
      actorUserId: parseTestUserId(),
      displayName: "   ",
      pendingImportId: parseTestPendingId(),
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected invalid display name to fail");
    }

    expect(result.error._tag).toBe("InvalidAccountDisplayName");
    expect(pending.lookedUpId()).toBeUndefined();
  });

  it("confirms a pending import into an owned account summary", async () => {
    const pending = createRecordingPendingStore(ok(pendingForConfirmation()));
    const writer = createRecordingAccountWriter(ok(savedSummary()));
    const service = new ConfirmOwnedAccountImport(pending, writer, fixedClock);

    const result = await service.confirm({
      actorUserId: parseTestUserId(),
      displayName: "  informati  ",
      pendingImportId: parseTestPendingId(),
    });

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected confirm to succeed");
    }

    expect(result.value).toEqual(savedSummary());
    expect(writer.receivedDisplayName()).toBe("informati");
  });

  it("returns not found when the pending import is missing or expired", async () => {
    const pending = createRecordingPendingStore(
      err({ _tag: "PendingMargonemAccountImportNotFound" })
    );
    const writer = createRecordingAccountWriter(ok(savedSummary()));
    const service = new ConfirmOwnedAccountImport(pending, writer, fixedClock);

    const result = await service.confirm({
      actorUserId: parseTestUserId(),
      displayName: "informati",
      pendingImportId: parseTestPendingId(),
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected confirm to fail");
    }

    expect(result.error._tag).toBe("PendingMargonemAccountImportNotFound");
  });

  it("propagates duplicate account errors from the writer", async () => {
    const pending = createRecordingPendingStore(ok(pendingForConfirmation()));
    const writer = createRecordingAccountWriter(
      err({ _tag: "MargonemAccountAlreadyOwnedByActor" })
    );
    const service = new ConfirmOwnedAccountImport(pending, writer, fixedClock);

    const result = await service.confirm({
      actorUserId: parseTestUserId(),
      displayName: "informati",
      pendingImportId: parseTestPendingId(),
    });

    expect(isError(result)).toBe(true);

    if (!isError(result)) {
      throw new Error("Expected confirm to fail");
    }

    expect(result.error._tag).toBe("MargonemAccountAlreadyOwnedByActor");
  });
});
