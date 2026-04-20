# Project Research Summary

**Project:** Sistema de Recrutamento Beauty Smile (ATS Hardening)
**Domain:** Applicant Tracking System -- brownfield security rebuild + candidate portal MVP
**Researched:** 2026-04-19
**Confidence:** HIGH

## Executive Summary

This is a brownfield React + Supabase ATS for a Brazilian dental clinic network (Beauty Smile) that has a critical security vulnerability: the Supabase `service_role` key is exposed in the client-side Vite bundle, rendering all 103 RLS policies meaningless. The dual auth store architecture (two Zustand stores listening to the same session) causes route protection bypass confirmed by 9/21 E2E test failures. The manually-maintained `database.types.ts` has drifted from the actual schema, causing 7+ silent runtime errors.

The recommended approach is a security-first rebuild in 5 phases. Phase 1 eliminates the service_role key from the browser by moving privileged operations to Supabase Edge Functions, unifies auth stores into a single role-aware store, automates type generation, and hardens RLS. Phases 2-5 then layer registration, job browsing, application flow, and profile/tracking features on the secure foundation. The existing UI (glass design system, shadcn/ui, multi-step forms) is largely reusable -- this is a hardening with targeted feature completion, not a rewrite.

## Key Findings

### Stack

The existing stack (React 18, React Router v6, Vite, TypeScript, Supabase, Zustand, Tailwind + shadcn/ui) is correct and should not change. The work is about fixing how the stack is used, not replacing it.

**Critical additions:**
- Supabase Edge Functions (Deno) -- security boundary for privileged operations
- Supabase Custom Access Token Hook -- injects `user_role` into JWT, eliminating per-request DB lookups
- Husky + lint-staged -- pre-commit `tsc --noEmit` to catch stale types
- Supabase CLI type generation -- replaces hand-edited `database.types.ts`

**Keep as-is:** React 18, React Router v6, Zustand v4, Vite, TanStack Query v5, RHF + Zod, shadcn/ui

**Remove:** `@supabase/auth-helpers-react` (unused Next.js package), `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env.local`

### Table Stakes Features (MVP Candidato)

- Unified auth (login, logout, password recovery, protected routes with role-based guards)
- Multi-step registration with CPF/email duplicate check, CEP auto-fill, LGPD consent, auto-login
- Public job listing and detail pages (no auth required)
- CV upload (PDF to Supabase Storage) + screening questions + duplicate application prevention
- Application status visibility on profile page
- Mobile-responsive layout (candidate persona is mobile-first)

### Architecture

Single unified Zustand auth store with role from JWT custom claims. Single `RoleGuard` component replaces dual guards. Edge Functions as security boundary (anon key only in browser). Feature-based folder structure migrated incrementally per phase.

**Build order:** Auth Store -> RoleGuard -> Routes -> Registration -> Job Browsing -> Application -> Profile

### Critical Pitfalls

1. **service_role in Vite bundle** -- full DB bypass for any visitor. Phase 1 day 1.
2. **Dual auth stores** -- candidatos can access RH pages. 9/21 E2E failures prove this.
3. **Big-bang auth migration** -- changing store shape invalidates sessions. Use Zustand `migrate`.
4. **Hand-edited database.types.ts** -- 7+ runtime bugs from schema drift. Automate generation.
5. **Anonymous RLS SELECT exposing PII** -- CPF enumeration via anon key. Move to Edge Function.

## Phase Structure Implications

| Phase | Focus | Dependency | Risk |
|-------|-------|------------|------|
| 1 | Security Foundation | None (root) | HIGH -- auth migration can break sessions |
| 2 | Registration | Phase 1 (auth) | MEDIUM -- Edge Function wiring |
| 3 | Job Discovery | Phase 1 (routes) | LOW -- public pages, no auth |
| 4 | Application Flow | Phase 1 + 3 | MEDIUM -- Storage + new tables |
| 5 | Profile + Hardening | Phase 1 + 4 | LOW -- standard reads |

## Research Flags

- **Phase 1 needs research:** Edge Function CORS, API key model status, RLS audit scope
- **Phase 4 needs research:** Storage bucket policies, screening question schema
- **Phases 2, 3, 5:** Standard patterns, skip deep research

## Gaps

- Supabase API key model: check if project uses legacy JWT or new publishable/secret keys
- 103 RLS policies not individually audited -- Phase 1 must include full audit
- Email notification infrastructure decision pending (Resend vs n8n vs Supabase)

---
*Research completed: 2026-04-19*
*Ready for requirements: yes*
