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
const parsePlayer = (player: PlayerJson): Player => ({
  ...player,
  createdAt: new Date(player.createdAt),
  updatedAt: new Date(player.updatedAt),
});

export const userApi = {
  deleteUser: (input: { readonly userId: string }) =>
    request<{ readonly success: true }>("/user/delete", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getSession: () => request<unknown>("/user/session"),
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
