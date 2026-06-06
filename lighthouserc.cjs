// lighthouserc.js — Lighthouse CI config (repo root)
// Phase 5 / Plan 05-01 (D-05 / HARD-02): mobile Lighthouse budget enforced in CI.
//
// Audits the PRODUCTION build (vite build → build/) served by `vite preview` on port 4173
// — NOT the dev server (Pitfall 1: dev build is unminified → Performance always fails).
//
// minScore 0.8 encodes HARD-02's ">80" (Lighthouse scores are 0–1).
// aggregationMethod 'optimistic' takes the best of numberOfRuns → reduces runner-jitter flake.
//
// Public routes only: /candidato/perfil is auth-gated; auditing it would need a brittle
// LHCI puppeteer login script. Perfil perf is covered by the D-01 manual smoke (05-RESEARCH §Q2 / A2).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:', // Vite preview prints "Local:   http://localhost:4173/"
      url: [
        'http://localhost:4173/auth/login',
        'http://localhost:4173/cadastro',
        'http://localhost:4173/vagas',
      ],
      numberOfRuns: 3,
      settings: {
        // mobile is the DEFAULT preset (Moto-G4-class throttling) — HARD-02 is "mobile > 80".
        // Leave preset unset for mobile.
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
        'categories:accessibility': ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
