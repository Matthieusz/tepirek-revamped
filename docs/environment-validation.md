# Environment validation

Infisical remains the secret store. Local root scripts use `infisical run`, and Dokploy resolves the existing `${{vault.infisical.KEY}}` references. Varlock validates the resulting environment; no Infisical plugin or additional credentials are required.

## Schemas and commands

- `apps/server/.env.schema`: API configuration, importing database configuration. Validated by server `dev`, `start`, and `start:deploy`.
- `apps/web/.env.schema`: public `VITE_SERVER_URL`. Validated by web `dev` and `build`, before the build task can use its cache.
- `packages/db/.env.schema`: only `DATABASE_URL`. Validated by `db:push`, `db:studio`, `db:generate`, and `db:migrate`.

Existing root development and database commands still inject Infisical values before these package scripts execute. Database container lifecycle commands remain unchanged. Server builds do not require runtime secrets. Existing Effect validation remains in place, including defaults and application-specific checks.

Varlock is a root production dependency so deployment startup can execute it. Keep root dependencies and the schemas in the deployed image. `varlock run` passes validated values to the child process and fails before running it when configuration is invalid. It also handles any local schema overrides consistently; no secret values belong in committed schemas.

To inspect configuration safely after Infisical injection:

```sh
infisical run --env=dev --path=/ -- pnpm exec varlock load --path apps/server --agent
infisical run --env=dev --path=/ -- pnpm exec varlock load --path apps/web --agent
```

The standalone legend-catalog sync command retains its existing minimal Effect validation rather than requiring all API configuration.

## Dokploy / Railpack

Keep all existing vault references and install/build commands from the current setup.

For the **API**, change `RAILPACK_START_CMD` to:

```sh
pnpm --filter server start:deploy
```

This validates API configuration before migrations, runs the database migration script, and starts the server only after migration succeeds. The migration script also validates its database-only schema when called independently.

For the **frontend**, keep:

```sh
RAILPACK_BUILD_CMD='pnpm --filter web build'
RAILPACK_START_CMD='node apps/web/.output/server/index.mjs'
```

`VITE_SERVER_URL` must be available during the build. It is public and embedded in the client bundle; changing it requires rebuilding. The frontend does not need backend secrets or runtime Varlock validation of this build-time value.

Directly executing `node apps/server/dist/index.mjs` bypasses the CLI validation, so use the package startup scripts. Changes to Dokploy must be applied manually; adding these files does not update the running deployment.
