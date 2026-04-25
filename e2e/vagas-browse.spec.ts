/**
 * E2E Tests — Vagas Public Browse Flow (Phase 4 / VAGA-01, VAGA-02, VAGA-03)
 *
 * Wave 0 STUB — fleshed out in Plan 04-08.
 * Covers: anon visits /vagas → /vagas/:slug → 404 state for unknown slug
 * → Candidatar-se redirect to /auth/login?redirect=...
 */
import { test } from '@playwright/test'

test.describe('Vagas Public Browse (Wave 0 stub — Plan 04-08)', () => {
  test.fixme('B-J01: anon visits /vagas and sees ≥ 1 active vaga (Plan 04-08)', async () => {})
  test.fixme('B-J02: anon clicks vaga card → arrives at /vagas/:slug (Plan 04-08)', async () => {})
  test.fixme('B-J03: anon on /vagas/:slug clicks Candidatar-se → /auth/login?redirect=... (Plan 04-08)', async () => {})
  test.fixme('B-J04: after login, lands on /candidato/candidatura/formulario/:slug (Plan 04-08)', async () => {})
  test.fixme('B-J05: /vagas/<invalid-slug> shows VagaNotFoundState with copy "Vaga não encontrada ou não está mais ativa" (Plan 04-08)', async () => {})
})
