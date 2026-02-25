import type { auth } from "@tepirek-revamped/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [inferAdditionalFields<typeof auth>()],
});
