/**
 * historicoCandidaturaService — the RH read-only history feed (VISRH-03 · CONSOL-02).
 *
 * ── ONDE A LEITURA ACONTECE, E POR QUÊ NÃO É MAIS A TABELA ────────────────────────
 *
 * Desde a Phase 47 a leitura é a RPC `public.listar_historico_candidatura(p_candidatura_id)`
 * (migration `20260809000001`), e **não** mais um `select` sobre `historico_candidatura`.
 * A razão não é estilo: o nome de quem agiu mora na tabela de usuários de RH, **admin-only
 * desde a SEG-02**. Um recrutador comum lendo o hub não tem permissão de consultar aquela tabela,
 * então resolver o nome no cliente exigiria abri-la — trocar um defeito cosmético (um UUID
 * na tela) por um vetor de enumeração de pessoal. A RPC resolve **no servidor** e devolve
 * `ator_rotulo` como texto: **o uuid do ator nunca sai da função**.
 *
 * ── O GUARD DE VAZAMENTO DE COLUNA CONTINUA, E MUDOU DE ENDEREÇO ─────────────────
 *
 * A invariante herdada ([[reference_select_star_leaks_pii]]) é a mesma: a RLS é row-level
 * e **não esconde coluna**, então uma projeção total sobre-projetaria. O que mudou é onde o
 * guard mora — agora na assinatura `RETURNS TABLE` da função do servidor. `HISTORICO_ALLOWLIST`
 * permanece exportada e explícita como o **registro versionado do que aquele contrato entrega**,
 * e aqui ela é EXECUTÁVEL: `projetarLinha` copia apenas as colunas nomeadas, de modo que um
 * `CREATE OR REPLACE` futuro que acrescente uma coluna sem revisão de privacidade não alcance
 * nem a tela nem o cache do TanStack Query. Nunca `'*'`, nunca `email`, nunca id de usuário RH.
 *
 * ── QUEM PODE CHAMAR — a correção de uma afirmação que era falsa ─────────────────
 *
 * ⚠ A versão anterior deste docblock dizia "candidate DB-denied via `rh_le_historico`".
 * Isso é verdade sobre a **montagem da tela** e **falso sobre o banco**: a policy
 * `candidato_le_proprio_historico` (`20260607000006:60-70`) continua **VIVA** — a Phase 32
 * declarou explicitamente que não a tocou. Quem impede o candidato de chamar esta RPC é o
 * **guard de papel NULL-safe dentro do corpo da função** (`IS DISTINCT FROM`, `42501`), não
 * a RLS. Manter a afirmação antiga seria guardar no repositório exatamente o gênero de
 * declaração sem executor que a Phase 47 existe para remover.
 *
 * A ordenação (`criado_em DESC`) e o limite defensivo (100) passaram a ser responsabilidade
 * do servidor. Este módulo **não reordena e não re-limita** — duplicar a ordenação criaria
 * dois lugares para ela divergir, e o de cá venceria em silêncio.
 *
 * @module features/hub-candidato/services/historicoCandidaturaService
 * @see supabase/migrations/20260809000001_p47_listar_historico_candidatura.sql (contrato vivo)
 * @see src/features/admin/retencao/services/retencaoService.ts (o molde: RPC + classe de erro + projeção)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class HistoricoCandidaturaServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'FORBIDDEN' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'HistoricoCandidaturaServiceError'
  }
}

/**
 * O contrato DECLARADO das colunas que `listar_historico_candidatura` devolve — o espelho
 * cliente do `RETURNS TABLE`. NUNCA `'*'`.
 *
 * ⚠ O uuid do `ator` **saiu** desta lista na Phase 47 e não volta: a RPC devolve
 * `ator_rotulo` (texto já resolvido no servidor) no lugar dele. E-mail e identificador de
 * usuário de RH nunca estiveram aqui e continuam fora — nenhum dos dois é necessário para
 * renderizar uma trilha de decisão, e ambos seriam PII de funcionário exposta a um leitor
 * que não pode consultar a tabela de usuários de RH.
 *
 * ⚠ O nome literal daquela tabela não aparece em lugar nenhum deste arquivo, nem em
 * comentário: o guard automático desta fase varre o módulo inteiro por ele, e um gate que
 * distinguisse prosa de código deixaria de pegar uma string literal em rota de consulta.
 */
export const HISTORICO_ALLOWLIST = 'etapa_de, etapa_para, ator_rotulo, criterio_texto, criado_em'

/** A allowlist em forma iterável — a mesma fonte, sem uma segunda lista para divergir. */
const HISTORICO_COLUNAS = HISTORICO_ALLOWLIST.split(',').map((coluna) => coluna.trim())

/** Uma transição da trilha, do lado do cliente (na ordem que o servidor devolveu). */
export interface HistoricoRow {
  etapa_de: string | null
  etapa_para: string
  /**
   * Quem agiu, **resolvido no servidor**, em um de quatro rótulos exaustivos:
   * `Sistema` (transição automática — o caso majoritário da trilha hoje),
   * `O próprio candidato` (o ator é o titular daquela candidatura),
   * o `nome_completo` do recrutador vivo, ou
   * `Recrutador removido` (ator não-nulo que não resolve para nenhum usuário RH vivo —
   * derivado da **falha de resolução**, jamais de ator nulo: derivá-lo de nulo faria um
   * dos dois primeiros rótulos ser sempre falso).
   *
   * Não é nulo: os quatro ramos do `CASE` do servidor cobrem todo o domínio. O cliente
   * **não recalcula** rótulo nenhum — uma expressão de fallback aqui criaria um quinto
   * caminho que ninguém especificou e que ninguém testaria.
   *
   * ⚠ Resíduo declarado (D-47-U09): depois de uma exclusão da Phase 45 o ponteiro do
   * titular é severado e a linha de `inscricao` lê `Sistema`. Aceito por decisão — um
   * quinto rótulo informaria a um recrutador que aquela pessoa exerceu o direito de
   * exclusão, o vazamento que a Invariante 9 da 45-UI-SPEC proíbe.
   */
  ator_rotulo: string
  /** A justificativa anexada à transição. */
  criterio_texto: string | null
  criado_em: string
}

/**
 * Projeta uma linha crua da RPC nas chaves da allowlist — nada mais atravessa.
 *
 * Defesa em profundidade, não redundância: o guard primário é o `RETURNS TABLE` do
 * servidor; este aqui é o que segura um `CREATE OR REPLACE` futuro que acrescente uma
 * coluna sem revisão de privacidade.
 */
function projetarLinha(linha: Record<string, unknown>): HistoricoRow {
  const projetada: Record<string, unknown> = {}
  for (const coluna of HISTORICO_COLUNAS) {
    projetada[coluna] = coluna in linha ? linha[coluna] : null
  }
  return projetada as unknown as HistoricoRow
}

/**
 * Traduz um erro cru da RPC no erro que a UI sabe apresentar.
 *
 * `42501` é **contrato do servidor**, levantado por dois guards distintos do corpo: papel
 * diferente de `rh`/`administrador` (NULL-safe, recusa também o chamador sem claim) e
 * recusa por **escopo de vaga**, o predicado copiado da policy `rh_le_historico` (WR-04).
 * Distingui-lo importa: sem esse mapeamento, uma recusa por escopo chega à tela
 * indistinguível de uma falha de rede — e a recusa é informação, não ruído.
 *
 * ⚠ A mensagem CRUA do transporte nunca sai daqui num caminho de permissão: um `42501` de
 * Postgres carrega o nome da tabela e o do papel, e ecoá-lo seria um mapa da RLS de graça.
 */
function classificarErro(error: { code?: string; message?: string }): HistoricoCandidaturaServiceError {
  if (error?.code === '42501') {
    return new HistoricoCandidaturaServiceError(
      'Você não tem permissão para ver o histórico desta candidatura.',
      'FORBIDDEN',
      error,
    )
  }
  return new HistoricoCandidaturaServiceError(
    `Não foi possível carregar o histórico: ${error?.message ?? 'erro desconhecido'}`,
    'DATABASE_ERROR',
    error,
  )
}

/**
 * Lista as transições de etapa de UMA candidatura, na ordem em que o servidor as devolveu
 * (`criado_em DESC`, decidido e limitado lá). Superfície de RH/admin; o candidato é recusado
 * pelo guard de papel **dentro da função**. `candidaturaId` é o param de rota `:id` (Pitfall 8).
 */
export async function listHistorico(candidaturaId: string): Promise<HistoricoRow[]> {
  if (!candidaturaId) {
    throw new HistoricoCandidaturaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // ⚠ CAST PRÉ-REGEN: `listar_historico_candidatura` está APLICADA em produção
  // (`20260809000001`, ledger reconciliado, smoke 6/6), mas `database.types.ts` só é
  // regenerado por `npm run db:types` (Supabase CLI `--linked`), que não roda nesta wave —
  // então o nome ainda não é chave válida de `supabase.rpc()`. Idioma vivo do repositório
  // para a janela pré-regen (`triagemService.ts:486`). O próximo `db:types` remove os casts.
  const { data, error } = await supabase.rpc('listar_historico_candidatura' as never, {
    p_candidatura_id: candidaturaId,
  } as never)

  if (error) {
    throw classificarErro(error as { code?: string; message?: string })
  }

  const linhas = (data ?? []) as unknown as Array<Record<string, unknown>>
  return linhas.map(projetarLinha)
}
