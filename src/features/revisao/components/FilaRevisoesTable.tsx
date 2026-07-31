/**
 * FilaRevisoesTable — a fila de pedidos de revisão de decisão do Art. 20 (REVISAO-02).
 *
 * A âncora visual primária de `/rh/revisoes`: é o objeto que responde à pergunta que traz
 * o RH a esta tela ("o que está esperando minha ação?"). Molde estrutural do
 * `FilaTrabalhoTab` (Phase 34), classe a classe, com três deltas desta fase:
 *
 *  1. CABEÇALHO FIXO + ROLAGEM INTERNA em vez de paginação. Não há paginação no v1 porque
 *     o REVISAO-06 mediu o backlog vivo em PROD ANTES desta tela existir, e o número
 *     dispensa paginar. O corte real é do servidor (`LIMIT 200` dentro da RPC) e a tela
 *     avisa quando o atinge — um corte silencioso seria a fila mentindo por omissão.
 *  2. SETE COLUNAS (as 6 travadas em D-P42-05 + a de ação, com cabeçalho `sr-only`).
 *  3. Dois VAZIOS distintos conforme o toggle. O mesmo vazio para os dois estados
 *     mentiria: "nenhum pendente" com respondidos existindo é uma fila trabalhada;
 *     "nenhum registrado" é uma fila que nunca recebeu pedido. Fatos diferentes.
 *
 * ── O QUE NUNCA APARECE AQUI ──────────────────────────────────────────────────────
 *  · Um UUID como identidade humana (invariante 4): "quem decidiu" sem correspondência em
 *    `usuarios_rh` resolve para "Não identificado" — e NÃO para o travessão genérico das
 *    outras células, porque as duas coisas são diferentes: travessão é "não há valor",
 *    "Não identificado" é "há um autor e não conseguimos nomeá-lo".
 *  · A justificativa INTERNA do recrutador (fica fora da allowlist do serviço).
 *  · A mensagem crua do transporte: o estado de erro sai do `AsyncState` com copy própria.
 *
 * ── O ACOMPANHAMENTO É INTERNO (invariante 1) ─────────────────────────────────────
 * Nenhum valor de faixa, cor, contagem de dias ou rótulo de atraso desta tabela existe em
 * superfície de candidato, e o tooltip do cabeçalho diz explicitamente que o Art. 20 não
 * fixa prazo — o limite é meta da própria equipe.
 *
 * @module features/revisao/components/FilaRevisoesTable
 * @see src/features/funil/components/FilaTrabalhoTab.tsx (o molde estrutural)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Fila RH — /rh/revisoes)
 */
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AsyncState } from '@/components/ui/AsyncState'
import { cn } from '@/components/ui/utils'
import { useFilaRevisoes } from '../hooks/useFilaRevisoes'
import { useConfigSlaRevisao } from '../hooks/useConfigSlaRevisao'
import { diasEmEspera } from '../constants/slaRevisao'
import type { FilaRevisaoRow } from '../services/revisaoService'
import { ResponderRevisaoDialog } from './ResponderRevisaoDialog'
import { RevisaoSlaBadge } from './RevisaoSlaBadge'
import { VereditoBadge } from './VereditoBadge'

/**
 * O cap de leitura do servidor. Espelha o `LIMIT 200` de `listar_revisoes_decisao` — se
 * um lado mudar sem o outro, a tela para de avisar o corte (ou avisa um corte que não
 * houve), e o número aqui é o que a copy do aviso interpola.
 */
const CAP_LEITURA = 200

/** Copy verbatim da 42-UI-SPEC (§Fila RH) — fonte ÚNICA, sem deriva. */
const FILA_COPY = {
  colunas: {
    candidato: 'Candidato',
    vaga: 'Vaga',
    decisao: 'Decisão original',
    quemDecidiu: 'Quem decidiu',
    diasEspera: 'Dias em espera',
    acompanhamento: 'Acompanhamento',
    acoes: 'Ações',
  },
  tooltipAcompanhamento:
    'Acompanhamento interno da equipe. O Art. 20 da LGPD não fixa prazo para a revisão — este limite é definido pela própria equipe e nunca é exibido ao candidato.',
  vazio: {
    pendentes: {
      heading: 'Nenhum pedido de revisão pendente',
      body: 'Quando um candidato solicitar a revisão de uma decisão, o pedido aparece aqui — do mais antigo para o mais recente.',
    },
    todos: {
      heading: 'Nenhum pedido de revisão registrado',
      body: 'Nenhum candidato solicitou revisão de decisão até agora.',
    },
  },
  erro: {
    heading: 'Não foi possível carregar a fila de revisões.',
    generic: 'Verifique sua conexão e tente novamente.',
  },
  naoIdentificado: 'Não identificado',
  semValor: '—',
  acao: {
    responder: 'Responder',
    verResposta: 'Ver resposta',
  },
  /** REVISAO-05: motivo do bloqueio em texto VISÍVEL, sem prometer exceção nem override. */
  guardDecisor: 'Você registrou esta decisão.',
  /** A frase longa do mesmo bloqueio — tooltip E leitura de tela, nunca só tooltip. */
  guardDecisorLongo:
    'Quem registrou a decisão não pode responder à revisão dela. Encaminhe este pedido a outra pessoa do RH ou a um administrador.',
  avisoCorte: `Mostrando os ${CAP_LEITURA} pedidos mais antigos.`,
  decisao: {
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    em_espera: 'Em espera',
  } as Record<string, string>,
} as const

/** Cabeçalho fixo: o sticky vai nas CÉLULAS (com `border-collapse: collapse` do preflight
 *  do Tailwind, sticky em `<thead>`/`<tr>` não gruda). O fundo repete o da linha de
 *  cabeçalho para que as linhas não atravessem o vidro ao rolar. */
const TH_CLASSES =
  'sticky top-0 z-10 bg-white/10 text-sm font-semibold text-white/80 backdrop-blur-sm'

/** Largura máxima por coluna de texto livre — o par obrigatório do `truncate`. */
const CELULA_TRUNCADA = 'max-w-[220px] truncate'

/** Data em `dd/mm/aaaa` (idioma já usado em `SolicitarRevisaoCTA`). */
function formatarData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return FILA_COPY.semValor
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Traduz a decisão original; um valor desconhecido cai no valor cru, nunca em branco. */
function rotularDecisao(decisao: string | null): string {
  if (!decisao) return FILA_COPY.semValor
  return FILA_COPY.decisao[decisao] ?? decisao
}

export interface FilaRevisoesTableProps {
  /** O toggle da página. Participa da query key: são DUAS listas, não uma filtrada. */
  incluirRespondidos: boolean
}

export function FilaRevisoesTable({ incluirRespondidos }: FilaRevisoesTableProps) {
  const { data, isLoading, isError, refetch, isRefetching } = useFilaRevisoes({
    incluirRespondidos,
  })
  // ⚠ O DIÁLOGO VIVE AQUI, NÃO NA PÁGINA (plano 42-10). Até a wave anterior a tabela
  // recebia um `onResponder` opcional e, sem ele, desabilitava a ação — para não oferecer
  // uma afordância falsa enquanto o diálogo não existia. O diálogo existe agora, e é a
  // linha que carrega todo o contexto de que ele precisa (candidato, vaga, decisão
  // original, quem decidiu, pedido feito em, e o resultado quando já respondida). Passar
  // isso por callback obrigaria a página a re-derivar o que a tabela já tem em mãos.
  const [linhaEmFoco, setLinhaEmFoco] = useState<FilaRevisaoRow | null>(null)
  // A config de limiar NUNCA vira estado de erro da tela: `null` já é uma apresentação
  // completa (a faixa degenerada), então nem `isError` nem `isLoading` dela entram aqui.
  const { data: limiares } = useConfigSlaRevisao()

  const linhas = data ?? []
  const vazio = incluirRespondidos ? FILA_COPY.vazio.todos : FILA_COPY.vazio.pendentes

  return (
    <AsyncState
      isLoading={isLoading}
      isError={isError}
      isEmpty={linhas.length === 0}
      onRetry={() => void refetch()}
      retrying={isRefetching}
      copy={{
        empty: { heading: vazio.heading, body: vazio.body },
        error: { heading: FILA_COPY.erro.heading, generic: FILA_COPY.erro.generic },
      }}
    >
      <div className="space-y-2">
        {/* O container de ROLAGEM tem de ser o pai DIRETO da tabela, porque `position:
            sticky` se resolve contra o ancestral que rola. O primitivo `Table` já emite
            esse pai (`data-slot="table-container"`), então a altura máxima e a rolagem
            vertical vão nele por seletor de filho — colocá-las aqui fora deixaria o
            cabeçalho grudado num scrollport que não rola, ou seja, não grudado. */}
        <div className="rounded-xl border border-white/10 [&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
                <TableHead className={TH_CLASSES}>{FILA_COPY.colunas.candidato}</TableHead>
                <TableHead className={TH_CLASSES}>{FILA_COPY.colunas.vaga}</TableHead>
                <TableHead className={TH_CLASSES}>{FILA_COPY.colunas.decisao}</TableHead>
                <TableHead className={TH_CLASSES}>
                  {FILA_COPY.colunas.quemDecidiu}
                </TableHead>
                <TableHead className={TH_CLASSES}>
                  {FILA_COPY.colunas.diasEspera}
                </TableHead>
                <TableHead className={TH_CLASSES}>
                  <span className="inline-flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="cursor-help underline decoration-dotted decoration-white/40 underline-offset-4"
                        >
                          {FILA_COPY.colunas.acompanhamento}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">
                        {FILA_COPY.tooltipAcompanhamento}
                      </TooltipContent>
                    </Tooltip>
                    {/* O mesmo texto em leitura de tela: um tooltip do Radix só monta o
                        conteúdo quando abre, e a 42-UI-SPEC exige que o motivo esteja
                        acessível sem hover. Mesma fonte de copy, zero deriva. */}
                    <span className="sr-only">{FILA_COPY.tooltipAcompanhamento}</span>
                  </span>
                </TableHead>
                <TableHead className={cn(TH_CLASSES, 'text-right')}>
                  <span className="sr-only">{FILA_COPY.colunas.acoes}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha) => {
                const respondida = linha.revisao_respondida_em !== null
                const dias = respondida
                  ? diasEmEspera(
                      linha.revisao_solicitada_em,
                      new Date(linha.revisao_respondida_em as string),
                    )
                  : diasEmEspera(linha.revisao_solicitada_em)
                // Espelho COSMÉTICO do guard REVISAO-05 (mesmo idioma do D-13 em
                // `RHSidebar`): quem impede a ação é o RPC de escrita, nunca a UI. Uma
                // linha JÁ respondida abre em modo somente-leitura, então `pode_responder`
                // falso ali não bloqueia nada — não há o que responder duas vezes.
                const bloqueadaPeloGuard = !respondida && !linha.pode_responder

                const acao = (
                  <button
                    type="button"
                    disabled={bloqueadaPeloGuard}
                    aria-disabled={bloqueadaPeloGuard || undefined}
                    onClick={() => setLinhaEmFoco(linha)}
                    className={cn(
                      'inline-flex min-h-[44px] items-center gap-1 rounded-md px-3 text-sm font-semibold text-accent transition-colors hover:bg-white/10',
                      bloqueadaPeloGuard &&
                        'cursor-not-allowed opacity-60 hover:bg-transparent',
                    )}
                  >
                    {respondida ? FILA_COPY.acao.verResposta : FILA_COPY.acao.responder}
                  </button>
                )

                return (
                  <TableRow
                    key={linha.candidatura_id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell
                      className={cn(CELULA_TRUNCADA, 'text-base font-medium text-white')}
                      title={linha.candidato_nome ?? undefined}
                    >
                      {linha.candidato_nome ?? FILA_COPY.semValor}
                    </TableCell>
                    <TableCell
                      className={cn(CELULA_TRUNCADA, 'text-white/80')}
                      title={linha.vaga_titulo ?? undefined}
                    >
                      {linha.vaga_titulo ?? FILA_COPY.semValor}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {rotularDecisao(linha.decisao)}
                    </TableCell>
                    <TableCell className={cn(CELULA_TRUNCADA, 'text-white/80')}>
                      {linha.decidido_por_nome ?? FILA_COPY.naoIdentificado}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {respondida ? (
                        <span className="text-sm text-white/50">
                          Respondida em {dias}d
                        </span>
                      ) : (
                        `${dias} dias`
                      )}
                    </TableCell>
                    <TableCell>
                      {respondida ? (
                        <div className="space-y-1">
                          <VereditoBadge veredito={linha.revisao_veredito} />
                          <p className="text-sm text-white/50">
                            Respondida em{' '}
                            {formatarData(linha.revisao_respondida_em as string)} por{' '}
                            {linha.respondida_por_nome ?? FILA_COPY.naoIdentificado}
                          </p>
                        </div>
                      ) : (
                        <RevisaoSlaBadge
                          diasEspera={dias}
                          limiares={limiares ?? null}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {bloqueadaPeloGuard ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* Um controle desabilitado engole o foco e o hover, então o
                                wrapper é quem carrega `tabIndex`/`title` — assim o motivo
                                alcança teclado e leitor de tela sem mouse (idioma endurecido
                                em `EditarPapelDialog`). */}
                            <span
                              className="inline-flex"
                              tabIndex={0}
                              aria-disabled="true"
                              title={FILA_COPY.guardDecisorLongo}
                            >
                              {acao}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">
                            {FILA_COPY.guardDecisorLongo}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        acao
                      )}
                      {bloqueadaPeloGuard ? (
                        <>
                          {/* Texto VISÍVEL, curto e fixo — a UI-SPEC exige que o motivo
                              não dependa de hover. A frase longa vai junto em leitura de
                              tela porque o tooltip do Radix só monta ao abrir. */}
                          <p className="text-sm text-white/60">{FILA_COPY.guardDecisor}</p>
                          <span className="sr-only">{FILA_COPY.guardDecisorLongo}</span>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {/* O aviso de corte só é verdadeiro NO cap — abaixo dele a fila está completa. */}
        {linhas.length >= CAP_LEITURA ? (
          <p className="text-sm text-white/60">{FILA_COPY.avisoCorte}</p>
        ) : null}

        <ResponderRevisaoDialog
          linha={linhaEmFoco}
          open={linhaEmFoco !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setLinhaEmFoco(null)
          }}
        />
      </div>
    </AsyncState>
  )
}
