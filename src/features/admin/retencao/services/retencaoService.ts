/**
 * retencaoService — a camada de dados da matriz de retenção por estado da candidatura
 * (RETEN-01 · RETEN-02 · RETEN-04, LGPD Art. 15/16).
 *
 * ── A ÚNICA SUPERFÍCIE DE DADOS DESTA TELA SÃO AS RPCs ────────────────────────────
 *
 * `/admin/retencao` **nunca** consulta `usuarios_rh` nem `candidaturas` diretamente. Duas
 * razões independentes, ambas medidas e não supostas:
 *
 *   · `usuarios_rh` é **admin-only** desde a SEG-02 e a tabela `config_retencao_etapa` tem
 *     **uma única** policy, de `SELECT`, também admin-only (plano 43-04). Resolver o nome
 *     do último alterador no cliente exigiria uma segunda leitura de RH que a RLS já
 *     estreitou — e que, quando falhasse, pareceria dado faltando em vez de permissão
 *     faltando. `listar_matriz_retencao` resolve o nome **no servidor**, por `LEFT JOIN`,
 *     e devolve `NULL` quando o usuário não existe mais: é exatamente o caso parcial
 *     "Não identificado" da 43-UI-SPEC (§UI Considerations E6 · partial).
 *   · A prévia (`previa_retencao` / `previa_retencao_total`) devolve **apenas agregados**.
 *     O predicado de baixo nível (`candidaturas_alem_da_janela`, plano 43-06) é o único
 *     que devolve linhas identificáveis, e está **revogado de todo papel de cliente sem
 *     `GRANT` de volta** — não existe caminho PostgREST para ele. A proibição de enumerar
 *     candidatos prestes a serem apagados é ESTRUTURAL, não uma escolha desta tela.
 *
 * ── O TETO DE 24 MESES: QUEM IMPEDE DE VERDADE ───────────────────────────────────
 *
 * A validação de `1..24` que existe na tela (Zod, `janelaRetencaoSchema`) é **cosmética**,
 * no mesmo modelo mental do `D-13` da `RHSidebar` e do espelho de `pode_responder` da
 * Phase 42. Quem impede de verdade são DUAS camadas de servidor, ambas provadas por
 * execução no smoke do 43-07 (10/10):
 *
 *   1. `CHECK (janela_meses BETWEEN 1 AND 24)` na tabela;
 *   2. a validação dentro de `salvar_janela_retencao`, que recusa com **22023** para
 *      `p_meses` NULL ou fora de `1..24`, para etapa ausente da matriz **e para NO-OP**
 *      (salvar o valor que já está lá).
 *
 * Se a validação do cliente for removida um dia, a RPC continua recusando. O inverso não
 * é verdade — e é por isso que a ordem desta frase importa.
 *
 * ── ZERO AÇÃO DESTRUTIVA ─────────────────────────────────────────────────────────
 *
 * Nenhuma função deste módulo apaga nada. A ação mais forte que ele oferece — salvar uma
 * janela — é **aditiva e auditável**: a RPC grava a mudança e sua linha em
 * `logs_auditoria` na MESMA transação (asserção (g) do smoke do 43-04).
 *
 * @module features/admin/retencao/services/retencaoService
 * @see src/features/revisao/services/revisaoService.ts (o molde: allowlist nomeada + classe de erro)
 * @see supabase/migrations/20260801000002_p43_config_retencao.sql (contrato vivo das 2 RPCs)
 * @see supabase/migrations/20260801000004_p43_previa_retencao.sql (contrato vivo da prévia)
 */
import { supabase } from '@/lib/supabase/client'
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService'

/**
 * Erro de domínio da retenção, na forma `camelCaseService.ts` do projeto (CLAUDE.md).
 *
 * `code` é deliberadamente pequeno (3 valores) porque a 43-UI-SPEC só distingue três
 * tratamentos: recusa de permissão, recusa de validação e genérico. A mensagem CRUA do
 * transporte nunca sai daqui — um `42501` de Postgres carrega o nome da tabela e o do
 * papel, e ecoá-lo na tela seria um mapa da RLS oferecido de graça.
 */
export class RetencaoError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSAO' | 'VALIDACAO' | 'DESCONHECIDO',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'RetencaoError'
  }
}

/**
 * Traduz um erro cru das RPCs de retenção no `RetencaoError` que a UI sabe apresentar.
 * Total: qualquer entrada (inclusive `null`) resolve para um `RetencaoError`, nunca lança.
 *
 * Os dois SQLSTATE são contrato do servidor, provados por execução no smoke do 43-07:
 *   · `42501` — papel não é `administrador`, OU não há linha viva em `usuarios_rh` para
 *     `auth.uid()`. O guard é NULL-safe (`IS DISTINCT FROM`), então recusa também o
 *     chamador SEM claim nenhuma.
 *   · `22023` — `p_meses` NULL ou fora de `1..24`, etapa ausente da matriz, ou NO-OP.
 */
export function classificarErroRetencao(error: unknown): RetencaoError {
  const code = (error as { code?: string } | null | undefined)?.code ?? ''

  if (code === '42501') {
    return new RetencaoError(
      'Você não tem permissão para ver ou alterar a matriz de retenção.',
      'PERMISSAO',
      error,
    )
  }

  if (code === '22023' || code === 'no_data_found' || code === 'P0002') {
    return new RetencaoError(
      'Não foi possível salvar a janela. Revise o valor e tente novamente.',
      'VALIDACAO',
      error,
    )
  }

  return new RetencaoError(
    'Não foi possível concluir a operação. Tente novamente.',
    'DESCONHECIDO',
    error,
  )
}

/**
 * As colunas que a matriz projeta — o espelho CLIENTE do `RETURNS TABLE` de
 * `listar_matriz_retencao`. Quem impõe o contrato é o servidor; esta constante TRAVA a
 * expectativa, de modo que uma coluna acrescentada no servidor sem revisão de privacidade
 * não alcance a tela nem o cache do TanStack Query.
 *
 * ⚠ `alterado_por` (o **uuid** do ator) está deliberadamente FORA: a RPC devolve apenas o
 * nome resolvido. Um UUID nunca é identidade humana nesta tela (invariante herdada da
 * 42-UI-SPEC).
 */
export const MATRIZ_RETENCAO_COLUNAS = [
  'etapa',
  'janela_meses',
  'origem',
  'alterado_por_nome',
  'atualizado_em',
] as const

export type ColunaMatrizRetencao = (typeof MATRIZ_RETENCAO_COLUNAS)[number]

/**
 * Uma linha da matriz, do lado do cliente.
 *
 * ⚠ POR QUE ESTE TIPO É ESCRITO À MÃO e não derivado de `database.types.ts`: o gerador do
 * Supabase declara TODA coluna de um `RETURNS TABLE` como não-nula
 * (`alterado_por_nome: string`), porque a assinatura SQL não carrega nulidade. Na prática
 * `alterado_por_nome` **É** nulo — em toda linha de seed, e também quando o administrador
 * que alterou não existe mais em `usuarios_rh`. Confiar no tipo gerado produziria um
 * acesso a `null` em produção com o compilador calado. A nulidade aqui é honesta.
 */
export interface MatrizRetencaoRow {
  etapa: EtapaFunilM2
  /** `NULL` só é possível se a linha existir sem janela — a tela renderiza "não definida". */
  janela_meses: number | null
  /** `'seed'` (ninguém escolheu, ninguém contestou) ou `'admin'` (alguém decidiu). */
  origem: string | null
  /** Nome resolvido NO SERVIDOR; nulo no seed e quando o ator não existe mais. */
  alterado_por_nome: string | null
  atualizado_em: string | null
}

/**
 * Projeta uma linha crua da RPC nas chaves da allowlist — nada mais atravessa.
 *
 * Defesa em profundidade, não redundância: um `CREATE OR REPLACE` futuro que acrescente
 * o uuid do ator passaria a trafegar sem que nada no cliente reclamasse.
 */
function projetarLinhaMatriz(linha: Record<string, unknown>): MatrizRetencaoRow {
  const projetada: Record<string, unknown> = {}
  for (const coluna of MATRIZ_RETENCAO_COLUNAS) {
    projetada[coluna] = coluna in linha ? linha[coluna] : null
  }
  return projetada as unknown as MatrizRetencaoRow
}

/**
 * Lê a matriz de retenção pela RPC `listar_matriz_retencao` (RETEN-01) — **e só ela**.
 *
 * ⚠ A ORDEM DE CHEGADA NÃO É CONTRATO, e esta função não a promete (code review IN-01).
 * A RPC devolve na ordem do enum `etapa_processo`, mas quem manda na tela é
 * `mesclarComEnum`, que itera `ETAPA_M2_OPTIONS` e RECONSTRÓI a lista — a ordem do
 * servidor é descartada. As duas coincidem hoje, e é justamente por coincidirem que a
 * versão anterior deste docblock ("a tela **não** reordena") podia sobreviver anos
 * mentindo sem nada quebrar. `ETAPA_M2_OPTIONS` é a autoridade única de ordenação, como
 * é de rótulo.
 *
 * Um erro sai classificado e é **lançado**: o hook nunca recebe o objeto cru do
 * transporte, e a tela nunca ecoa a mensagem do banco.
 */
export async function listarMatriz(): Promise<MatrizRetencaoRow[]> {
  const { data, error } = await supabase.rpc('listar_matriz_retencao')
  if (error) throw classificarErroRetencao(error)
  const linhas = (data ?? []) as unknown as Array<Record<string, unknown>>
  return linhas.map(projetarLinhaMatriz)
}

/**
 * Uma linha da prévia — a contagem por ESTADO.
 *
 * ⚠ `candidaturas_afetadas` e `candidatos_afetados` contam coisas diferentes, e a
 * 43-UI-SPEC foi EMENDADA (plano 43-06) para que o rótulo diga qual é qual: a linha por
 * estado exibe **candidaturas**, porque a matriz é chaveada por estado de candidatura e
 * uma mesma pessoa pode ter várias. Exibir a contagem de candidaturas sob a palavra
 * "candidatos" contaria uma coisa e nomearia outra.
 */
export interface PreviaRetencaoLinha {
  etapa: EtapaFunilM2
  candidaturas_afetadas: number
  candidatos_afetados: number
}

/**
 * O total da prévia, com o carimbo do SERVIDOR.
 *
 * ⚠ O total **não** é a soma das linhas, e isso é contrato, não arredondamento: ele conta
 * candidatos cujas candidaturas vivas estão **todas** fora da janela. Um candidato com uma
 * candidatura ainda ativa não seria afetado por nenhuma definição sã de retenção, e
 * somá-lo inflaria a prévia. Logo `total <= soma das linhas` — o smoke do 43-06 assere a
 * desigualdade.
 *
 * `calculada_em` vem de `now()` DENTRO da mesma função que computa o número. Um carimbo
 * montado no cliente diria a hora em que a tela renderizou, não a hora do cálculo.
 */
export interface PreviaRetencaoTotal {
  candidatos_afetados: number
  calculada_em: string
}

/** O que a tela consome: as linhas, o total e o carimbo, lidos na mesma passagem. */
export interface PreviaRetencao {
  linhas: PreviaRetencaoLinha[]
  total: number
  calculadaEm: string | null
}

/**
 * Lê a prévia read-only (RETEN-04) — as duas RPCs agregadas, e **nada além delas**.
 *
 * ⚠ ZERO IDENTIFICAÇÃO DE CANDIDATO, E A PROIBIÇÃO NÃO MORA AQUI. O predicado de baixo
 * nível `candidaturas_alem_da_janela()` é o único objeto desta fase que devolve linhas
 * identificáveis (`candidatura_id`, `candidato_id`), e ele está **revogado de PUBLIC,
 * anon e authenticated sem `GRANT` de volta** (plano 43-06): não existe caminho PostgREST
 * para ele. Uma tela capaz de enumerar as pessoas prestes a serem apagadas seria superfície
 * de exfiltração construída sem necessidade — e a impossibilidade é estrutural, não uma
 * escolha que este arquivo pudesse reverter.
 *
 * As duas leituras são disparadas em paralelo e vivem sob UMA chave de cache: linhas e
 * total são o mesmo fato visto de dois ângulos, e deixá-los invalidarem separadamente
 * permitiria exibir um total de antes ao lado de linhas de agora.
 */
export async function lerPrevia(): Promise<PreviaRetencao> {
  const [porEstado, total] = await Promise.all([
    supabase.rpc('previa_retencao'),
    supabase.rpc('previa_retencao_total'),
  ])

  if (porEstado.error) throw classificarErroRetencao(porEstado.error)
  if (total.error) throw classificarErroRetencao(total.error)

  const linhas = ((porEstado.data ?? []) as unknown as PreviaRetencaoLinha[]).map(
    (l) => ({
      etapa: l.etapa,
      candidaturas_afetadas: Number(l.candidaturas_afetadas ?? 0),
      candidatos_afetados: Number(l.candidatos_afetados ?? 0),
    }),
  )

  // `previa_retencao_total` é SETOF de uma linha só; ausência resolve para zero SEM
  // carimbo — e a ausência de carimbo é o que a tela usa para não exibir uma data que
  // ninguém computou.
  const primeira = ((total.data ?? []) as unknown as PreviaRetencaoTotal[])[0]

  return {
    linhas,
    total: Number(primeira?.candidatos_afetados ?? 0),
    calculadaEm: primeira?.calculada_em ?? null,
  }
}

/** As variáveis do único write-path desta feature. */
export interface SalvarJanelaVars {
  etapa: EtapaFunilM2
  meses: number
}

/**
 * Salva a janela de retenção de um estado pela RPC `salvar_janela_retencao` (RETEN-02).
 *
 * ⚠ NENHUMA DECISÃO DE AUTORIZAÇÃO NEM DE TETO MORA AQUI, E ISSO É DELIBERADO. Esta
 * função não sabe quem é o usuário, não compara papéis e não confere o teto. Ela chama a
 * RPC **mesmo quando o servidor vai recusar** — e é justamente por isso que a recusa é
 * confiável: o que barra a escrita é o `SECURITY DEFINER` do servidor
 * (`config_retencao_etapa` **não tem policy de UPDATE**, logo não existe atalho por
 * PostgREST), não uma condição de cliente.
 *
 * A escrita é **aditiva e auditável**: a RPC grava o novo valor e a linha correspondente
 * em `logs_auditoria` na MESMA transação. Nenhum dado de candidato é lido, escrito ou
 * apagado por este caminho.
 *
 * Um erro sai classificado por `classificarErroRetencao` e é **lançado**.
 */
export async function salvarJanela(vars: SalvarJanelaVars): Promise<void> {
  const { error } = await supabase.rpc('salvar_janela_retencao', {
    p_etapa: vars.etapa,
    p_meses: vars.meses,
  })
  if (error) throw classificarErroRetencao(error)
}

/** Export namespaced (convenção `camelCaseService`). */
export const retencaoService = {
  classificarErroRetencao,
  listarMatriz,
  lerPrevia,
  salvarJanela,
}
