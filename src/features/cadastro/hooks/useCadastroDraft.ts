/**
 * Hook para persistência de rascunho do cadastro candidato em sessionStorage.
 *
 * Features:
 * - save(data): grava em sessionStorage, REMOVENDO senha/confirmar_senha por LGPD
 * - load(): recupera rascunho salvo (null se ausente ou inválido)
 * - clear(): apaga o rascunho
 *
 * PII safety (D-13):
 * - sessionStorage (não localStorage) — morre com o fecho da aba, compatível com LGPD
 * - senha/confirmar_senha NUNCA são gravados, mesmo que venham no payload
 *
 * @module useCadastroDraft
 */

import { useCallback } from 'react'
import { CADASTRO_DRAFT_KEY } from '../constants'
import type { CandidatoFormData } from '../types'

type DraftPayload = Partial<CandidatoFormData> & { _savedAt?: number }

export interface UseCadastroDraftReturn {
  save: (data: Partial<CandidatoFormData>) => void
  load: () => Partial<CandidatoFormData> | null
  clear: () => void
}

export function useCadastroDraft(): UseCadastroDraftReturn {
  const save = useCallback((data: Partial<CandidatoFormData>) => {
    try {
      const safe: DraftPayload = {
        ...data,
        dadosPessoais: data.dadosPessoais
          ? { ...data.dadosPessoais }
          : undefined,
        _savedAt: Date.now(),
      }
      if (safe.dadosPessoais) {
        delete (safe.dadosPessoais as Record<string, unknown>).senha
        delete (safe.dadosPessoais as Record<string, unknown>).confirmar_senha
      }
      sessionStorage.setItem(CADASTRO_DRAFT_KEY, JSON.stringify(safe))
    } catch (err) {
      console.warn('[useCadastroDraft] save failed', err)
    }
  }, [])

  const load = useCallback((): Partial<CandidatoFormData> | null => {
    try {
      const raw = sessionStorage.getItem(CADASTRO_DRAFT_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as DraftPayload
      const { _savedAt: _omit, ...rest } = parsed
      void _omit
      return rest as Partial<CandidatoFormData>
    } catch {
      return null
    }
  }, [])

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(CADASTRO_DRAFT_KEY)
    } catch (err) {
      console.warn('[useCadastroDraft] clear failed', err)
    }
  }, [])

  return { save, load, clear }
}
