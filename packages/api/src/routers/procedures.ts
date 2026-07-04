interface SessionAuthorizationState {
  readonly user: {
    readonly role?: string | null;
    readonly verified: boolean;
  };
}

/** True when the session belongs to a verified user. */
export const isVerifiedSession = (
  session: SessionAuthorizationState | null
): boolean => session?.user.verified === true;

/** True when the session belongs to a verified administrator. */
export const isAdminSession = (
  session: SessionAuthorizationState | null
): boolean => isVerifiedSession(session) && session?.user.role === "admin";
