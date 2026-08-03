/**
 * revisaoService — a camada de dados da fila de revisão de decisão do RH
 * (REVISAO-02 · REVISAO-03 · REVISAO-05, LGPD Art. 20).
 *
 * ⚠ ESCOPO: o plano 42-03 criou aqui **apenas as partes puras** — o contrato de erro, a
 * allowlist de colunas e o formatador do contador. O plano 42-09 acrescentou os três
 * LEITORES (`listarFilaRevisoes`, `contarRevisoesPendentes`, `lerConfigSlaRevisao`), que
 * são a primeira dependência de rede deste módulo. O plano 42-10 fechou o módulo com o
 * único WRITE-PATH (`responderRevisao`).
 *
 * ── A INVARIANTE DE LEITURA DA FILA (por que RPC e não `.from().select()`) ─────
 *
 * A fila é lida **exclusivamente pela RPC `SECURITY DEFINER` `listar_revisoes_decisao`**,
 * nunca por PostgREST sobre a tabela da decisão com join. Duas razões independentes,
 * ambas medidas e não supostas (achado A-01 de `docs/compliance/achados-inventario.md`):
 *
 *   · `usuarios_rh` é **admin-only** desde a SEG-02. Um recrutador (`role = 'rh'` no JWT)
 *     leria no máximo a própria linha, então "quem decidiu" resolveria para nada em
 *     ~100% da fila dele e a tela mostraria "Não identificado" em toda linha — um
 *     defeito que pareceria dado faltando, não permissão faltando.
 *   · `decisao_final` **não é vaga-scoped**, enquanto `candidaturas` é. Um join no cliente
 *     produziria linhas-fantasma (decisões visíveis sem a candidatura correspondente).
 *
 * O escopo por vaga é reimplementado DENTRO do DEFINER (porque `SECURITY DEFINER` bypassa
 * RLS) e o `ORDER BY … ASC LIMIT 200` também é do servidor: a ordem e o corte são
 * contrato do banco, e o cliente nunca reordena nem repagina.
 *
 * ── INVARIANTES QUE ESTE MÓDULO CARREGA ───────────────────────────────────────
 *
 *  1. ALLOWLIST EXPLÍCITA, SEMPRE. A projeção da fila é uma lista de colunas nomeadas
 *     (`FILA_REVISAO_COLUNAS`), nunca uma projeção-estrela. RLS é row-level e **não
 *     esconde coluna** ([[reference_select_star_leaks_pii]] — a lição do vazamento
 *     LGPD da Phase 8, reincidente na Phase 24 / CR-01): uma coluna lida e nunca usada
 *     ainda assim trafega pela rede e fica visível no DevTools. Do lado do leitor de
 *     RPC isso vira `projetarLinhaFila`: a linha que sai deste módulo tem EXATAMENTE as
 *     chaves da allowlist, então uma coluna acrescentada no servidor sem revisão de
 *     privacidade não alcança a tela nem o cache do TanStack Query.
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
 * @see src/features/funil/services/funilKpisService.ts (o molde da chamada de RPC tipada)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-RESEARCH.md (§Pattern 3 — SQLSTATE → code · §Pitfall 8)
 */
import { supabase } from '@/lib/supabase/client'
import type { LimiaresSlaRevisao } from '../constants/slaRevisao'
import type { ResponderRevisaoFormValues } from '../schemas/responderRevisaoSchema'

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

/**
 * Uma linha da fila, do lado do cliente.
 *
 * ⚠ POR QUE ESTE TIPO É ESCRITO À MÃO e não derivado de `database.types.ts`: o gerador
 * do Supabase declara TODA coluna de um `RETURNS TABLE` como não-nula (`decidido_por_nome:
 * string`), porque a assinatura SQL não carrega nulidade. Na prática `decidido_por_nome`
 * É nulo quando não há correspondência em `usuarios_rh` — exatamente o caso que a tela
 * tem de resolver para "Não identificado" (invariante 4 da 42-UI-SPEC). Confiar no tipo
 * gerado aqui produziria um `.toUpperCase()` em `null` em produção com o compilador
 * calado. As chaves são as mesmas de `FILA_REVISAO_COLUNAS`; a nulidade é honesta.
 */
export interface FilaRevisaoRow {
  candidatura_id: string
  candidato_nome: string | null
  vaga_titulo: string | null
  decisao: string | null
  /** `usuarios_rh.nome_completo` do decisor — nulo quando não há correspondência. */
  decidido_por_nome: string | null
  revisao_solicitada_em: string
  revisao_respondida_em: string | null
  revisao_veredito: string | null
  revisao_resultado: string | null
  respondida_por_nome: string | null
  /** Espelho COSMÉTICO do guard REVISAO-05 — quem impede a ação é o RPC de escrita. */
  pode_responder: boolean
}

/** Filtro da fila — o único, e é o toggle "Incluir respondidos" da 42-UI-SPEC. */
export interface FiltrosFilaRevisao {
  incluirRespondidos: boolean
}

/**
 * Projeta uma linha crua da RPC nas chaves da allowlist — nada mais atravessa.
 *
 * É defesa em profundidade, não redundância: o `RETURNS TABLE` do servidor é o contrato
 * primário, mas um `CREATE OR REPLACE` futuro que acrescente uma coluna (a justificativa
 * INTERNA do recrutador, o UUID do revisor) passaria a trafegar sem que nada no cliente
 * reclamasse. Aqui ela é descartada na fronteira, e o teste de contrato morde se esta
 * projeção for trocada por um pass-through.
 */
function projetarLinhaFila(linha: Record<string, unknown>): FilaRevisaoRow {
  const projetada: Record<string, unknown> = {}
  for (const coluna of FILA_REVISAO_COLUNAS) {
    projetada[coluna] = coluna in linha ? linha[coluna] : null
  }
  return projetada as unknown as FilaRevisaoRow
}

/**
 * Lê a fila de revisões Art. 20 pela RPC `listar_revisoes_decisao` (REVISAO-02).
 *
 * A ordem (mais antigo primeiro) e o corte (`LIMIT 200`) são do servidor. Um erro é
 * convertido por `classificarErroRevisao` e **lançado** — o hook nunca recebe o objeto
 * cru do transporte, e a tela nunca ecoa a mensagem do banco.
 */
export async function listarFilaRevisoes(
  filtros: FiltrosFilaRevisao,
): Promise<FilaRevisaoRow[]> {
  const { data, error } = await supabase.rpc('listar_revisoes_decisao', {
    p_incluir_respondidos: filtros.incluirRespondidos,
  })
  if (error) throw classificarErroRevisao(error)
  const linhas = (data ?? []) as unknown as Array<Record<string, unknown>>
  return linhas.map(projetarLinhaFila)
}

/**
 * Conta as revisões pendentes no escopo do chamador, para o badge da `RHSidebar`.
 * Um retorno nulo resolve para `0`; o formatador (`formatarBadgePendentes`) é quem
 * decide que `0` significa badge oculto.
 */
export async function contarRevisoesPendentes(): Promise<number> {
  const { data, error } = await supabase.rpc('contar_revisoes_pendentes')
  if (error) throw classificarErroRevisao(error)
  return data ?? 0
}

/** A chave da única linha de configuração de limiar desta fila. */
export const CHAVE_SLA_REVISAO = 'revisao_art20'

/**
 * Lê os dois limiares de acompanhamento interno da tabela de configuração.
 *
 * ⚠ NÃO LANÇA, NUNCA. Erro de leitura, linha ausente ou limiar não numérico resolvem
 * para `null`, e o consumidor trata `null` como a **faixa degenerada** (a contagem de
 * dias sem badge). A razão é de proporção: uma célula de configuração ilegível não pode
 * derrubar a fila inteira do RH. Esta é a mesma decisão que `classifyRevisaoSla`
 * implementa do lado puro — aqui ela começa, na fronteira de rede.
 *
 * A leitura é por allowlist de 3 colunas (nunca projeção-estrela), e a tabela tem RLS
 * restrita a RH (plano 42-06): o limiar é config interna e não pode ser legível por
 * `anon`, senão a invariante 1 da 42-UI-SPEC cai por baixo da UI.
 */
export async function lerConfigSlaRevisao(): Promise<LimiaresSlaRevisao | null> {
  const { data, error } = await supabase
    .from('config_sla_revisao')
    .select('chave, dias_atencao, dias_atraso')
    .eq('chave', CHAVE_SLA_REVISAO)
    .maybeSingle()

  if (error || !data) return null

  const { dias_atencao, dias_atraso } = data
  if (typeof dias_atencao !== 'number' || typeof dias_atraso !== 'number') return null

  return { diasAtencao: dias_atencao, diasAtraso: dias_atraso }
}

/** As variáveis do único write-path da resposta à revisão. */
export interface ResponderRevisaoVars {
  candidaturaId: string
  veredito: ResponderRevisaoFormValues['veredito']
  justificativa: string
}

/**
 * Registra a resposta à revisão de decisão pela RPC `responder_revisao_decisao`
 * (REVISAO-03) — o **único** caminho de escrita que existe.
 *
 * ⚠ NENHUMA DECISÃO DE AUTORIZAÇÃO MORA AQUI, E ISSO É DELIBERADO. Esta função não sabe
 * quem é o usuário, não compara identidades e não checa papel. Ela chama a RPC **mesmo
 * quando o guard vai recusar** — e é justamente por isso que a recusa é confiável: o que
 * barra a ação é o `SECURITY DEFINER` do servidor (`decisao_final` não tem policy de
 * UPDATE, logo não há atalho por PostgREST), não uma condição de cliente que qualquer
 * DevTools desliga. O `pode_responder` que a fila lê é COSMÉTICO; este caminho é o real.
 *
 * Um erro sai classificado por `classificarErroRevisao` — é o `code` do `RevisaoError`
 * que decide, lá em cima, se a recusa vira alerta inline permanente sem retry
 * (`GUARD_DECISOR`) ou toast genérico (`VALIDACAO` / `DESCONHECIDO`).
 */
export async function responderRevisao(vars: ResponderRevisaoVars): Promise<void> {
  const { error } = await supabase.rpc('responder_revisao_decisao', {
    p_candidatura_id: vars.candidaturaId,
    p_veredito: vars.veredito,
    p_justificativa: vars.justificativa,
  })
  if (error) throw classificarErroRevisao(error)
}

/** Export namespaced (convenção `camelCaseService`). */
export const revisaoService = {
  classificarErroRevisao,
  formatarBadgePendentes,
  listarFilaRevisoes,
  contarRevisoesPendentes,
  lerConfigSlaRevisao,
  responderRevisao,
}
