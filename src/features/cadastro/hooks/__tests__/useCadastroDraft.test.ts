/**
 * Testes para useCadastroDraft (Wave 0 — stubs)
 *
 * Cobertura planejada (Phase 2 Plan 02-04):
 * - save() remove senha/confirmar_senha antes de serializar
 * - load() retorna null quando chave ausente
 * - load() retorna objeto parseado sem metadata _savedAt
 * - clear() chama sessionStorage.removeItem(CADASTRO_DRAFT_KEY)
 * - Falha de serialização (quota) loga warning mas não lança
 */
import { describe, it } from 'vitest'

describe('useCadastroDraft', () => {
  it.todo('save() strips senha and confirmar_senha before JSON.stringify')
  it.todo('load() returns null when sessionStorage key is absent')
  it.todo('load() returns parsed draft excluding _savedAt metadata')
  it.todo('clear() calls sessionStorage.removeItem("cadastro:draft:v1")')
  it.todo('save() handles serialization failure (quota) without throwing')
})
