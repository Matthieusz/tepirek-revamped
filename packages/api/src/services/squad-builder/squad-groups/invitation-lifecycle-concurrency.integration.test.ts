import { expect, it as effectIt } from "@effect/vitest";
import {
  margonemAccount,
  margonemAccountAccess,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, eq } from "drizzle-orm";
import * as Effect from "effect/Effect";

import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { createVerifiedMember } from "../../../test/integration/builders.ts";
import { testDb } from "../../../test/integration/database.ts";
import {
  parseTestUserId,
  squadBuilderIntegrationTestLayer,
} from "../../../test/squad-builder/store-integration.ts";
import {
  respond as respondToAccountAccessInvite,
  revoke as revokeAccountAccess,
} from "../account-sharing/account-sharing-operations.ts";
import { send as sendAccountAccessInvite } from "../account-sharing/send-account-access-invite-service.ts";
import { send as sendSquadGroupEditorInvite } from "./send-squad-group-editor-invite-service.ts";
import {
  respond as respondToSquadGroupInvite,
  revoke as revokeSquadGroupEditor,
} from "./squad-group-sharing-operations.ts";

const parseTestAccountId = (value: number) =>
  Effect.runSync(parseMargonemAccountId(value));

const parseTestGroupId = (value: number) =>
  Effect.runSync(parseSquadGroupId(value));

effectIt.layer(squadBuilderIntegrationTestLayer, { excludeTestServices: true })(
  "Invitation lifecycle concurrency",
  (it) => {
    it.effect("serializes concurrent account invite sends", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "concurrent-account-send-owner" })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "concurrent-account-send-target" })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Concurrent account send",
              ownerUserId: owner.id,
              profileId: 8_100_401,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        const outcomes = yield* Effect.all(
          [1, 2].map(() =>
            sendAccountAccessInvite({
              accountId: parseTestAccountId(account.id),
              actorUserId: parseTestUserId(owner.id),
              invitedUserId: parseTestUserId(target.id),
            }).pipe(Effect.result)
          ),
          { concurrency: "unbounded" }
        );

        expect(
          outcomes.filter((outcome) => outcome._tag === "Success")
        ).toHaveLength(1);
        const failure = outcomes.find((outcome) => outcome._tag === "Failure");
        expect(failure?._tag).toBe("Failure");
        if (failure?._tag === "Failure") {
          expect(failure.failure._tag).toBe(
            "AccountAccessTransitionNotAllowed"
          );
        }

        const rows = yield* Effect.promise(() =>
          testDb
            .select({ status: margonemAccountAccess.status })
            .from(margonemAccountAccess)
            .where(
              and(
                eq(margonemAccountAccess.accountId, account.id),
                eq(margonemAccountAccess.userId, target.id)
              )
            )
        );
        expect(rows).toEqual([{ status: "pending" }]);
      })
    );

    it.effect("serializes concurrent account accept and decline", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "concurrent-account-response-owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "concurrent-account-response-target",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Concurrent account response",
              ownerUserId: owner.id,
              profileId: 8_100_402,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        const invite = yield* sendAccountAccessInvite({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });
        const responses = ["accept", "decline"] as const;
        const outcomes = yield* Effect.all(
          responses.map((response) =>
            respondToAccountAccessInvite({
              accessId: invite.accessId,
              actorUserId: parseTestUserId(target.id),
              response,
            }).pipe(Effect.result)
          ),
          { concurrency: "unbounded" }
        );

        expect(
          outcomes.filter((outcome) => outcome._tag === "Success")
        ).toHaveLength(1);
        const failure = outcomes.find((outcome) => outcome._tag === "Failure");
        expect(failure?._tag).toBe("Failure");
        if (failure?._tag === "Failure") {
          expect(failure.failure._tag).toBe(
            "AccountAccessTransitionNotAllowed"
          );
        }

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: margonemAccountAccess.status })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, invite.accessId))
        );
        expect(["accepted", "declined"]).toContain(stored?.status);
      })
    );

    it.effect("serializes concurrent account decline and revoke", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "concurrent-account-revoke-owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "concurrent-account-revoke-target",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Concurrent account revoke",
              ownerUserId: owner.id,
              profileId: 8_100_403,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        const invite = yield* sendAccountAccessInvite({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });
        const outcomes = yield* Effect.all(
          [
            respondToAccountAccessInvite({
              accessId: invite.accessId,
              actorUserId: parseTestUserId(target.id),
              response: "decline",
            }).pipe(Effect.result),
            revokeAccountAccess({
              accessId: invite.accessId,
              actorUserId: parseTestUserId(owner.id),
            }).pipe(Effect.result),
          ],
          { concurrency: "unbounded" }
        );

        expect(
          outcomes.filter((outcome) => outcome._tag === "Success")
        ).toHaveLength(1);
        const failure = outcomes.find((outcome) => outcome._tag === "Failure");
        expect(failure?._tag).toBe("Failure");
        if (failure?._tag === "Failure") {
          expect(failure.failure._tag).toBe(
            "AccountAccessTransitionNotAllowed"
          );
        }

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: margonemAccountAccess.status })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, invite.accessId))
        );
        expect(["declined", "revoked"]).toContain(stored?.status);
      })
    );

    it.effect("serializes concurrent squad-group invite sends", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "concurrent-group-send-owner" })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "concurrent-group-send-target" })
        );
        const [group] = yield* Effect.promise(() =>
          testDb
            .insert(squadGroup)
            .values({
              name: "Concurrent group send",
              ownerUserId: owner.id,
              visibility: "private",
            })
            .returning({ id: squadGroup.id })
        );

        if (group === undefined) {
          throw new Error("Failed to seed squad group");
        }

        const outcomes = yield* Effect.all(
          [1, 2].map(() =>
            sendSquadGroupEditorInvite({
              actorUserId: parseTestUserId(owner.id),
              groupId: parseTestGroupId(group.id),
              invitedUserId: parseTestUserId(target.id),
            }).pipe(Effect.result)
          ),
          { concurrency: "unbounded" }
        );

        expect(
          outcomes.filter((outcome) => outcome._tag === "Success")
        ).toHaveLength(1);
        const failure = outcomes.find((outcome) => outcome._tag === "Failure");
        expect(failure?._tag).toBe("Failure");
        if (failure?._tag === "Failure") {
          expect(failure.failure._tag).toBe(
            "SquadGroupInvitationTransitionNotAllowed"
          );
        }

        const rows = yield* Effect.promise(() =>
          testDb
            .select({ status: squadGroupInvitation.status })
            .from(squadGroupInvitation)
            .where(
              and(
                eq(squadGroupInvitation.squadGroupId, group.id),
                eq(squadGroupInvitation.invitedUserId, target.id)
              )
            )
        );
        expect(rows).toEqual([{ status: "pending" }]);
      })
    );

    it.effect("serializes concurrent squad-group accept and decline", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "concurrent-group-response-owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "concurrent-group-response-target",
            })
        );
        const [group] = yield* Effect.promise(() =>
          testDb
            .insert(squadGroup)
            .values({
              name: "Concurrent group response",
              ownerUserId: owner.id,
              visibility: "private",
            })
            .returning({ id: squadGroup.id })
        );

        if (group === undefined) {
          throw new Error("Failed to seed squad group");
        }

        const invite = yield* sendSquadGroupEditorInvite({
          actorUserId: parseTestUserId(owner.id),
          groupId: parseTestGroupId(group.id),
          invitedUserId: parseTestUserId(target.id),
        });
        const responses = ["accept", "decline"] as const;
        const outcomes = yield* Effect.all(
          responses.map((response) =>
            respondToSquadGroupInvite({
              actorUserId: parseTestUserId(target.id),
              invitationId: invite.invitationId,
              response,
            }).pipe(Effect.result)
          ),
          { concurrency: "unbounded" }
        );

        expect(
          outcomes.filter((outcome) => outcome._tag === "Success")
        ).toHaveLength(1);
        const failure = outcomes.find((outcome) => outcome._tag === "Failure");
        expect(failure?._tag).toBe("Failure");
        if (failure?._tag === "Failure") {
          expect(failure.failure._tag).toBe(
            "SquadGroupInvitationTransitionNotAllowed"
          );
        }

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: squadGroupInvitation.status })
            .from(squadGroupInvitation)
            .where(eq(squadGroupInvitation.id, invite.invitationId))
        );
        expect(["accepted", "declined"]).toContain(stored?.status);
      })
    );

    it.effect("serializes concurrent squad-group decline and revoke", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "concurrent-group-revoke-owner" })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "concurrent-group-revoke-target" })
        );
        const [group] = yield* Effect.promise(() =>
          testDb
            .insert(squadGroup)
            .values({
              name: "Concurrent group revoke",
              ownerUserId: owner.id,
              visibility: "private",
            })
            .returning({ id: squadGroup.id })
        );

        if (group === undefined) {
          throw new Error("Failed to seed squad group");
        }

        const invite = yield* sendSquadGroupEditorInvite({
          actorUserId: parseTestUserId(owner.id),
          groupId: parseTestGroupId(group.id),
          invitedUserId: parseTestUserId(target.id),
        });
        const outcomes = yield* Effect.all(
          [
            respondToSquadGroupInvite({
              actorUserId: parseTestUserId(target.id),
              invitationId: invite.invitationId,
              response: "decline",
            }).pipe(Effect.result),
            revokeSquadGroupEditor({
              actorUserId: parseTestUserId(owner.id),
              invitationId: invite.invitationId,
            }).pipe(Effect.result),
          ],
          { concurrency: "unbounded" }
        );

        expect(
          outcomes.filter((outcome) => outcome._tag === "Success")
        ).toHaveLength(1);
        const failure = outcomes.find((outcome) => outcome._tag === "Failure");
        expect(failure?._tag).toBe("Failure");
        if (failure?._tag === "Failure") {
          expect(failure.failure._tag).toBe(
            "SquadGroupInvitationTransitionNotAllowed"
          );
        }

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: squadGroupInvitation.status })
            .from(squadGroupInvitation)
            .where(eq(squadGroupInvitation.id, invite.invitationId))
        );
        expect(["declined", "revoked"]).toContain(stored?.status);
      })
    );
  }
);
