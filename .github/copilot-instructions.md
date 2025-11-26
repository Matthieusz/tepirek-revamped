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
2. **API calls** go through `packages/api` routers with `protectedProcedure` or `publicProcedure`
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

### Auth Guards (apps/web/src/lib/auth-guard.ts)

```typescript
// Use centralized auth guards - DO NOT duplicate auth logic
import {
  requireAuth,
  requireVerified,
  requireUnverified,
} from "@/lib/auth-guard";

// For routes requiring login only
beforeLoad: async () => requireAuth();

// For dashboard routes (login + email verified)
beforeLoad: async () => requireVerified();

// For waiting-room (login + email NOT verified)
beforeLoad: async () => requireUnverified();
```

### Context Inheritance

```typescript
// Parent route passes session to children
// apps/web/src/routes/dashboard/route.tsx
beforeLoad: async () => {
  const session = await requireVerified();
  return { session: session.user }; // Available to all child routes
},
  // Child routes access session via context - NO duplicate API calls
  function RouteComponent() {
    const { session } = Route.useRouteContext();
    // session is already available, no need to fetch again
  };
```

### Loading States

```typescript
// Always handle isPending state with skeletons
import { TableSkeleton, CardGridSkeleton } from "@/components/ui/skeleton";

function RouteComponent() {
  const { data, isPending } = useQuery(orpc.user.list.queryOptions());

  if (isPending) return <TableSkeleton rows={5} />;
  // render data...
}
```

### Auth Client Usage

```typescript
// Client-side session
const { data: session, isPending } = authClient.useSession();

// After login, invalidate router before navigating
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
pnpm dev           # Start all apps (web + server)
pnpm dev:web       # Frontend only
pnpm dev:server    # Backend only
pnpm db:push       # Push schema to database
pnpm db:studio     # Open Drizzle Studio
pnpm check         # Biome lint + format
```

## File Conventions

- **Routes**: `apps/web/src/routes/` - File-based routing via TanStack Router
- **UI Components**: `apps/web/src/components/ui/` - shadcn/ui components
- **API Routers**: `packages/api/src/routers/` - One file per domain
- **DB Schemas**: `packages/db/src/schema/` - Drizzle table definitions

## Linting (Biome/Ultracite)

The project uses strict Biome rules. Key constraints:

- No TypeScript enums, use `as const` objects
- No `any` type, no non-null assertions (`!`)
- Use `import type` for type-only imports
- No `var`, use `const`/`let`
- Module augmentation requires `// biome-ignore lint:` comment for interfaces
