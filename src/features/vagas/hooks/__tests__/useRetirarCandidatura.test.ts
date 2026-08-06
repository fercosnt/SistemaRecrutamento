/**
 * Phase 45 / Plano 45-12 Task 2 (TDD RED) — o lado cliente da retirada (ERASE-05).
 *
 * ── O TERCEIRO DEFEITO MEDIDO PELO 45-12, E POR QUE ELE PRECISA DE TESTE ────
 * O `COMMENT` de `retirar_candidatura` (`20260805000007:207-211`) manda a Edge
 * Function traduzir `22023` para **400 VALIDATION com código próprio**, e o campo
 * `motivo` é onde esse código vive (Invariante 12: domínio viaja no motivo, transporte
 * viaja no `error_code`). Mas o `traduzirErro` deste hook casava contra `error_code`,
 * que **jamais** carregará `CANDIDATURA_NAO_RETIRAVEL`: o vocabulário de `ErrorCode`
 * da EF tem CINCO valores fechados e nenhum é ele.
 *
 * O efeito medido: toda recusa LEGÍTIMA — uma candidatura já decidida — caía no
 * `default` e virava `SERVER_ERROR`. Erro de servidor onde não há erro de servidor
 * nenhum, na tela de quem só quer sair de uma vaga.
 *
 * ── AS DUAS ASSERÇÕES QUE IMPORTAM ─────────────────────────────────────────
 *  (a) a recusa de domínio chega como `NAO_RETIRAVEL` — hoje ela falha;
 *  (b) um motivo DESCONHECIDO continua degradando para `SERVER_ERROR`, e nada de
 *      SQLSTATE, HTTP ou nome de tabela alcança a tela. O fallback TOTAL é o que
 *      impede a leitura do motivo de virar um vazamento de transporte.
 *
 * ⚠ O mock de `@/lib/supabase/client` vem ANTES do import do hook: o client valida
 * `VITE_SUPABASE_*` no topo do módulo (idioma de `exportacaoService.test.ts:38-48`).
 *
 * @see supabase/functions/executar-direito-titular/index.ts (a EF que responde)
 * @see supabase/migrations/20260805000007_p45_retirada_e_evento.sql (a RPC e o 22023)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}))

import {
  invocarRetirarCandidatura,
  RetirarCandidaturaError,
} from '../useRetirarCandidatura'

const CANDIDATURA_ID = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee'
const ENCERRADA_EM = '2026-08-06T11:15:00.000Z'

/** A forma de recusa que `functions.invoke` devolve: corpo lido UMA vez por `context`. */
function recusa(corpo: Record<string, unknown>) {
  return {
    data: null,
    error: {
      message: 'Edge Function returned a non-2xx status code',
      context: { json: async () => corpo },
    },
  }
}

async function capturar(): Promise<RetirarCandidaturaError> {
  try {
    await invocarRetirarCandidatura(CANDIDATURA_ID)
  } catch (e) {
    return e as RetirarCandidaturaError
  }
  throw new Error('a chamada deveria ter lançado')
}

describe('invocarRetirarCandidatura', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
  })

  it('(a) recusa de domínio: motivo CANDIDATURA_NAO_RETIRAVEL vira NAO_RETIRAVEL', async () => {
    // ⚠ O código de DOMÍNIO viaja no `motivo`; o `error_code` carrega só o vocabulário
    // fechado de TRANSPORTE. Casar contra o campo errado fazia toda recusa legítima
    // virar SERVER_ERROR.
    mocks.invoke.mockResolvedValue(
      recusa({ ok: false, error_code: 'VALIDATION', motivo: 'CANDIDATURA_NAO_RETIRAVEL' }),
    )
    const erro = await capturar()
    expect(erro).toBeInstanceOf(RetirarCandidaturaError)
    expect(erro.code).toBe('NAO_RETIRAVEL')
  })

  it('(b) motivo desconhecido degrada para SERVER_ERROR, sem vazar transporte', async () => {
    for (const motivo of ['MOTIVO_QUE_NAO_EXISTE', '', undefined, 42, null]) {
      mocks.invoke.mockResolvedValue(
        recusa({ ok: false, error_code: 'SERVER_ERROR', motivo }),
      )
      const erro = await capturar()
      expect(erro.code).toBe('SERVER_ERROR')
      // Fallback TOTAL: nada de SQLSTATE, HTTP ou nome de tabela na mensagem.
      expect(erro.message).toBe('server_error')
    }
  })

  it('(b2) nem SQLSTATE, nem status HTTP, nem nome de tabela atravessam para a tela', async () => {
    mocks.invoke.mockResolvedValue(
      recusa({
        ok: false,
        error_code: 'SERVER_ERROR',
        motivo: 'erro em candidaturas: SQLSTATE 22023 (HTTP 400)',
      }),
    )
    const erro = await capturar()
    expect(erro.code).toBe('SERVER_ERROR')
    for (const proibido of ['22023', 'HTTP', 'candidaturas', '400']) {
      expect(erro.message).not.toContain(proibido)
    }
  })

  it('(c) FORBIDDEN continua vindo do vocabulário fechado de transporte', async () => {
    // O id de outra pessoa é recusado NO BANCO (`v_dono IS DISTINCT FROM v_uid` →
    // 42501 → 403), e `FORBIDDEN` É um dos cinco valores de `ErrorCode`.
    mocks.invoke.mockResolvedValue(recusa({ ok: false, error_code: 'FORBIDDEN' }))
    const erro = await capturar()
    expect(erro.code).toBe('FORBIDDEN')
  })

  it('(d) caminho feliz: envia a ação e o id, e resolve sem lançar', async () => {
    mocks.invoke.mockResolvedValue({
      data: { ok: true, acao: 'retirar_candidatura', encerrada_em: ENCERRADA_EM },
      error: null,
    })
    await expect(invocarRetirarCandidatura(CANDIDATURA_ID)).resolves.toBeUndefined()
    expect(mocks.invoke).toHaveBeenCalledWith('executar-direito-titular', {
      body: { acao: 'retirar_candidatura', candidatura_id: CANDIDATURA_ID },
    })
  })

  it('(e) erro de transporte SEM corpo legível → NETWORK, nunca o erro cru', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })
    const erro = await capturar()
    expect(erro.code).toBe('NETWORK')
    expect(erro.message).not.toContain('Failed to fetch')
  })

  it('(f) resposta sem ok:true → SERVER_ERROR (não lançou não é completou)', async () => {
    for (const data of [null, {}, { ok: false }, { ok: 'true' }]) {
      mocks.invoke.mockResolvedValue({ data, error: null })
      const erro = await capturar()
      expect(erro.code).toBe('SERVER_ERROR')
    }
  })
})
