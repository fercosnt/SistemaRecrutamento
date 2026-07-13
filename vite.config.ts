
  import { defineConfig } from 'vite';
  import { configDefaults } from 'vitest/config';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./tests/setup.ts'],
      include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
      // Deno Edge-Function / script tests import via `https://deno.land`, `npm:`
      // and `https://esm.sh` specifiers that the Node/Vitest ESM loader cannot
      // resolve — they run under `deno test`, not Vitest. Exclude them here so
      // `npm run test:run` stays green. (strict-schema.test.ts is a Vitest
      // source-text probe — NOT a Deno test — so it is intentionally kept.)
      exclude: [
        ...configDefaults.exclude,
        'scripts/**',
        'supabase/functions/**/ai-client.test.ts',
        'supabase/functions/**/ai-cost.test.ts',
        'supabase/functions/**/circuit-breaker.test.ts',
        'supabase/functions/**/injection-detector.test.ts',
        'supabase/functions/**/pii-masker.test.ts',
        // Phase 10 EF integration tests (Deno, https:// specifiers — run under `deno test`,
        // not Vitest; their RED scaffolds landed in 10-01 and were left out of this list).
        'supabase/functions/analise-candidato-individual/**/*.test.ts',
        'supabase/functions/comparativo-candidatos/**/*.test.ts',
        // Phase 11 EF integration test (Deno, https:// specifiers — run under `deno test`,
        // not Vitest; RED scaffold landed in 11-01, impl in the Phase-11 EF wave).
        'supabase/functions/avaliar-redacao/**/*.test.ts',
        // Phase 18 / Plan 18-02 (RESIL-02): the bigfive devolutiva Deno test moved
        // into __tests__/ (matching the _shared/__tests__/ convention). It uses
        // https://deno.land + npm: specifiers → run under `deno test`, not Vitest.
        'supabase/functions/gerar-devolutiva-bigfive/**/*.test.ts',
        // Phase 18 post-merge gate: two Deno `__tests__/` tests using https://deno.land
        // specifiers were never added to this list (essay-schemas from Phase 13;
        // consolidar-decisao-final golden test from Phase 15, extended by 18-03 FIX-01).
        // They run under `deno test`, not Vitest → exclude to keep `npm run test:run` green.
        'supabase/functions/_shared/__tests__/essay-schemas.test.ts',
        'supabase/functions/consolidar-decisao-final/**/*.test.ts',
        // Phase 23 (AI stack revival): three new Deno-only `_shared/__tests__/` tests using
        // npm:/https:// specifiers → run under `deno test`, not Vitest. NOT a broad
        // `_shared/__tests__/**` glob because strict-schema.test.ts in the same dir is a
        // Vitest-only Node probe that must keep running under Vitest.
        'supabase/functions/_shared/__tests__/prompt-loader.test.ts',
        'supabase/functions/_shared/__tests__/prompt-catch.test.ts',
        'supabase/functions/_shared/__tests__/cost-alerter-messages.test.ts',
        // Phase 28 (gestão de usuários RH): the gerenciar-usuario-rh EF handler
        // test uses https:// specifiers (Deno) → run under `deno test`, not Vitest.
        'supabase/functions/gerenciar-usuario-rh/**/*.test.ts',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      // NOTE: `sonner@2.0.3` alias REMOVED in fix(02-06): Vite's optimizeDeps
      // fingerprints aliased specifiers as DISTINCT pre-bundle entries. The
      // cache ends up with both `sonner.js` and `sonner@2__0__3.js`, each
      // producing a separate ES module instance with its own internal
      // ToastState singleton. The Toaster in App.tsx subscribed to one
      // instance while `toast.info(...)` calls from versioned-specifier pages
      // wrote into the other, so toasts never rendered. Fix: rewrite every
      // `from 'sonner@2.0.3'` import to `from 'sonner'` and drop the alias.
      // `resolve.dedupe: ['sonner']` enforces a single copy as belt+braces.
      dedupe: ['sonner'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/ce81f0d7520a337fc357fae4f5f7bf76164b8c05.png': path.resolve(__dirname, './src/assets/ce81f0d7520a337fc357fae4f5f7bf76164b8c05.png'),
        'figma:asset/a81ed2cde200cdf4e82689faaeafaceff5cd291a.png': path.resolve(__dirname, './src/assets/a81ed2cde200cdf4e82689faaeafaceff5cd291a.png'),
        'figma:asset/91b67d31b9aa67c340ac4a375a9832d8c0284448.png': path.resolve(__dirname, './src/assets/91b67d31b9aa67c340ac4a375a9832d8c0284448.png'),
        'figma:asset/8daad5a957d595d21d69bb8a7bc7e3ab794be41a.png': path.resolve(__dirname, './src/assets/8daad5a957d595d21d69bb8a7bc7e3ab794be41a.png'),
        'figma:asset/72212e27083bc5aff34e367036bc5f1a36b908b7.png': path.resolve(__dirname, './src/assets/72212e27083bc5aff34e367036bc5f1a36b908b7.png'),
        'figma:asset/5feab6fe2a4e5e85a5b01894d30667ea3a06a9d0.png': path.resolve(__dirname, './src/assets/5feab6fe2a4e5e85a5b01894d30667ea3a06a9d0.png'),
        'figma:asset/4ae5e44e01d12f3447c7a4e50527f0bc3c3aab25.png': path.resolve(__dirname, './src/assets/4ae5e44e01d12f3447c7a4e50527f0bc3c3aab25.png'),
        'figma:asset/3fc028ae080bb7435c5ebf8f1e62a8036e20c73c.png': path.resolve(__dirname, './src/assets/3fc028ae080bb7435c5ebf8f1e62a8036e20c73c.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      rollupOptions: {
        output: {
          // PERF-03 (Plan 19-02): NARROW react-vendor chunk only. Keep react +
          // react-dom + react-router(-dom) + scheduler together so the whole-app
          // init libs share ONE long-lived, cacheable chunk. Everything else falls
          // through (return undefined) → Rollup auto-chunks the lazy /rh/* + /admin/*
          // route imports and @radix-ui. A BROAD `node_modules → vendor` branch is
          // FORBIDDEN: it re-triggers the prod-only "Cannot access X before
          // initialization" circular-init blank screen (19-RESEARCH Pitfall 1).
          manualChunks(id: string) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'react-vendor'
            }
          },
        },
      },
    },
    server: {
      port: 3003,
      open: true,
    },
  });