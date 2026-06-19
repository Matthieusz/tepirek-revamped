import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins:
    mode === "test"
      ? []
      : [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
}));
