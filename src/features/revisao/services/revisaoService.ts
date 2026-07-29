/**
 * revisaoService — a camada de dados da fila de revisão de decisão do RH
 * (REVISAO-02 · REVISAO-03 · REVISAO-05, LGPD Art. 20).
 *
 * ⚠ ESCOPO DESTA WAVE: este arquivo nasce com **apenas as partes puras** — o contrato
 * de erro, a allowlist de colunas e o formatador do contador. Ele NÃO importa o cliente
 * Supabase nesta wave: os leitores entram no plano 42-09 e a mutation no 42-10. Nenhuma
 * função aqui faz rede.
 *
 * ── INVARIANTES QUE ESTE MÓDULO CARREGA ───────────────────────────────────────
 *
 *  1. ALLOWLIST EXPLÍCITA, SEMPRE. A projeção da fila é uma lista de colunas nomeadas
 *     (`FILA_REVISAO_COLUNAS`), nunca uma projeção-estrela. RLS é row-level e **não
 *     esconde coluna** ([[reference_select_star_leaks_pii]] — a lição do vazamento
 *     LGPD da Phase 8, reincidente na Phase 24 / CR-01): uma coluna lida e nunca usada
 *     ainda assim trafega pela rede e fica visível no DevTools.
 *
 *  2. A JUSTIFICATIVA ORIGINAL DO RECRUTADOR FICA FORA DA FILA. `decisao_final.
 *     justificativa` é texto livre ≥50 caracteres digitado à mão, e **BD-9 está em
 *     aberto** (redigir ou preservar — pode conter PII digitada à mão). A fila mostra
 *     as 6 colunas de linha travadas em D-P42-05 + ação, e nenhuma delas é essa.
 *     `revisao_resultado` é outra coisa (ver a nota na constante).
 *
 *  3. A IDENTIDADE DO REVISOR NUNCA VAI AO CLIENTE DO CANDIDATO. `revisao_por_usuario`
 *     (uuid) existe para a trilha de auditoria no servidor; a transparência do Art. 20 é
 *     atendida pelo CONTEÚDO da revisão, não pela identificação nominal de quem revisou.
 *
 * @module features/revisao/services/revisaoService
 * @see src/features/explicacao/services/explicacaoService.ts (o molde: allowlist nomeada + classe de erro)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-RESEARCH.md (§Pattern 3 — SQLSTATE → code · §Pitfall 8)
 */

/**
 * Erro de domínio da revisão, na forma `camelCaseService.ts` do projeto (CLAUDE.md),
 * espelhando `ExplicacaoServiceError`.
 *
 * `code` é o que a UI consome para escolher a apresentação — e é deliberadamente
 * pequeno (3 valores), porque a 42-UI-SPEC só distingue três tratamentos:
 * recusa-do-guard (alerta inline, **sem retry oferecido**), validação e genérico.
 */
export class RevisaoError extends Error {
  constructor(
    message: string,
    public code: 'GUARD_DECISOR' | 'VALIDACAO' | 'DESCONHECIDO',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'RevisaoError'
  }
}

/**
 * Traduz um erro cru vindo da RPC `responder_revisao_decisao` no `RevisaoError` que a
 * UI sabe apresentar. Total: qualquer entrada (inclusive `null`) resolve para um
 * `RevisaoError`, nunca lança.
 *
 * ⚠ POR QUE O `42501` É DISCRIMINADO PELA **MENSAGEM**, e não só pelo SQLSTATE:
 * o servidor levanta `42501` para DUAS recusas semanticamente distintas —
 *   (i)  "não é RH / não tem escopo na vaga"  → erro genérico, retry faz sentido;
 *   (ii) "é o decisor desta decisão" (guard REVISAO-05) → copy própria, e a UI-SPEC
 *        exige **não oferecer retry** (tentar de novo nunca vai funcionar: a recusa é
 *        sobre QUEM é o usuário, não sobre o estado do pedido).
 * O SQLSTATE sozinho não separa os dois casos, e a UI não pode adivinhar. A
 * discriminação por mensagem é o idioma que os smokes do projeto já usam para separar
 * dois usos do mesmo `22023` (`funil01_pontuar_sjt_smokes.sql:149,171`).
 */
export function classificarErroRevisao(error: unknown): RevisaoError {
  const code = (error as { code?: string } | null | undefined)?.code ?? ''
  const message = (error as { message?: string } | null | undefined)?.message ?? ''

  if (code === '42501') {
    // O predicado load-bearing: só a mensagem separa o guard do 42501 genérico.
    if (/decisor/i.test(message)) {
      return new RevisaoError(
        'Quem registrou esta decisão não pode responder à revisão dela. Encaminhe a outro membro do RH.',
        'GUARD_DECISOR',
        error,
      )
    }
    return new RevisaoError(
      'Não foi possível responder à revisão. Tente novamente.',
      'DESCONHECIDO',
      error,
    )
  }

  // Validação de payload / alcançabilidade. `P0002` é o SQLSTATE numérico de
  // `no_data_found`; o PostgREST pode devolver qualquer um dos dois (mesmo par já
  // tratado em `explicacaoService.solicitarRevisao`).
  if (code === '22023' || code === 'no_data_found' || code === 'P0002') {
    return new RevisaoError(
      'Não foi possível registrar esta resposta. Revise os dados e tente novamente.',
      'VALIDACAO',
      error,
    )
  }

  return new RevisaoError(
    'Não foi possível responder à revisão. Tente novamente.',
    'DESCONHECIDO',
    error,
  )
}

/**
 * As colunas que a fila de revisão projeta — o espelho CLIENTE do `RETURNS TABLE` de
 * `listar_revisoes_decisao`. Quem realmente impõe o contrato é o servidor; esta
 * constante é o que TRAVA a expectativa e o que o snapshot de chaves compara, de modo
 * que uma coluna acrescentada no servidor sem revisão de privacidade quebre um teste
 * antes de chegar à tela.
 *
 * São as 6 colunas de linha travadas em D-P42-05 (candidato · vaga · decisão original ·
 * quem decidiu · desde quando espera · estado) mais as chaves de estado que a linha
 * precisa para se desenhar.
 *
 * ⚠ NOTA OBRIGATÓRIA SOBRE `revisao_resultado` — são DUAS colunas diferentes, e
 * confundi-las é o vazamento do Pitfall 8:
 *   · `revisao_resultado` (AQUI, permitida) = a resposta que o RH escreveu **para o
 *     candidato**. A fila só a exibe no modo "Ver resposta". É conteúdo destinado a
 *     sair do sistema.
 *   · `decisao_final.justificativa` (FORA desta lista) = o texto INTERNO do recrutador
 *     que fundamentou a decisão original. Nunca foi escrito para ser lido por ninguém
 *     além do RH, BD-9 segue em aberto, e ela não entra na fila.
 *
 * Também FORA, por invariante 3: `revisao_por_usuario` (o uuid do revisor).
 */
export const FILA_REVISAO_COLUNAS = [
  'candidatura_id',
  'candidato_nome',
  'vaga_titulo',
  'decisao',
  'decidido_por_nome',
  'revisao_solicitada_em',
  'revisao_respondida_em',
  'revisao_veredito',
  'revisao_resultado',
  'respondida_por_nome',
  'pode_responder',
] as const

/** O tipo das chaves projetadas pela fila (derivado da allowlist, nunca duplicado). */
export type ColunaFilaRevisao = (typeof FILA_REVISAO_COLUNAS)[number]

/**
 * Formata a contagem de revisões pendentes para o badge da `RHSidebar`.
 *
 * ⚠ POR QUE O CONTRATO DEVOLVE `undefined` E NÃO UM NÚMERO — é mecânico, não
 * estilístico: o consumidor em `RHSidebar.tsx:241` avalia `item.badge && item.badge > 0`.
 * Em JS, `0 && …` curto-circuita para `0` — e o React **renderiza `0` como texto**. Um
 * contador zerado (ou ainda carregando) apareceria como um "0" solto no menu. Devolver
 * `undefined` faz o badge sumir de verdade.
 *
 * Contrato: some em ausente / não finito / `<= 0`; exato de 1 a 99; `'99+'` acima.
 */
export function formatarBadgePendentes(
  n: number | null | undefined,
): string | undefined {
  if (n === null || n === undefined) return undefined
  if (!Number.isFinite(n)) return undefined
  if (n <= 0) return undefined
  if (n > 99) return '99+'
  return String(n)
}

/** Export namespaced (convenção `camelCaseService`). */
export const revisaoService = {
  classificarErroRevisao,
  formatarBadgePendentes,
}
