import type { auth } from "@tepirek-revamped/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
  baseURL: import.meta.env.VITE_SERVER_URL,
  fetchOptions: {
    // Use cookie cache from server (5 min TTL configured in packages/auth)
    // This prevents redundant session validation requests
    credentials: "include",
  },
});
