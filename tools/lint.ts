import { execve } from "node:process";
import { fileURLToPath } from "node:url";

import { binaryPath } from "@maschwenk/tsrslint";

/** Replace this CLI process with Vite+ using tsrslint, or the dedicated native Effect lint pass. */
const main = () => {
  if (execve === undefined) {
    throw new Error("The lint runner requires Node.js on Linux or macOS.");
  }

  const [command = "check", ...args] = process.argv.slice(2);
  const effectOnly = command === "effect";

  const executable = fileURLToPath(
    new URL(
      effectOnly
        ? "../node_modules/oxlint/bin/oxlint"
        : "../node_modules/vite-plus/bin/vp",
      import.meta.url
    )
  );

  const arguments_ = effectOnly
    ? [
        "--config",
        fileURLToPath(new URL("../oxlint.effect.config.ts", import.meta.url)),
        ...args,
      ]
    : [command, ...args];

  const backend = effectOnly
    ? fileURLToPath(
        new URL(
          "../node_modules/oxlint-tsgolint/bin/tsgolint.js",
          import.meta.url
        )
      )
    : binaryPath();

  // Both backends support Unix platforms. execve preserves stdio, signals and exit status for the LSP.
  execve(process.execPath, [process.execPath, executable, ...arguments_], {
    ...process.env,
    OXLINT_TSGOLINT_PATH: backend,
  });
};

main();
