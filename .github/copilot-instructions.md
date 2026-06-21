---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Tepirek Revamped - AI Coding Guide

## Architecture Overview

This is a **monorepo** using Turborepo with pnpm workspaces:

```
apps/
  web/          # TanStack Start (React SSR) frontend on port 3001
  server/       # Hono API server on port 3000
packages/
  api/          # oRPC routers and procedures (shared API logic)
  auth/         # Better Auth configuration
  db/           # Drizzle ORM + PostgreSQL schemas
  config/       # Shared TypeScript configs
```

### Data Flow

1. **Frontend** (`apps/web`) uses `orpc` client to call API endpoints
2. **API calls** go through `packages/api` routers with `protectedProcedure`,
   `verifiedProcedure`, `adminProcedure`, or `publicProcedure`
3. **Database** access via Drizzle ORM in `packages/db`
4. **Authentication** via Better Auth with session passed through context

## Key Patterns

### API Procedures (packages/api)

```typescript
// Use protectedProcedure for authenticated routes
export const userRouter = {
  list: protectedProcedure.handler(async () => await db.select().from(user)),
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .handler(async ({ input, context }) => {
      // context.session.user is available
    }),
};
```

Authorization gates live in `packages/api/src/routers/procedures.ts`:
`publicProcedure`, `protectedProcedure`, `verifiedProcedure`,
`adminProcedure`. Prefer the most restrictive gate the workflow allows.

### Frontend Data Fetching (apps/web)

```typescript
// Use orpc with TanStack Query
import { orpc } from "@/utils/orpc";
const { data } = useQuery(orpc.user.list.queryOptions());
const mutation = useMutation(orpc.user.create.mutationOptions());
```

### Route Authentication (apps/web/src/routes)

```typescript
// Use beforeLoad for auth checks, NOT useEffect
export const Route = createFileRoute("/dashboard")({
  staticData: { crumb: "Dashboard" }, // Breadcrumbs use staticData
  beforeLoad: async () => {
    const session = await getUser(); // Server function
    if (!session?.user) throw redirect({ to: "/login" });
  },
});
```

### Auth Guards (apps/web/src/lib/route-helpers.ts)

```typescript
// Use centralized auth guards - DO NOT duplicate auth logic
import { requireVerified, requireUnverified } from "@/lib/route-helpers";

// For dashboard routes (login + email verified)
beforeLoad: async () => {
  const session = await requireVerified();
  return { session };
};

// For waiting-room (login + email NOT verified)
beforeLoad: async () => requireUnverified();
```

`route-helpers.ts` also exports `isAdmin(session)` for admin-only UI checks
and the `PageProps` interface (`{ session: AuthSession }`).

### Context Inheritance

```typescript
// Parent route passes the full session to children
// apps/web/src/routes/dashboard/route.tsx
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: () => {
    const { session } = Route.useRouteContext();
    return <DashboardLayout session={session} />;
  },
});

// Child routes access session via context - NO duplicate API calls
function ChildPage({ session }: PageProps) {
  // session is provided by the parent route's beforeLoad
}
```

### Loading States

```typescript
// Always handle isPending state with skeletons
import { Skeleton } from "@/components/ui/skeleton";

function RouteComponent() {
  const { data, isPending } = useQuery(orpc.user.list.queryOptions());

  if (isPending) return <Skeleton className="h-8 w-full" />;
  // render data...
}
```

### Auth Client Usage

```typescript
// Client-side session
const { data: session, isPending } = authClient.useSession();

// After login, invalidate the router before navigating
await router.invalidate();
navigate({ to: "/dashboard" });
```

### Redirect Error Handling

```typescript
// When catching errors in beforeLoad/loader, preserve redirects
import { isRedirect, redirect } from "@tanstack/react-router";
try {
  // ... logic that may throw redirect
} catch (error) {
  if (isRedirect(error)) throw error; // Re-throw redirects!
  throw redirect({ to: "/login" });
}
```

## Developer Commands

```bash
pnpm dev            # Start all apps (web + server)
pnpm dev:web        # Frontend only
pnpm dev:server     # Backend only
pnpm db:push        # Push schema to database
pnpm db:studio      # Open Drizzle Studio
pnpm check          # Ultracite lint + format check
pnpm fix            # Ultracite lint + format fix
pnpm check-types    # TypeScript typecheck (all packages)
pnpm test           # Unit tests (all packages)
pnpm test:smoke     # Server smoke tests
pnpm test:integration # API integration tests (real Postgres, Docker)
```

## File Conventions

- **Routes**: `apps/web/src/routes/` - File-based routing via TanStack Router.
  `apps/web/src/routeTree.gen.ts` is generated - DO NOT edit it by hand.
- **UI Components**: `apps/web/src/components/ui/` - shadcn/ui components
- **API Routers**: `packages/api/src/routers/` - One file per domain
- **DB Schemas**: `packages/db/src/schema/` - Drizzle table definitions

## Linting (Ultracite / Oxlint + Oxfmt)

The project uses **Ultracite**, a zero-config preset built on Oxlint + Oxfmt.
Key constraints:

- No TypeScript enums, use `as const` objects
- No `any` type, no non-null assertions (`!`)
- Use `import type` for type-only imports
- No `var`, use `const`/`let`
- Object keys must be sorted (`sort-keys`)
- Prefer `for...of` over `.forEach()` and indexed `for` loops
- Prefer `.toSorted()` over mutating `.sort()`

Run `pnpm fix` to auto-fix most issues before committing. See `AGENTS.md`
for the full coding standards.
