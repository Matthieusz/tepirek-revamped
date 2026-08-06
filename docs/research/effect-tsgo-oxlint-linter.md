# Effect tsgo through Oxlint: feasibility and trade-offs

Date: 2026-08-05

## Conclusion

Do **not** add the new Effect-aware Oxlint integration to the primary `pnpm lint` command yet.

This repository already runs Effect language-service diagnostics through patched TypeScript during `pnpm check-types`. The new integration would add a second frontend for substantially the same Effect analyzer, while also activating Ultracite's currently dormant type-aware TypeScript rules. In a local probe, that changed a clean lint run into 530 diagnostics and raised peak memory from about 233 MiB to about 1.7 GiB.

A small, separate pilot can still be worthwhile if Oxlint-native reporting, inline suppression, or fix suggestions are specifically desired.

## Current repository state

- `package.json` installs `@effect/tsgo@^0.31.0`, runs `effect-tsgo patch` in `prepare`, and installs `oxlint-tsgolint@^7.0.2001`.
- `packages/config/tsconfig.base.json` enables `@effect/language-service`; workspace configs inherit it, while the API and server add project-specific Effect diagnostic settings.
- Workspace `check-types` scripts invoke patched `tsc`, so Effect diagnostics already participate in type checking.
- `oxlint.config.ts` extends Ultracite but does not set `options.typeAware` or load the `effecttsgo` plugin. Consequently, `oxlint-tsgolint` is installed but not used by the normal lint command.

The Effect project explicitly describes three lint frontends: patched `tsc`, the dedicated `effect-tsgo diagnostics` command, and the Oxlint patch. Oxlint is therefore an alternative delivery path for the analyzer, not a wholly separate class of checks.[1]

## What the newly documented setup requires

The guide added on 2026-08-03 and expanded with a schema on 2026-08-04 requires:[2][3]

1. compatible versions of `@effect/tsgo`, `oxlint`, and `oxlint-tsgolint`;
2. `effect-tsgo patch --oxlint` in `prepare`;
3. Oxlint type-aware mode;
4. the `effecttsgo` plugin; and
5. optionally, the shipped `oxlint-schema.json` for config validation and completion.

The versions are tightly coupled. At commit `9eda97e`, `@effect/tsgo@0.31.0` expects exactly Oxlint `1.77.0` and `oxlint-tsgolint` `7.0.2001`.[4] This repository now has the compatible Effect tsgo and tsgolint versions, but remains on Oxlint `1.75.0`; Oxlint must be aligned before the guide can be applied.

The patch is invasive by design: it replaces the installed platform-specific Oxlint native binding and `tsgolint` executable, keeping `.original` backups. Its source labels the feature experimental, validates exact versions, and supports only x64/arm64 on Windows and macOS, and glibc Linux.[5]

## Advantages

### Effect-specific semantic checks in the lint workflow

The patched integration registers 94 Effect-aware, type-dependent rules in the tested `0.31.0` release. They cover correctness issues such as floating Effects, missing requirements/errors, invalid service shapes, nested promises, and unsafe narrowing, as well as Effect idioms and style.[1]

This is more useful than syntax-only linting because these checks inspect inferred Effect, Layer, Stream, Schema, and service types.

### One Oxlint reporting surface

Effect findings can use Oxlint's existing output formats, severity handling, inline disable comments, warning thresholds, timings, and CI annotations. This can simplify consumption by CI and code-review tooling compared with parsing a separate diagnostics command.[2][6]

### Oxlint-delivered suggestions

Effect `0.28.0` added language-service code actions as lazy Oxlint suggestions.[7] This creates a path to use Oxlint's suggestion-fix workflow for supported Effect rules instead of relying only on editor quick fixes.

### Opportunity to consolidate checks later

Oxlint documents `options.typeCheck` as capable of reporting TypeScript compiler diagnostics alongside lint results, potentially replacing a separate `tsc --noEmit` step.[6] That could eventually avoid maintaining separate lint/typecheck reporting paths.

This should not be assumed safe for this repository yet: it is a Turbo monorepo with composite builds and package-level `tsc` flags, so parity would need explicit validation.

## Drawbacks

### It duplicates analysis already run by `check-types`

Patched `tsc` already runs the Effect language service. Enabling Effect rules in Oxlint while retaining `pnpm check-types` builds TypeScript programs again. The Effect README specifically notes that dedicated linting causes typechecking to occur again, whereas `tsc` mode can typecheck once and cache output.[1]

Editor use can also show duplicate Effect diagnostics if both the Effect TypeScript language server and Oxlint's LSP publish the same rules.

### High memory and migration cost in this repository

Local measurements on the current checkout:

| command/probe                                         | elapsed | peak RSS | diagnostics |
| ----------------------------------------------------- | ------: | -------: | ----------: |
| existing `pnpm lint --silent`                         |  2.62 s |  233 MiB |           0 |
| current Oxlint with `--type-aware`                    |  8.26 s | 1.50 GiB |         484 |
| patched Effect/Oxlint `0.31.0` with repository config |  5.33 s | 1.70 GiB |         530 |

The patched probe produced 486 existing Ultracite TypeScript-rule diagnostics, 42 Effect warnings, and 2 native diagnostics. The Effect findings were all `effecttsgo/any-unknown-in-error-context`: 38 in one integration test and 4 in web test/helper code.

These are single warm-machine measurements, not formal benchmarks, but they expose the adoption shape: setting `typeAware: true` activates many Ultracite rules that are configured today but cannot run without type information. The migration is therefore much larger than adding one plugin.

Oxlint itself warns that very large codebases can experience high memory use and that type-aware performance is still improving.[6]

### Exact-version and install-patching fragility

The integration requires a synchronized three-package version set. A routine independent Dependabot/Renovate-style update can make `prepare` fail until all versions are aligned. The install step also mutates package-manager-managed native binaries, which is less transparent than loading a normal plugin package.[2][4][5]

This adds failure modes for frozen CI installs, local package-store layouts, architecture support, and future package-manager behavior.

### Experimental and newly released

Oxlint integration selection only arrived in Effect tsgo `0.29.0` on 2026-08-04; the config schema arrived in `0.30.0` the same day.[3][7] The patch implementation still calls the integration experimental.[5] The documentation and generated rule docs are valuable, but there has been little release time for edge cases to surface.

### Configuration duplication

Effect severities and overrides currently live in `tsconfig.json` plugin options. Oxlint rules use `effecttsgo/*` names and Oxlint severity/category configuration. Running both frontends means keeping two policy representations synchronized, including test exclusions and the repository's special `lazyEffect` and `unsafeEffectTypeAssertion` choices.[1][2]

## Recommended path

1. **Keep Effect diagnostics in `pnpm check-types` as the authoritative CI path.** This uses the integration already present and avoids a second type-aware program build.
2. **Keep the completed `@effect/tsgo@0.31.0` upgrade separate from Oxlint integration.** Continue validating the newer analyzer and editor behavior before coupling it to Oxlint.
3. **If Oxlint-native fixes/reporting are wanted, create a separate pilot command and config.** Do not immediately set `typeAware: true` in the shared Ultracite config. Enable only selected high-signal Effect correctness rules, scope or exclude tests deliberately, and measure CI memory.
4. **Do not replace `pnpm check-types` with Oxlint `typeCheck` until parity is proven** across all workspace scripts, project references, declaration/composite behavior, and Effect diagnostic exit-code settings.
5. **Revisit after the patch is no longer marked experimental** or after several releases demonstrate stable version coordination.

## Sources

1. Effect tsgo README, LSP lint modes and rule catalog: <https://github.com/Effect-TS/tsgo/blob/9eda97ef918dba182a45c7f4c9ebb8dcda899971/README.md>
2. Effect tsgo Oxlint setup guide: <https://github.com/Effect-TS/tsgo/blob/9eda97ef918dba182a45c7f4c9ebb8dcda899971/docs/README.md>
3. Effect tsgo commits adding generated Oxlint docs and configuration schema: <https://github.com/Effect-TS/tsgo/commit/7bbafe441265a3e12e224590e8b2b2fa266ce09a>, <https://github.com/Effect-TS/tsgo/commit/f155e33e35416e4496503dbce7c0ede80344203e>
4. Effect tsgo pinned upstream profiles: <https://github.com/Effect-TS/tsgo/blob/9eda97ef918dba182a45c7f4c9ebb8dcda899971/_packages/tsgo/upstream.json>
5. Effect tsgo experimental Oxlint patch implementation: <https://github.com/Effect-TS/tsgo/blob/9eda97ef918dba182a45c7f4c9ebb8dcda899971/_packages/tsgo/src/cli/experimentalOxlint.ts>
6. Official Oxlint type-aware linting guide: <https://oxc.rs/docs/guide/usage/linter/type-aware>
7. Effect tsgo releases `0.28.0`–`0.31.0`: <https://github.com/Effect-TS/tsgo/releases>
