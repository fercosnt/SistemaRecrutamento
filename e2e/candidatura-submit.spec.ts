/**
 * E2E Tests — Candidatura Submit Flow (Phase 4 / CAND-01, CAND-02, CAND-03, CAND-04)
 *
 * Wave 0 STUB — fleshed out in Plan 04-08.
 * Covers: form rendering + CV upload validation + happy submit + duplicate block + Sonner DOM contract.
 */
import { test } from '@playwright/test'

test.describe('Candidatura Submit (Wave 0 stub — Plan 04-08)', () => {
  test.fixme('B-J06: form renders vaga summary + CV upload + perguntas + submit (Plan 04-08)', async () => {})
  test.fixme('B-J07: upload .docx → inline error "Apenas arquivos PDF" (Plan 04-08)', async () => {})
  test.fixme('B-J08: upload 6MB PDF → inline error "no máximo 5 MB" (Plan 04-08)', async () => {})
  test.fixme('B-J09: successful submit → toast.success + navigate /candidato/perfil (Plan 04-08, env-gated)', async () => {})
  test.fixme('B-J10: re-submit (duplicate) → toast.error "já se candidatou" (Plan 04-08, env-gated)', async () => {})
  test.fixme('B-J11: Sonner DOM contract — candidatura toast appears in Notifications region (Plan 04-08)', async () => {})
})
