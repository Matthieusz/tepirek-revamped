# Step 08 — Squad Builder Module Layout

Status: draft.

## Accepted strategy

Split service/adapter code into accepted sub-domain folders under `packages/api/src/modules/squad-builder/`, while keeping existing domain/value files flat for the first structural split. Postpone moving shared domain/value files into a `domain/` folder until after the `createSquadGroup` reference slice is stable.

## First structural split target

```txt
packages/api/src/modules/squad-builder/
  app-user-id.ts
  squad-name.ts
  squad-group-id.ts
  squad-group-visibility.ts
  ...existing domain/value files remain flat initially

  squad-groups/
    create-squad-group.ts
    list-squad-groups.ts
    save-squad-group.ts
    squad-group-store.ts
    drizzle-squad-group-store.ts

  account-import/
    account-import-store.ts
    drizzle-account-import-store.ts
    ...

  account-sharing/
    account-sharing-store.ts
    drizzle-account-sharing-store.ts
    ...

  account-refetch/
    account-refetch-store.ts
    drizzle-account-refetch-store.ts
    ...
```

## Later cleanup candidate

After the `createSquadGroup` reference slice is stable, consider moving shared value/domain modules into a `domain/` folder if imports remain noisy and the move improves locality:

```txt
packages/api/src/modules/squad-builder/
  domain/
    app-user-id.ts
    squad-group-id.ts
    squad-name.ts
    squad-group-visibility.ts
    ...
```

## Test placement

Keep tests near the owned module:

- `squad-groups/create-squad-group.test.ts`;
- `squad-groups/drizzle-squad-group-store.integration.test.ts`;
- domain/value tests remain next to their current domain/value files until any later domain folder move.

## Rationale

- The accepted service seams get real folders immediately.
- The first split isolates service and adapter responsibilities without a noisy whole-module move.
- Keeping domain files flat first makes diffs smaller and rollback easier.
- A later domain-folder move remains available once the Effect reference slice proves the architecture.
