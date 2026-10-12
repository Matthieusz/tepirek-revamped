# Managing the native Vite+ CLI with Mise

## Findings

Mise can install the native Vite+ CLI through its GitHub backend. The current `viteplus` and `vp` registry aliases on this machine resolve to `npm:vite-plus`, not the native CLI (`mise registry viteplus`, `mise tool viteplus`).

Vite+ release `v1.1.0` publishes `vp-x86_64-unknown-linux-gnu.tar.gz` for this machine. The downloaded archive contains `vp`, `toolchain.json`, and `sync-versions/bin.mjs`. `mise ls-remote github:voidzero-dev/vite-plus` successfully lists `1.1.0`.

Sources:

- [Vite+ release assets](https://github.com/voidzero-dev/vite-plus/releases/tag/v1.1.0)
- [Mise GitHub backend](https://mise.jdx.dev/dev-tools/backends/github.html)

## Configuration for this Linux x64 machine

Replace the existing `viteplus = "latest"` entry, rather than retaining both conflicting providers:

```toml
[tools]
"github:voidzero-dev/vite-plus" = { version = "latest", asset_pattern = "vp-x86_64-unknown-linux-gnu.tar.gz" }
```

Mise's GitHub backend supports explicit asset selection and extraction, discovers executables at the archive root, and strips the leading `v` from release tags. The asset pattern above is intentionally specific to Linux x64 glibc.

## Why this fixes project-local dependency resolution

The official native global CLI delegates development commands, including `vp test`, to the project's installed `vite-plus` package. The npm entry point used by the current Mise alias does not perform that native global dispatch. The temporary launcher patch emulates dispatch; it is unnecessary with the native launcher.

Source: [Vite+ global/local CLI cooperation](https://viteplus.dev/guide/global-cli#use-both-clis-together).

## Important ownership caveat

The downloaded binary is not a complete global toolchain installation. Its first invocation performs Vite+ setup. In `v1.1.0`, an externally installed bare binary provisions a versioned Vite+ installation and its JavaScript dependencies in Vite+'s user data directory, records a receipt tied to the external source binary, and dispatches to that provisioned binary. It can also configure shell profiles and generate shims.

Therefore, the GitHub backend keeps the source executable and selected release under Mise, but does not make all Vite+ support files Mise-owned. To keep Node.js and package-manager selection under Mise, first-run setup can use `VP_NODE_MANAGER=no VP_PM_MANAGER=no`; these are documented preferences, not launcher patches. Shell integration must be reviewed so Vite+'s generated PATH entries do not take precedence over Mise. The source also exposes `VP_SELF_SETUP_NO_MODIFY_PATH=1`, but this is an internal control, not a documented public integration contract.

Sources:

- [Native first-run setup at v1.1.0](https://github.com/voidzero-dev/vite-plus/blob/v1.1.0/crates/vp_global_cli/src/self_setup.rs)
- [External-installer setup receipts at v1.1.0](https://github.com/voidzero-dev/vite-plus/blob/v1.1.0/crates/vp_global_cli/src/self_setup/external.rs)
- [Documented manager preferences](https://viteplus.dev/guide/global-cli)

## Verification boundary

Installed the native `1.1.0` release through Mise and replaced the global tool entry with the GitHub backend configuration above. First-start setup used `VP_NODE_MANAGER=no VP_PM_MANAGER=no VP_SELF_SETUP_NO_MODIFY_PATH=1`, leaving shell profiles unchanged. This last variable is an internal bootstrap control; the launcher binary itself is unmodified.

`mise exec -- which vp` resolves to Mise's `github-voidzero-dev-vite-plus/latest/vp`. `vp env doctor` confirms system-first management and resolves Node.js and pnpm to their Mise installations. It reports the Vite+ shim directory missing from PATH, intentionally: Vite+ shell integration was not activated.

Both `mise exec -- vp test` and `mise exec -- pnpm test` pass all 603 tests. The npm launcher patches were restored from their backups, and the repository's test scripts no longer need `pnpm exec` wrappers. Existing shells must refresh Mise's environment or restart before plain `vp` resolves to the new binary.
