# Bundle Minification Research

## Current State

The project uses **Vite 8** with **TanStack Start** (React). The Vite config at `apps/web/vite.config.ts` currently has **no explicit build configuration** — it relies entirely on Vite 8 defaults.

Vite 8 defaults:

- **JS minifier**: `oxc` (Rust-based, 30-90x faster than Terser, ~0.5-2% worse compression)
- **CSS minifier**: `lightningcss`
- **Bundler**: Rolldown (replaced Rollup in Vite 8)
- **Tree-shaking**: Enabled by default via Rolldown
- **Source maps**: Disabled by default

## Minification Options

### 1. Current Default: Oxc (already active)

Vite 8 uses Oxc minifier by default. No config needed. This is already the fastest option with near-Terser compression.

**Trade-off**: 0.5-2% larger output than Terser, but 30-90x faster builds.

### 2. Switch to Terser (for maximum compression)

```ts
// vite.config.ts
export default defineConfig({
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // remove console.log in production
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug"],
      },
      mangle: {
        toplevel: true,
      },
    },
  },
});
```

**Requires**: `npm add -D terser`

**Impact**: 0.5-2% smaller JS output, but significantly slower builds.

### 3. Configure Oxc via Rolldown (recommended)

Since Oxc runs inside Rolldown, configure it through `rolldownOptions`:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      },
    },
  },
});
```

**No extra dependencies needed.** This is the recommended path for Vite 8.

## Compression (Gzip/Brotli)

Minification reduces source size. Compression reduces transfer size. Both are needed.

### Option A: Pre-compression plugin

```ts
import brotliCompress from "vite-plugin-brotli-compress";

export default defineConfig({
  plugins: [
    brotliCompress({
      quality: 11, // Brotli max quality (build-time only)
      minSize: 1024, // only compress files > 1KB
    }),
  ],
});
```

**Requires**: `npm add -D vite-plugin-brotli-compress`

Produces `.br` and `.gz` files alongside originals. Your server/CDN must be configured to serve them.

### Option B: Server-side compression (Nitro)

Since you use Nitro (via TanStack Start), compression can be handled at the server level. Nitro supports gzip/brotli via `compression` middleware or CDN configuration.

### Option C: CDN compression

Cloudflare, Vercel, and similar CDNs handle compression automatically. Check if your deployment target already does this before adding build-time compression.

**Recommendation**: If deploying to Cloudflare or Vercel, their edge compression is sufficient. Pre-compression is most valuable for self-hosted static deployments.

## Code Splitting

This is where the **biggest gains** come from — not minification.

### TanStack Router Auto Code Splitting

Your router uses TanStack Router. Enable automatic code splitting:

```ts
// If using the router plugin directly (not Start)
tanstackRouter({
  autoCodeSplitting: true,
});
```

With TanStack Start, this may already be enabled. Check your generated `routeTree.gen.ts` for `lazy` imports.

### Manual Route Lazy Loading

You already have some `.lazy.tsx` files (e.g., `heroes.lazy.tsx`, `squads_.$groupId.lazy.tsx`). Extend this pattern to heavy routes:

- Calculator routes (`odw.tsx`, `ulepa.tsx`)
- Auction routes
- Squad builder routes

### Manual Chunk Splitting

Configure via `rolldownOptions`:

```ts
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["@tanstack/react-router"],
          "vendor-ui": ["@base-ui/react", "lucide-react"],
          "vendor-effect": ["effect", "@effect/atom-react"],
        },
      },
    },
  },
});
```

## Other Optimization Opportunities

### 1. Font Loading

You import 3 font families. Consider:

- Using `font-display: swap` (likely already set by `@fontsource-variable`)
- Subsetting fonts to only needed glyphs
- Loading fonts asynchronously

### 2. Library Replacements

| Library | Size | Alternative |
| --- | --- | --- |
| `date-fns` | ~20KB+ | `date-fns` (already tree-shakeable) or `temporal-polyfill` |
| `lucide-react` | varies | Import only used icons: `import { Icon } from 'lucide-react'` |

### 3. Remove Dev Dependencies from Bundle

- `TanStackRouterDevtools` is conditionally rendered via `import.meta.env.DEV` — this is correct, Vite will tree-shake it in production.

### 4. CSS Optimization

Tailwind CSS v4 is already using Lightning CSS for minification. Ensure:

- Purge unused CSS classes (Tailwind handles this)
- Consider `css.codeSplit: true` (default) for per-route CSS chunks

## Recommended Action Plan

### Quick Wins (no code changes)

1. **Enable console.log removal** in production via `rolldownOptions`
2. **Enable source maps** for production debugging: `build.sourcemap: 'hidden'`

### Medium Effort

3. **Add `manualChunks`** for vendor libraries
4. **Extend `.lazy.tsx` pattern** to heavy routes
5. **Add bundle analyzer** to visualize what's in your bundle

### High Impact

6. **Audit dependencies** with `npx bundlephobia <package>` before adding new ones
7. **Enable TanStack Router auto code splitting** if not already active
8. **Consider pre-compression** if self-hosting

## Bundle Analysis Tools

Add to your workflow:

```ts
// vite.config.ts (dev only)
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

Or use `vite-bundle-analyzer` for a lighter alternative.

## Expected Impact

| Technique                  | Estimated Reduction               |
| -------------------------- | --------------------------------- |
| Oxc minification (default) | ~60-70% from source               |
| Console/debugger removal   | ~1-5%                             |
| Vendor chunk splitting     | Better caching, not smaller total |
| Route-based code splitting | 40-70% smaller initial load       |
| Gzip compression           | ~60-80% from minified             |
| Brotli compression         | ~70-85% from minified             |

**The biggest wins come from code splitting, not minification.** Minification is already handled by Vite defaults. Focus effort on splitting routes and auditing dependencies.

## Sources

- [Vite 8 Build Options](https://vite.dev/config/build-options) — official docs
- [Vite 8 + Rolldown Migration Guide](https://www.nexgismo.com/blog/vite-8-rolldown-migration-guide-2026) — architecture details
- [Oxc Minifier Configuration](https://github.com/vitejs/vite/discussions/22767) — rolldownOptions.output.minify
- [TanStack Router Code Splitting](https://tanstack.com/router/latest/docs/guide/code-splitting) — auto code splitting
- [Minification Benchmarks](https://github.com/privatenumber/minification-benchmarks) — Terser vs esbuild vs Oxc
- [vite-bundle-analyzer](https://github.com/nonzzz/vite-bundle-analyzer) — bundle visualization
