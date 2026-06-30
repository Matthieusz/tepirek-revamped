# Step 09 — Transaction Strategy

Status: draft.

## Accepted strategy

Keep transactions inside persistence adapter/service methods at first. Introduce a shared transaction capability only when a use case truly needs to compose multiple store operations atomically across service boundaries.

## First slice

For `createSquadGroup`:

- no explicit multi-step transaction is planned unless the Drizzle Effect insert path requires it;
- `SquadGroupStore.createSquadGroup` owns the DB call;
- the Drizzle adapter translates DB exceptions into typed persistence errors such as `SquadBuilderPersistenceUnavailable`.

## Later transaction-heavy operations

Preserve cohesive adapter-owned transaction boundaries for operations such as:

- Firecrawl budget reservation;
- pending import creation;
- account import confirmation;
- pending refetch creation;
- refetched account apply;
- account invite upsert/response/revoke;
- squad group invite upsert/response;
- squad group snapshot save.

These operations already represent atomic persistence capabilities. Their transaction mechanics belong in the Drizzle adapter layer, not in high-level use-case orchestration.

## When to revisit

Design a shared `DatabaseTransaction` / `Transactor` Effect service only if a real use case requires atomically composing multiple store services, for example:

```txt
Use case needs:
  AccountImportStore.methodA
  AccountSharingStore.methodB
  SquadGroupStore.methodC
all inside one database transaction.
```

At that point, document the new transaction service shape and test strategy before implementing it.

## Guardrails

- Service Modules own workflow policy, not SQL transaction mechanics.
- External Adapter Modules own persistence translation, exception classification, and transaction mechanics.
- Do not leak raw transaction handles into domain modules.
- Do not add a generic transaction abstraction before there is a concrete cross-store atomicity requirement.
