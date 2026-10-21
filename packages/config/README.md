# Shared application rules and tooling configuration

This existing workspace has two separate responsibilities. Its name is historical; business rules are not deployment or compiler configuration.

## Import ownership

| Import | Responsibility |
| --- | --- |
| `@tepirek-revamped/config/application/guild-ledger` | Point calculations and earnings thresholds shared by ledger adapters and UI previews. |
| `@tepirek-revamped/config/application/events` | Event icon identifiers, guards, defaults, and labels. |
| `@tepirek-revamped/config/application/users` | Shared application role vocabulary. |
| `@tepirek-revamped/config/application/auctions` | Auction types, professions, slot layout, and legality rules. |
| `@tepirek-revamped/config/application/skills` | Skill-range slug rules. |
| `@tepirek-revamped/config/tsconfig.base.json` | Compiler/tooling configuration, used by `tsconfig.json` extends. |

Application subpaths are browser-safe and shared by API contracts, adapters, and web consumers. They must not import compiler configuration, environment credentials, server implementations, or executable lifecycle code. UI-specific choices stay in web features; runtime configuration is parsed at executable boundaries.

The package root is a frozen legacy export surface, retained without duplicating implementations. Repository consumers use the explicit application subpaths. Do not add new exports to the root or introduce an `application` catch-all barrel.

## Scope and future ownership

These subpaths clarify ownership without introducing new packages or changing rule behavior. Existing auction and slug implementation files remain in place; public subpaths do not require a directory migration.

When shared-domain ownership is revisited, move cohesive rules/vocabulary to the appropriate shared domain/contracts home and keep compiler/tooling configuration separate. Make that a dedicated change, not part of a frontend integration pilot. Do not create one package per constant.
