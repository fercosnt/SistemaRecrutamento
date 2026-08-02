/**
 * privacidadeService — a camada de dados de `/candidato/privacidade` (CONSENT-04 / RETEN-03).
 *
 * Clona a postura do `explicacaoService` (leitura own-row por allowlist nomeada + classe
 * de erro própria + nenhum erro cru de transporte cruzando para a tela). O que é
 * genuinamente load-bearing aqui:
 *
 *  - **ALLOWLIST NOMEADA, NUNCA `select('*')`.** `public.autorizacoes` carrega
 *    `ip_aceite` e `user_agent_aceite` — PII do ato de aceite, guardada como prova, sem
 *    razão nenhuma para chegar ao navegador do titular. RLS é ROW-level e **não** filtra
 *    coluna ([[reference_select_star_leaks_pii]], a lição do vazamento da Phase 8): uma
 *    projeção estrelada seria own-row e ainda assim vazaria as duas colunas, visíveis no
 *    DevTools. As 7 colunas de `AUTORIZACOES_ALLOWLIST` são o contrato.
 *
 *  - **A LINHA MAIS RECENTE, E PELO MESMO CRITÉRIO DO BANCO.** A FK
 *    `autorizacoes_candidato_id_fkey` **não** é UNIQUE, então a tabela é estruturalmente
 *    1:N por candidato. A leitura ordena por `created_at DESC, id DESC LIMIT 1` — a MESMA
 *    expressão de `public.pode_receber_marketing()` (migration `20260801000003`, viva em
 *    PROD), incluindo o desempate por `id` para linhas com o mesmo `created_at`.
 *    Divergir daquela ordenação faria a tela AFIRMAR um estado que o guard do banco NÃO
 *    aplica — a classe de defeito que este milestone inteiro combate.
 *
 *    ⚠ MEDIÇÃO DO VIVO (checkpoint 43-07, 2026-08-02): hoje `autorizacoes` tem **17
 *    linhas para 21 candidatos** e **zero candidato com mais de uma linha** — na prática
 *    1:1. Ou seja, a ordenação é hoje um no-op observável, e é exatamente por isso que
 *    ela está escrita: no dia em que a segunda linha existir, a tela e o guard já
 *    concordarão sem que ninguém precise lembrar. Os 4 candidatos SEM linha nenhuma são
 *    o registro honesto de 4 falhas do `INSERT` best-effort antigo (BD-4, sem backfill —
 *    consentimento retroativo é fabricar prova) e caem no caminho `null` desta função.
 *
 *  - **ESCRITA OWN-ROW DIRETA, SEM RPC NOVA.** A policy `Candidatos podem atualizar suas
 *    autorizacoes` (UPDATE, com `qual` **e** `with_check`) foi medida viva em
 *    `pg_policies` em 2026-08-01 e reconfirmada no apply de 2026-08-02. O `with_check` é
 *    o que impede o candidato de reapontar a própria linha para outro `candidato_id`, e
 *    é por isso que uma RPC `SECURITY DEFINER` nova seria superfície de ataque
 *    acrescentada sem ganho. A escrita devolve a linha atualizada **pela mesma
 *    allowlist**, e é esse retorno — nunca o valor desejado — que alimenta a tela.
 *
 *    ⚠ MAS A POLICY NÃO É A ÚNICA DEFESA, e não podia ser (WR-06): as 3 policies vivas
 *    desta tabela existem em PROD e em arquivo nenhum. `revogarMarketing` escopa a
 *    escrita por `id` **e** por `candidato_id`, então continua correta mesmo se a
 *    policy for perdida num reset ou reconstruída com o `with_check` errado. E as
 *    COLUNAS escrivíveis já não dependem de policy alguma: `20260802000001` deixou
 *    `authenticated` com UPDATE apenas em `autorizacao_marketing_vagas` e `updated_at`
 *    (CR-01) — a prova de consentimento deixou de ser escrivível pelo titular.
 *
 *  - **NENHUM ERRO CRU ECOADO.** `42501`/`403` viram `FORBIDDEN`; qualquer outra falha
 *    vira `DATABASE_ERROR` com mensagem própria. A mensagem do transporte fica em
 *    `details`, para o console, nunca para a interface.
 *
 * @module features/privacidade/services/privacidadeService
 * @see src/features/explicacao/services/explicacaoService.ts (o molde: allowlist + classe de erro)
 * @see supabase/migrations/20260801000003_p43_guard_marketing.sql (pode_receber_marketing — a MESMA semântica de "qual linha vale")
 */
import { supabase } from '@/lib/supabase/client'

/** Erro de serviço no padrão `camelCaseService.ts` (CLAUDE.md). */
export class PrivacidadeError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'FORBIDDEN'
      | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'PrivacidadeError'
  }
}

/**
 * Allowlist EXPLÍCITA e NOMEADA das 7 colunas que o navegador do candidato pode ver.
 * NUNCA `select('*')` — ver o docblock do módulo. As colunas de PII do ato de aceite
 * ficam deliberadamente FORA, e a asserção que prova isso é negativa (caso (g) da suíte
 * da Task 1 e caso (e) da suíte da Task 3): uma exclusão só sobrevive se for testada.
 */
export const AUTORIZACOES_ALLOWLIST =
  'id, autorizacao_uso_dados, autorizacao_marketing_vagas, autorizacao_retencao_curriculo, consent_text_version, created_at, updated_at'

/**
 * Allowlist da leitura de candidatura usada SÓ para saber se há currículo guardado.
 * `curriculo_url` é lida para responder "existe?" e **nunca** renderizada nem seguida:
 * a tela do titular não precisa do link para dizer a verdade sobre a guarda.
 */
export const CANDIDATURA_CURRICULO_ALLOWLIST = 'id, curriculo_url, created_at'

/** A linha de autorizações que atravessa para a tela — sem nenhuma coluna de PII de aceite. */
export interface AutorizacoesCandidato {
  id: string
  autorizacao_uso_dados: boolean
  autorizacao_marketing_vagas: boolean | null
  autorizacao_retencao_curriculo: boolean
  consent_text_version: string | null
  created_at: string
  updated_at: string
}

/** O que a seção "O que guardamos e por quê" precisa saber sobre o currículo. */
export interface GuardaCurriculo {
  temCurriculo: boolean
}

/** Traduz o erro do PostgREST sem jamais deixar a mensagem crua chegar à interface. */
function traduzirErro(erro: unknown, mensagem: string): PrivacidadeError {
  const code = (erro as { code?: string })?.code ?? ''
  const status = (erro as { status?: number })?.status
  if (code === '42501' || status === 403) {
    return new PrivacidadeError(mensagem, 'FORBIDDEN', erro)
  }
  return new PrivacidadeError(mensagem, 'DATABASE_ERROR', erro)
}

/**
 * Lê a linha de autorizações MAIS RECENTE do próprio candidato, own-row, por allowlist.
 * Devolve `null` quando não há linha nenhuma — os 4 candidatos da BD-4. Ausência é
 * ausência: esta função **nunca** cria linha, porque criar seria registrar um
 * consentimento que ninguém deu.
 */
export async function obterAutorizacoes(
  candidatoId: string,
): Promise<AutorizacoesCandidato | null> {
  if (!candidatoId) {
    throw new PrivacidadeError('candidatoId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('autorizacoes')
    .select(AUTORIZACOES_ALLOWLIST)
    .eq('candidato_id', candidatoId)
    // A MESMA ordenação de `pode_receber_marketing()` — ver o docblock do módulo.
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw traduzirErro(error, 'Não foi possível carregar suas autorizações.')
  }
  if (!data) return null

  return data as unknown as AutorizacoesCandidato
}

/**
 * Liga ou desliga o consentimento de divulgação de vagas por `UPDATE` own-row direto.
 *
 * As duas direções passam por aqui: o nome fala do caminho que motiva a tela, não de uma
 * restrição. A linha atualizada volta pela MESMA allowlist e é ela — não o valor pedido —
 * que a interface exibe (Invariante 5 da 43-UI-SPEC).
 *
 * ⚠ O `candidatoId` NÃO é decorativo e NÃO é redundância (code review WR-06). Sem ele o
 * escopo da escrita seria só `.eq('id', …)`, e a única coisa entre um candidato e a linha
 * de consentimento de OUTRO candidato seria o `with_check` da policy viva
 * `Candidatos podem atualizar suas autorizacoes` — que, medida em `pg_policies`, existe
 * em PROD e **em arquivo de migration nenhum** (4ª instância do drift em aberto,
 * `.planning/todos/pending/processo-origem-do-drift-desconhecida.md`). Um
 * `supabase db reset`, ou uma reconstrução de memória com o `with_check` errado, apagaria
 * a defesa inteira sem nada no cliente reclamar. O predicado aqui custa zero, sobrevive a
 * isso, e torna a intenção legível no sítio da chamada.
 */
export async function revogarMarketing(
  idAutorizacao: string,
  novoValor: boolean,
  candidatoId: string,
): Promise<AutorizacoesCandidato> {
  if (!idAutorizacao) {
    throw new PrivacidadeError('idAutorizacao é obrigatório', 'INVALID_INPUT')
  }
  if (!candidatoId) {
    throw new PrivacidadeError('candidatoId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('autorizacoes')
    .update({
      autorizacao_marketing_vagas: novoValor,
      // `autorizacoes` não tem trigger de `updated_at` (medido nas migrations do repo),
      // e é esta coluna que datará o rótulo "Desativado em …" na tela. Carimbá-la aqui é
      // o idioma vivo do projeto para esta tabela-família.
      updated_at: new Date().toISOString(),
    })
    .eq('id', idAutorizacao)
    // Defesa em profundidade: a policy que garantiria isto não está em arquivo nenhum.
    .eq('candidato_id', candidatoId)
    .select(AUTORIZACOES_ALLOWLIST)
    .single()

  if (error) {
    throw traduzirErro(error, 'Não foi possível salvar esta mudança.')
  }
  if (!data) {
    throw new PrivacidadeError(
      'Não foi possível salvar esta mudança.',
      'NOT_FOUND',
      { idAutorizacao },
    )
  }

  return data as unknown as AutorizacoesCandidato
}

/**
 * Responde a UMA pergunta: existe currículo guardado deste candidato?
 *
 * ⚠ NÃO filtra `deleted_at`. Uma candidatura removida de forma suave continua com o
 * arquivo no Storage — esta fase é zero-destrutiva por desenho e nenhuma rotina apaga
 * dado de candidato hoje. Esconder o currículo aqui faria a tela do titular negar a
 * existência de um arquivo que a empresa de fato guarda, que é a mentira oposta à que
 * este milestone existe para corrigir.
 */
export async function obterGuardaCurriculo(
  candidatoId: string,
): Promise<GuardaCurriculo> {
  if (!candidatoId) {
    throw new PrivacidadeError('candidatoId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('candidaturas')
    .select(CANDIDATURA_CURRICULO_ALLOWLIST)
    .eq('candidato_id', candidatoId)
    .not('curriculo_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw traduzirErro(error, 'Não foi possível carregar suas autorizações.')
  }

  return { temCurriculo: Boolean(data) }
}

/** Export nomeado do namespace (convenção `camelCaseService`). */
export const privacidadeService = {
  obterAutorizacoes,
  revogarMarketing,
  obterGuardaCurriculo,
}
