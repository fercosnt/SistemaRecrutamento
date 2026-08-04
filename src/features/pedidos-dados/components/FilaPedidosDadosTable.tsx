/**
 * FilaPedidosDadosTable — a fila de supervisão dos pedidos de cópia de dados (EXPORT-05,
 * LGPD Art. 18, II · prazo do Art. 19, II).
 *
 * Clone estrutural do `FilaRevisoesTable` (Phase 42), classe a classe: `CAP_LEITURA`
 * espelhando o `LIMIT` do servidor, `TH_CLASSES` com o sticky nas CÉLULAS, `CELULA_TRUNCADA`
 * com o `title` obrigatório ao lado, `AsyncState` com copy sobrescrita, a config de SLA
 * lida FORA do carregamento e o aviso de corte renderizado FORA da tabela. O que muda são
 * seis desvios, todos decididos a montante e todos com modo de falha próprio.
 *
 * ── DESVIO 1: ZERO COLUNA DE AÇÃO (Invariante 5 da 44-UI-SPEC) ───────────────────
 * Não há "Atender", "Reenviar", "Gerar cópia" nem "Baixar" — e a ausência é dupla. (i) O
 * atendimento é self-service: não existe código de RH que refaça o export, então um botão
 * seria promessa órfã. (ii) Dar ao RH um caminho para baixar a cópia de um candidato
 * criaria uma SEGUNDA superfície de exfiltração, exatamente a que a autorização own-row da
 * Edge Function existe para fechar. O que a linha que falhou oferece é TEXTO: a causa e o
 * próximo passo humano.
 *
 * ── DESVIO 2: ZERO ACCENT NA LINHA ───────────────────────────────────────────────
 * Consequência declarada da §Color: sem coluna de ação, esta é a primeira tabela do
 * projeto sem nenhum elemento accent na linha. Quem sentir a linha "vazia" e acrescentar
 * um link accent está reintroduzindo a ação que o desvio 1 remove.
 *
 * ── DESVIO 3: 5 COLUNAS, TODAS COM CABEÇALHO VISÍVEL ─────────────────────────────
 * Não há coluna de ações, logo não há cabeçalho `sr-only`.
 *
 * ── DESVIO 4: REALCE ÂMBAR NA LINHA NÃO ATENDIDA, SEMPRE REDUNDANTE ──────────────
 * A palavra no `SituacaoPedidoBadge` é o canal exigido pela Invariante 6; a cor da linha
 * nunca é o único. E o âmbar é do eixo SITUAÇÃO — o vermelho pertence ao eixo
 * ACOMPANHAMENTO (o `RevisaoSlaBadge`). Dois alarmes vermelhos na mesma linha diriam
 * coisas diferentes com a mesma cor, e o operador perderia a distinção que o SC#4 dá.
 *
 * ── DESVIO 5: O TOOLTIP DESTA COLUNA É OUTRO, E A DIFERENÇA É JURÍDICA ───────────
 * ⚠ O tooltip vivo de `/rh/revisoes` NEGA a existência de prazo para a revisão de decisão,
 * e lá isso é verdade — o Art. 20 não estabelece um. Copiá-lo para cá produziria uma
 * afirmação FALSA na tela que o RH usa para decidir sobre prazo legal: o Art. 19, II fixa
 * 15 dias corridos para responder a um pedido de acesso. As duas filas parecem gêmeas e
 * este é o único ponto onde divergem de forma juridicamente relevante.
 *
 * ── DESVIO 6: A `key` DA LINHA É O ID DO PEDIDO ──────────────────────────────────
 * Um pedido de acesso não tem candidatura.
 *
 * ── O QUE ESTA TABELA NUNCA MOSTRA ──────────────────────────────────────────────
 * Mensagem crua do transporte, código HTTP, stack, nome de tabela, caminho de Storage,
 * identificador interno; e-mail, CPF ou documento do candidato; qualquer parte do conteúdo
 * exportado; qualquer caminho de download. A fila é sobre o PEDIDO, não sobre o DADO.
 * Candidato sem nome resolvível → "Não identificado", nunca o UUID e nunca o travessão
 * genérico (que fica para "não há valor", como uma data inválida).
 *
 * @module features/pedidos-dados/components/FilaPedidosDadosTable
 * @see src/features/revisao/components/FilaRevisoesTable.tsx (o molde estrutural)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§/rh/pedidos-dados · §UI Considerations E6)
 */
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
import { RevisaoSlaBadge } from '@/features/revisao/components/RevisaoSlaBadge'
import { useFilaPedidosDados } from '../hooks/useFilaPedidosDados'
import { useConfigSlaDados } from '../hooks/useConfigSlaDados'
import { diasEmEspera } from '../constants/slaDados'
import { traduzirCausa } from '../services/pedidosDadosService'
import { SituacaoPedidoBadge } from './SituacaoPedidoBadge'

/**
 * O cap de leitura do servidor. Espelha o `LIMIT 200` de `listar_pedidos_dados` (44-02) —
 * se um lado mudar sem o outro, a tela para de avisar o corte, ou avisa um corte que não
 * houve. O número aqui é o que a copy do aviso interpola.
 */
const CAP_LEITURA = 200

/** Copy verbatim da 44-UI-SPEC (§/rh/pedidos-dados) — fonte ÚNICA, sem deriva. */
const FILA_COPY = {
  colunas: {
    candidato: 'Candidato',
    solicitadoEm: 'Pedido feito em',
    situacao: 'Situação',
    acompanhamento: 'Acompanhamento',
    oQueAconteceu: 'O que aconteceu',
  },
  tooltipAcompanhamento:
    'Dias corridos desde o pedido. A LGPD dá 15 dias corridos para responder a um pedido de acesso (Art. 19, II). Os limiares de atenção e atraso desta coluna ficam abaixo desse teto e são definidos pela equipe, para avisar antes do fim. Sem configuração legível, a coluna mostra apenas a contagem de dias.',
  vazio: {
    completa: {
      heading: 'Nenhum pedido de dados registrado',
      body: 'Quando um candidato pedir uma cópia dos próprios dados, o pedido aparece aqui.',
    },
    soNaoAtendidos: {
      heading: 'Nenhum pedido ficou sem atendimento',
      body: 'Todos os pedidos registrados foram atendidos no mesmo momento em que foram feitos.',
    },
  },
  erro: {
    heading: 'Não foi possível carregar a fila de pedidos de dados.',
    generic: 'Verifique sua conexão e tente novamente.',
  },
  naoIdentificado: 'Não identificado',
  semValor: '—',
  /** A copy do caminho feliz é DESTA tabela, não de `traduzirCausa` (fronteira do 44-08). */
  entregue: (quando: string) => `Cópia entregue em ${quando}.`,
  /** Segunda linha em TODA linha não atendida — é o que a Invariante 5 dá no lugar de um botão. */
  proximoPasso: 'Atender pelo Encarregado de Dados e responder ao titular.',
  atendimento: {
    mesmoDia: 'Atendido no mesmo dia',
    umDia: 'Atendido em 1 dia',
    plural: (n: number) => `Atendido em ${n} dias`,
  },
  avisoCorte: `Mostrando ${CAP_LEITURA} pedidos. Todos os não atendidos aparecem; os atendidos mais antigos podem ter ficado de fora.`,
} as const

/** Cabeçalho fixo: o sticky vai nas CÉLULAS (com `border-collapse: collapse` do preflight
 *  do Tailwind, sticky em `<thead>`/`<tr>` não gruda). O fundo repete o da linha de
 *  cabeçalho para que as linhas não atravessem o vidro ao rolar. */
const TH_CLASSES =
  'sticky top-0 z-10 bg-white/10 text-sm font-semibold text-white/80 backdrop-blur-sm'

/** Largura máxima por coluna de texto livre — o par obrigatório do `truncate`. */
const CELULA_TRUNCADA = 'max-w-[220px] truncate'

/** Data em `dd/mm/aaaa`; data inválida vira travessão, nunca `Invalid Date`. */
function formatarData(iso: string | null): string {
  if (!iso) return FILA_COPY.semValor
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return FILA_COPY.semValor
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Data + hora em `dd/mm/aaaa às HH:mm` (24 h, pt-BR), mesmo idioma de `formatarData`. */
function formatarDataHora(iso: string | null): string {
  if (!iso) return FILA_COPY.semValor
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return FILA_COPY.semValor
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${formatarData(iso)} às ${hora}`
}

/**
 * As TRÊS formas da copy de atendimento, e as três são obrigatórias.
 *
 * "Atendido em 0d" é inaceitável: com atendimento síncrono o mesmo dia é o caso
 * esmagadoramente mais comum, e um `0d` na tela leria como bug em vez de como sucesso.
 * "1 dias" leria como defeito de interpolação. `null` (atendido sem timestamp legível) cai
 * no travessão — "não há valor" é um fato diferente de "atendido em algum prazo".
 */
function rotularAtendimento(dias: number | null): string {
  if (dias === null) return FILA_COPY.semValor
  if (dias <= 0) return FILA_COPY.atendimento.mesmoDia
  if (dias === 1) return FILA_COPY.atendimento.umDia
  return FILA_COPY.atendimento.plural(dias)
}

export interface FilaPedidosDadosTableProps {
  /**
   * O toggle da página, no domínio da TELA. Participa da query key: são DUAS listas, não
   * uma filtrada. A inversão para o parâmetro do servidor vive uma vez só, no serviço.
   */
  soNaoAtendidos: boolean
}

export function FilaPedidosDadosTable({ soNaoAtendidos }: FilaPedidosDadosTableProps) {
  const { data, isLoading, isError, refetch, isRefetching } = useFilaPedidosDados({
    soNaoAtendidos,
  })
  // A config de limiar NUNCA vira estado de erro nem de carregamento da tela: `null` já é
  // uma apresentação completa (a faixa degenerada), então nem `isError` nem `isLoading`
  // dela entram aqui. Uma célula de configuração ilegível não pode derrubar a fila.
  const { data: limiares } = useConfigSlaDados()

  const linhas = data ?? []
  const vazio = soNaoAtendidos ? FILA_COPY.vazio.soNaoAtendidos : FILA_COPY.vazio.completa

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
            vertical vão nele por seletor de filho. Mantidos mesmo com volume baixo: o
            custo é zero e a alternativa é descobrir a falta deles no dia em que a fila
            crescer. */}
        <div className="rounded-xl border border-white/10 [&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
                <TableHead className={TH_CLASSES}>{FILA_COPY.colunas.candidato}</TableHead>
                <TableHead className={TH_CLASSES}>
                  {FILA_COPY.colunas.solicitadoEm}
                </TableHead>
                <TableHead className={TH_CLASSES}>{FILA_COPY.colunas.situacao}</TableHead>
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
                        conteúdo quando abre, e o teto legal desta coluna não pode
                        depender de hover. Mesma fonte de copy, zero deriva. */}
                    <span className="sr-only">{FILA_COPY.tooltipAcompanhamento}</span>
                  </span>
                </TableHead>
                <TableHead className={TH_CLASSES}>
                  {FILA_COPY.colunas.oQueAconteceu}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha) => {
                // O eixo da linha sai de `situacao`, e tudo o que NÃO é o caminho feliz
                // fechado pede alguém — inclusive um token novo que o servidor venha a
                // introduzir. Errar para o lado da supervisão é o único erro barato aqui:
                // o outro sentido esconderia trabalho com 15 dias correndo.
                const naoAtendido = linha.situacao !== 'atendido'
                // ⚠ Testa LEGIBILIDADE, não veracidade. Com o teste de
                // truthiness, um `atendido_em` não-vazio e ilegível passava:
                // `diasEmEspera` grampeia o `NaN` em 0 e `rotularAtendimento`
                // renderizava "Atendido no mesmo dia" — uma afirmação positiva
                // sobre um carimbo que ninguém conseguiu ler. O docblock de
                // `rotularAtendimento` já dizia que esse caso é o travessão,
                // porque "não há valor" é um fato diferente de "atendido em algum
                // prazo"; só o `null` chegava lá.
                const carimbo = linha.atendido_em ? new Date(linha.atendido_em) : null
                const carimboLegivel =
                  carimbo && !Number.isNaN(carimbo.getTime()) ? carimbo : null
                const diasAtendimento =
                  !naoAtendido && carimboLegivel
                    ? diasEmEspera(linha.solicitado_em, carimboLegivel)
                    : null

                return (
                  <TableRow
                    key={linha.id}
                    className={cn(
                      'border-white/10',
                      naoAtendido
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : 'hover:bg-white/5',
                    )}
                  >
                    <TableCell
                      className={cn(CELULA_TRUNCADA, 'text-base font-medium text-white')}
                      title={linha.candidato_nome ?? undefined}
                    >
                      {linha.candidato_nome ?? FILA_COPY.naoIdentificado}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-white/80">
                      {formatarData(linha.solicitado_em)}
                    </TableCell>
                    <TableCell>
                      <SituacaoPedidoBadge situacao={linha.situacao} />
                    </TableCell>
                    <TableCell>
                      {naoAtendido ? (
                        <RevisaoSlaBadge
                          diasEspera={diasEmEspera(linha.solicitado_em)}
                          limiares={limiares ?? null}
                        />
                      ) : (
                        // Faixa colorida em item já fechado é ruído (regra herdada da 42).
                        <span className="text-sm text-white/50">
                          {rotularAtendimento(diasAtendimento)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {naoAtendido ? (
                        <div className="space-y-1">
                          <p className="text-sm text-white/80">
                            {traduzirCausa(linha.causa)}
                          </p>
                          <p className="text-sm text-white/60">
                            {FILA_COPY.proximoPasso}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-white/80">
                          {FILA_COPY.entregue(formatarDataHora(linha.atendido_em))}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {/* O aviso de corte só é verdadeiro NO cap — abaixo dele a fila está completa. E
            "todos os não atendidos aparecem" só é honesto porque o `ORDER BY` do servidor
            põe os não atendidos primeiro: mudar um sem o outro faz a fila mentir por
            omissão. */}
        {linhas.length >= CAP_LEITURA ? (
          <p className="text-sm text-white/60">{FILA_COPY.avisoCorte}</p>
        ) : null}
      </div>
    </AsyncState>
  )
}
