import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { RequestSession } from "../../protocol/auth/current-session.ts";
import {
  SquadBuilderForbidden,
  SquadBuilderUnauthorized,
} from "../../protocol/squad-builder/squad-groups/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new SquadBuilderForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new SquadBuilderUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new SquadBuilderForbidden({
      message: "Konto oczekuje na weryfikację",
    }),
});

/** Load the verified request session, or fail with 401/403. */
export const requireSquadBuilderSession = requireVerifiedSession;

/** Extract the AppUserId from an authenticated session. */
export const sessionAppUserId = (session: RequestSession): AppUserId =>
  session.user.id;
