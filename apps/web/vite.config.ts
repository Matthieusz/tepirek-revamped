import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite-plus";

export default defineConfig(({ mode }) => ({
  plugins:
    mode === "test"
      ? []
      : [
          tailwindcss(),
          tanstackStart(),
          nitro({
            rolldownConfig: {
              onLog(level, warning, defaultHandler) {
                // This app uses SSR, not RSC: dependency "use client" markers
                // have no boundary semantics here. Keep other warnings visible.
                const isDependencyClientDirective =
                  warning.code === "MODULE_LEVEL_DIRECTIVE" &&
                  warning.message.includes('directive "use client"') &&
                  warning.id?.includes("/node_modules/") === true;

                if (isDependencyClientDirective) {
                  return;
                }

                defaultHandler(level, warning);
              },
            },
          }),
          viteReact(),
        ],
  resolve: {
    tsconfigPaths: true,
  },
  run: {
    tasks: {
      "build:app": {
        cache: {
          input: [{ auto: true }, "!.output/**", "!dist/**", "!.tanstack/**"],
          output: ["dist/**", ".output/**"],
        },
        command: "vp build",
      },
    },
  },
  ...(mode === "test" && {
    define: {
      "import.meta.env.VITE_SERVER_URL": JSON.stringify(
        "http://localhost:3000"
      ),
    },
  }),
}));
