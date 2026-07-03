import { serverUrl } from "@/lib/env";

export interface VerifiedMember {
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
}
export interface Player {
  readonly createdAt: Date;
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
  readonly role: string | null;
  readonly updatedAt: Date;
  readonly verified: boolean;
}
export interface AuthenticatedSession {
  readonly session: {
    readonly createdAt: Date;
    readonly expiresAt: Date;
    readonly id: string;
    readonly ipAddress?: string | null;
    readonly token: string;
    readonly updatedAt: Date;
    readonly userAgent?: string | null;
    readonly userId: string;
  };
  readonly user: Omit<Player, "image" | "role"> & {
    readonly email: string;
    readonly emailVerified: boolean;
    readonly image?: string | null;
    readonly role?: string | null;
  };
}
type PlayerJson = Omit<Player, "createdAt" | "updatedAt"> & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

const request = async <A>(path: string, init?: RequestInit): Promise<A> => {
  const response = await fetch(`${serverUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<A>;
};
type AuthenticatedSessionJson = Omit<
  AuthenticatedSession,
  "session" | "user"
> & {
  readonly session: Omit<
    AuthenticatedSession["session"],
    "createdAt" | "expiresAt" | "updatedAt"
  > & {
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly updatedAt: string;
  };
  readonly user: PlayerJson & {
    readonly email: string;
    readonly emailVerified: boolean;
  };
};
const parsePlayer = (player: PlayerJson): Player => ({
  ...player,
  createdAt: new Date(player.createdAt),
  updatedAt: new Date(player.updatedAt),
});
const parseAuthenticatedSession = (
  authSession: AuthenticatedSessionJson
): AuthenticatedSession => ({
  session: {
    ...authSession.session,
    createdAt: new Date(authSession.session.createdAt),
    expiresAt: new Date(authSession.session.expiresAt),
    updatedAt: new Date(authSession.session.updatedAt),
  },
  user: {
    ...authSession.user,
    createdAt: new Date(authSession.user.createdAt),
    updatedAt: new Date(authSession.user.updatedAt),
  },
});

export const userApi = {
  deleteUser: (input: { readonly userId: string }) =>
    request<{ readonly success: true }>("/user/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getSession: async () => {
    const session = await request<AuthenticatedSessionJson>("/user/session");
    return parseAuthenticatedSession(session);
  },
  getVerified: () => request<readonly VerifiedMember[]>("/user/verified"),
  getVerifiedQueryKey: ["user", "verified"] as const,
  list: async () => {
    const players = await request<readonly PlayerJson[]>("/user");
    return players.map(parsePlayer);
  },
  listQueryKey: ["user", "list"] as const,
  sessionQueryKey: ["user", "session"] as const,
  setRole: (input: { readonly role: string; readonly userId: string }) =>
    request<PlayerJson | null>("/user/set-role", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  setVerified: (input: {
    readonly userId: string;
    readonly verified: boolean;
  }) =>
    request<PlayerJson | null>("/user/set-verified", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  updateProfile: (input: { readonly name: string }) =>
    request<PlayerJson | null>("/user/profile", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  updateUserName: (input: { readonly name: string; readonly userId: string }) =>
    request<PlayerJson | null>("/user/name", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  verifyDiscordGuildMembership: () =>
    request<{ readonly valid: boolean }>(
      "/user/verify-discord-guild-membership",
      { method: "POST" }
    ),
};
