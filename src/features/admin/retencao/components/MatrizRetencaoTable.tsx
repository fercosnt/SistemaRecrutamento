/**
 * MatrizRetencaoTable — a matriz de retenção por estado da candidatura (RETEN-01).
 *
 * A **âncora visual primária** de `/admin/retencao` (43-UI-SPEC §Âncora visual primária):
 * é o objeto que responde à pergunta que traz o administrador à tela. Os banners ficam
 * ACIMA dela e a prévia ABAIXO — a prévia é consequência do que a tabela diz, e colocá-la
 * em cima inverteria a leitura.
 *
 * Molde de estilo do `FilaRevisoesTable` (Phase 42), com dois deltas deliberados:
 *
 *  1. **SEM paginação, SEM `max-h` e SEM scroll interno.** A chave é um enum FECHADO —
 *     `etapa_processo` tem 8 valores (medidos em `database.types.ts`) — e a tabela não
 *     cresce em runtime sob nenhuma condição. Só `overflow-x-auto` no wrapper, para
 *     largura estreita. Cabeçalho fixo aqui seria mecanismo sem problema para resolver.
 *  2. **A tabela é MESCLADA com o enum, não apenas mapeada da resposta.** Um estado
 *     presente no enum e ausente da matriz aparece como linha com janela
 *     "— (não definida)" — nunca omitido em silêncio. Omissão silenciosa é exatamente o
 *     caso que a Phase 46 precisa enxergar antes de armar qualquer `DELETE`: uma etapa
 *     fora da matriz é uma etapa sem política, e a tela tem de dizer isso em voz alta.
 *
 * ── O QUE NUNCA APARECE AQUI ──────────────────────────────────────────────────────
 *  · Um UUID como identidade humana: `alterado_por_nome` nulo resolve para
 *    "Não identificado" (invariante herdada da 42-UI-SPEC). O uuid do ator nem chega ao
 *    cliente — está fora da allowlist do serviço.
 *  · Uma data no seed. `atualizado_em` VEM preenchido pelo trigger em toda linha semeada,
 *    e exibi-lo diria que alguém alterou aquela janela naquele dia. É uma data verdadeira
 *    contando uma história falsa; por isso o seed mostra travessão.
 *  · A mensagem crua do transporte: o estado de erro sai do `AsyncState` com copy própria.
 *  · Qualquer verbo destrutivo. A ação mais forte desta tela — salvar uma janela — é
 *    ADITIVA e AUDITÁVEL e não apaga nada.
 *
 * ── "Origem" É O DISCRIMINADOR QUE A PHASE 46 TEM DE CONSULTAR ───────────────────
 * `origem = 'seed'` **não** significa que alguém escolheu 24 meses para aquele estado —
 * significa apenas que ninguém contestou o teto ainda. A coluna existe (em vez de um
 * comentário) exatamente para que essa distinção seja legível na tela e consultável no
 * banco antes de a purga ser armada.
 *
 * @module features/admin/retencao/components/MatrizRetencaoTable
 * @see src/features/revisao/components/FilaRevisoesTable.tsx (o molde de estilo)
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AsyncState } from '@/components/ui/AsyncState'
import { cn } from '@/components/ui/utils'
import {
  ETAPA_M2_OPTIONS,
  type EtapaFunilM2,
} from '@/features/triagem/services/triagemService'
import { useMatrizRetencao } from '../hooks/useMatrizRetencao'
import type { MatrizRetencaoRow } from '../services/retencaoService'

/**
 * Copy verbatim da 43-UI-SPEC (§`/admin/retencao`) — fonte ÚNICA, sem deriva.
 *
 * Três strings marcadas AUTORADO: a spec é silenciosa sobre elas e o caso é real.
 */
export const MATRIZ_COPY = {
  colunas: {
    estado: 'Estado',
    janela: 'Janela de retenção',
    origem: 'Origem',
    ultimaAlteracao: 'Última alteração',
    acoes: 'Ações',
  },
  origemSeed: 'Seed (teto consentido)',
  /** Interpolado com o nome resolvido no servidor (ou com "Não identificado"). */
  origemAdmin: (nome: string) => `Alterado por ${nome}`,
  naoIdentificado: 'Não identificado',
  janelaMeses: (n: number) => `${n} meses`,
  janelaNaoDefinida: '— (não definida)',
  semValor: '—',
  acao: 'Editar janela',
  /**
   * AUTORADO. A spec não cobre o caso "estado no enum, fora da matriz" do lado da AÇÃO —
   * só do lado da leitura. `salvar_janela_retencao` recusa com `22023` uma etapa ausente
   * da matriz, então oferecer o botão aqui seria oferecer uma ação que o servidor já
   * decidiu recusar. O motivo é dito em texto, nunca só por opacidade.
   */
  acaoIndisponivel: 'Este estado ainda não está na matriz de retenção.',
  vazio: {
    heading: 'A matriz de retenção ainda não foi semeada.',
    body: 'Nenhuma janela de retenção está definida. Enquanto isso, nenhum prazo é aplicado a nenhum estado.',
  },
  erro: {
    heading: 'Não foi possível carregar a matriz de retenção.',
    generic: 'Verifique sua conexão e tente novamente.',
  },
} as const

/** Cabeçalho da tabela (sem `sticky`: não há scroll interno — ver delta 1 do docblock). */
const TH_CLASSES = 'text-sm font-semibold text-white/80'

/** Largura máxima da coluna de texto livre — o par obrigatório do `truncate`. */
const CELULA_TRUNCADA = 'max-w-[220px] truncate'

/** Uma linha da tabela — a matriz do servidor MESCLADA com o enum fechado de 8 estados. */
export interface LinhaMatriz {
  etapa: EtapaFunilM2
  rotulo: string
  janelaMeses: number | null
  origem: string | null
  alteradoPorNome: string | null
  atualizadoEm: string | null
  /** `false` quando o estado existe no enum e NÃO existe na matriz. */
  definida: boolean
}

/** Data em `dd/mm/aaaa` (idioma vivo em `SolicitarRevisaoCTA` e na fila de revisões). */
function formatarData(iso: string | null): string {
  if (!iso) return MATRIZ_COPY.semValor
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return MATRIZ_COPY.semValor
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Mescla a matriz do servidor com o enum fechado — UMA linha por estado, sempre.
 *
 * A ordem é a do funil M2 (`ETAPA_M2_OPTIONS`, a fonte única de rótulos do projeto), e não
 * a ordem de chegada: uma matriz parcial não pode reordenar a leitura de quem confere
 * política por etapa.
 */
export function mesclarComEnum(linhas: MatrizRetencaoRow[]): LinhaMatriz[] {
  const porEtapa = new Map(linhas.map((l) => [l.etapa, l]))
  return ETAPA_M2_OPTIONS.map(({ value, label }) => {
    const linha = porEtapa.get(value)
    return {
      etapa: value,
      rotulo: label,
      janelaMeses: linha?.janela_meses ?? null,
      origem: linha?.origem ?? null,
      alteradoPorNome: linha?.alterado_por_nome ?? null,
      atualizadoEm: linha?.atualizado_em ?? null,
      definida: linha !== undefined,
    }
  })
}

/** O rótulo da coluna Origem — e o lugar onde um ator removido vira "Não identificado". */
export function rotularOrigem(linha: LinhaMatriz): string {
  if (!linha.definida || !linha.origem) return MATRIZ_COPY.semValor
  if (linha.origem === 'seed') return MATRIZ_COPY.origemSeed
  return MATRIZ_COPY.origemAdmin(linha.alteradoPorNome ?? MATRIZ_COPY.naoIdentificado)
}

/**
 * A célula "Última alteração": travessão no seed, data real quando um administrador
 * alterou. Ver o docblock — uma data de seed seria verdadeira e mentirosa ao mesmo tempo.
 */
export function rotularUltimaAlteracao(linha: LinhaMatriz): string {
  if (!linha.definida || linha.origem === 'seed') return MATRIZ_COPY.semValor
  return formatarData(linha.atualizadoEm)
}

export interface MatrizRetencaoTableProps {
  /**
   * Abre a edição da linha. **Opcional de propósito**: sem ele a ação renderiza
   * DESABILITADA em vez de oferecer uma afordância falsa — idioma estabelecido pelo
   * `FilaRevisoesTable` no 42-09.
   */
  onEditar?: (linha: LinhaMatriz) => void
}

export function MatrizRetencaoTable({ onEditar }: MatrizRetencaoTableProps = {}) {
  const { data, isLoading, isError, refetch, isRefetching } = useMatrizRetencao()

  const doServidor = data ?? []
  const linhas = mesclarComEnum(doServidor)

  return (
    <AsyncState
      isLoading={isLoading}
      isError={isError}
      // O vazio é a AUSÊNCIA DE SEED, medida na resposta do servidor — nunca em `linhas`,
      // que tem 8 itens por construção e nunca poderia ficar vazia.
      isEmpty={doServidor.length === 0}
      onRetry={() => void refetch()}
      retrying={isRefetching}
      copy={{
        empty: { heading: MATRIZ_COPY.vazio.heading, body: MATRIZ_COPY.vazio.body },
        error: { heading: MATRIZ_COPY.erro.heading, generic: MATRIZ_COPY.erro.generic },
      }}
    >
      {/* Sem `max-h` e sem `overflow-y`: a tabela tem teto de 8 linhas por construção. */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
              <TableHead className={TH_CLASSES}>{MATRIZ_COPY.colunas.estado}</TableHead>
              <TableHead className={TH_CLASSES}>{MATRIZ_COPY.colunas.janela}</TableHead>
              <TableHead className={TH_CLASSES}>{MATRIZ_COPY.colunas.origem}</TableHead>
              <TableHead className={TH_CLASSES}>
                {MATRIZ_COPY.colunas.ultimaAlteracao}
              </TableHead>
              <TableHead className={cn(TH_CLASSES, 'text-right')}>
                <span className="sr-only">{MATRIZ_COPY.colunas.acoes}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha) => {
              const bloqueada = !linha.definida || !onEditar
              return (
                <TableRow key={linha.etapa} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-base font-medium whitespace-nowrap text-white">
                    {linha.rotulo}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {linha.janelaMeses === null
                      ? MATRIZ_COPY.janelaNaoDefinida
                      : MATRIZ_COPY.janelaMeses(linha.janelaMeses)}
                  </TableCell>
                  <TableCell
                    className={cn(CELULA_TRUNCADA, 'text-white/80')}
                    title={linha.alteradoPorNome ?? undefined}
                  >
                    {rotularOrigem(linha)}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {rotularUltimaAlteracao(linha)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      disabled={bloqueada}
                      aria-disabled={bloqueada || undefined}
                      title={!linha.definida ? MATRIZ_COPY.acaoIndisponivel : undefined}
                      onClick={() => onEditar?.(linha)}
                      className={cn(
                        'text-accent inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-sm font-semibold transition-colors hover:bg-white/10',
                        bloqueada && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                      )}
                    >
                      {MATRIZ_COPY.acao}
                    </button>
                    {!linha.definida ? (
                      <span className="sr-only">{MATRIZ_COPY.acaoIndisponivel}</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </AsyncState>
  )
}
