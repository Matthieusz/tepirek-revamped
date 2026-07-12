import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import { parsePendingMargonemAccountImportId } from "./pending-margonem-account-import-id.js";
import { parseSquadGroupId } from "./squad-group-id.js";
import { parseSquadGroupInvitationId } from "./squad-group-invitation-id.js";
import { parseSquadId } from "./squad-id.js";

const invalidPositiveIds = [0, -1, 1.5, Number.NaN] as const;

describe("persisted branded id boundaries", () => {
  it.effect("decodes positive integer ids", () =>
    Effect.gen(function* decodePositiveIds() {
      expect(yield* parsePendingMargonemAccountImportId(1)).toBe(1);
      expect(yield* parseSquadGroupId(2)).toBe(2);
      expect(yield* parseSquadGroupInvitationId(3)).toBe(3);
      expect(yield* parseSquadId(4)).toBe(4);
    })
  );

  it.effect("rejects invalid pending import ids", () =>
    Effect.gen(function* rejectInvalidPendingImportIds() {
      for (const value of invalidPositiveIds) {
        const failure = yield* parsePendingMargonemAccountImportId(value).pipe(
          Effect.flip
        );
        expect(failure._tag).toBe("InvalidPendingMargonemAccountImportId");
      }
    })
  );

  it.effect("rejects invalid squad group ids", () =>
    Effect.gen(function* rejectInvalidSquadGroupIds() {
      for (const value of invalidPositiveIds) {
        const failure = yield* parseSquadGroupId(value).pipe(Effect.flip);
        expect(failure._tag).toBe("InvalidSquadGroupId");
      }
    })
  );

  it.effect("rejects invalid squad group invitation ids", () =>
    Effect.gen(function* rejectInvalidInvitationIds() {
      for (const value of invalidPositiveIds) {
        const failure = yield* parseSquadGroupInvitationId(value).pipe(
          Effect.flip
        );
        expect(failure._tag).toBe("InvalidSquadGroupInvitationId");
      }
    })
  );

  it.effect("rejects invalid squad ids", () =>
    Effect.gen(function* rejectInvalidSquadIds() {
      for (const value of invalidPositiveIds) {
        const failure = yield* parseSquadId(value).pipe(Effect.flip);
        expect(failure._tag).toBe("InvalidSquadId");
      }
    })
  );
});
