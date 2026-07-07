import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const effectAtomReactCompat = fileURLToPath(
  new URL("src/lib/effect-atom-react-compat.ts", import.meta.url)
);

export default defineConfig(({ mode }) => ({
  plugins:
    mode === "test"
      ? []
      : [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  resolve: {
    alias: {
      "@effect-atom/atom-react": effectAtomReactCompat,
    },
    tsconfigPaths: true,
  },
  ...(mode === "test" && {
    define: {
      "import.meta.env.VITE_SERVER_URL": JSON.stringify(
        "http://localhost:3000"
      ),
    },
  }),
}));
