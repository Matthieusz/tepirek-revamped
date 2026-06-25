import type { auth } from "@tepirek-revamped/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { serverUrl } from "@/lib/env";

export const authClient = createAuthClient({
  baseURL: serverUrl,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [inferAdditionalFields<typeof auth>()],
});
