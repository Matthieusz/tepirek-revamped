import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import brotliCompress, { CompressionType } from "vite-plugin-brotli-compress";

const manualChunks = (id: string) => {
  if (
    id.includes("node_modules/react/") ||
    id.includes("node_modules/react-dom/")
  ) {
    return "vendor-react";
  }
  if (id.includes("node_modules/@tanstack/")) {
    return "vendor-tanstack";
  }
  if (
    id.includes("node_modules/@effect/") ||
    id.includes("node_modules/effect/")
  ) {
    return "vendor-effect";
  }
  if (
    id.includes("node_modules/@base-ui/") ||
    id.includes("node_modules/lucide-react/") ||
    id.includes("node_modules/sonner/") ||
    id.includes("node_modules/vaul/")
  ) {
    return "vendor-ui";
  }
};

const vendorChunksPlugin: Plugin = {
  applyToEnvironment: (environment) => environment.name === "client",
  configEnvironment: (name) => {
    if (name !== "client") {
      return;
    }

    return {
      build: {
        rolldownOptions: {
          output: { manualChunks },
        },
      },
    };
  },
  name: "web-vendor-chunks",
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const buildOutput = isProduction
    ? {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      }
    : {};

  return {
    build: {
      outDir: ".output/public",
      rolldownOptions: {
        output: buildOutput,
      },
    },
    plugins: [
      ...(mode === "test"
        ? []
        : [
            tailwindcss(),
            tanstackStart(),
            nitro(),
            viteReact(),
            vendorChunksPlugin,
          ]),
      ...(isProduction && env.ANALYZE === "true"
        ? [
            visualizer({
              brotliSize: true,
              filename: "bundle-analysis.html",
              gzipSize: true,
              open: false,
              template: "treemap",
            }),
          ]
        : []),
      ...(isProduction && env.PRECOMPRESS === "true"
        ? [
            brotliCompress({
              compressionThreshold: 0.05,
              minSize: 1024,
              quality: 9,
              type: CompressionType.BOTH,
            }),
          ]
        : []),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    ...(mode === "test" && {
      define: {
        "import.meta.env.VITE_SERVER_URL": JSON.stringify(
          "http://localhost:3000"
        ),
      },
    }),
  };
});
