/**
 * /rh/pedidos-dados — a fila de supervisão dos pedidos de cópia de dados (EXPORT-05,
 * LGPD Art. 18, II · prazo do Art. 19, II).
 *
 * A superfície RH net-new da Phase 44: onde o pedido de cópia do candidato deixa de ser
 * uma linha em `solicitacoes_dados` e passa a ser trabalho visível, com o prazo de 15
 * dias corridos medido a partir do momento do pedido. Esqueleto clonado da
 * `RevisoesRHPage` — `RHLayout` + `GlassCard`, sem autorar shell RH nova.
 *
 * ── ÂNCORA VISUAL DECLARADA (44-UI-SPEC §Âncora visual primária) ───────────────────
 * **A TABELA é a âncora primária desta tela.** O H1, o subtítulo, o banner de escopo, a
 * nota de ordenação e o `Switch` são SECUNDÁRIOS: vivem numa faixa de controles compacta,
 * **não ganham card próprio** e **não podem empurrar a primeira linha da tabela para fora
 * da dobra em 1366×768**. Isto está escrito aqui de propósito — é a restrição que uma
 * edição futura mais provavelmente violaria sem perceber, ao acrescentar um card de
 * resumo, um bloco de filtros ou um alerta acima da tabela. O banner de escopo é o único
 * elemento estrutural novo em relação ao análogo, e ele já consome parte dessa margem.
 *
 * ── GATE DE ROTA ─────────────────────────────────────────────────────────────────
 * `RoleGuard role={['rh','administrador']}` — o mesmo wrapper das rotas RH vizinhas, e
 * **não** um gate admin-only, que excluiria todo recrutador (a persona primária desta
 * tela). O gate REAL de dados não é o wrapper: é o predicado de escopo do BD-8
 * reimplementado dentro do `SECURITY DEFINER` das duas RPCs (44-02).
 *
 * ── TIPOGRAFIA (4 tamanhos, 2 pesos — o conjunto declarado da fase) ──────────────
 * 28px/600 no H1 · 20px/600 no título de seção · 16px/400 no corpo e no banner · 14px/600
 * no papel de label (nota de ordenação, rótulo do switch). Nenhum tamanho menor: o papel
 * de 12px seria um quinto tamanho.
 *
 * @module features/pedidos-dados/components/PedidosDadosRHPage
 * @see src/features/revisao/components/RevisoesRHPage.tsx (o esqueleto clonado)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§/rh/pedidos-dados · §UI Considerations E5)
 */
import { useState } from 'react'
import { RHLayout } from '@/components/RHLayout'
import { GlassCard } from '@/components/ui/glass'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FilaPedidosDadosTable } from './FilaPedidosDadosTable'

/** Copy verbatim da 44-UI-SPEC (§/rh/pedidos-dados) — fonte única desta tela. */
const PAGINA_COPY = {
  h1: 'Pedidos de dados',
  subtitulo:
    'Pedidos de cópia dos próprios dados feitos por candidatos (LGPD, Art. 18, II).',
  /**
   * O banner diz a coisa que o operador precisa saber ANTES de olhar a tabela: esta fila
   * é de supervisão, o pedido é atendido pelo próprio candidato no clique, e o que pede
   * alguém aqui é o pedido que NÃO foi atendido. Sempre visível, jamais colapsável —
   * precedente de banner permanente travado na Phase 43.
   */
  banner:
    'Esta fila é de supervisão. O pedido de cópia é atendido pelo próprio candidato, no momento em que ele clica. O que precisa de alguém aqui é o pedido que não foi atendido. A LGPD dá 15 dias corridos para responder a um pedido de acesso (Art. 19, II).',
  tituloSecao: 'Pedidos registrados',
  /**
   * Descreve a ordenação COMPOSTA do servidor — e é ela que torna verdadeiro o aviso de
   * corte da tabela ("todos os não atendidos aparecem"). Mudar uma sem a outra faz a fila
   * mentir por omissão.
   */
  notaOrdenacao:
    'Não atendidos primeiro, do mais antigo para o mais recente. Depois, os atendidos, do mais recente para o mais antigo.',
  rotuloToggle: 'Mostrar só os não atendidos',
} as const

const ID_TOGGLE = 'so-nao-atendidos'

export function PedidosDadosRHPage() {
  // ⚠ DESLIGADO POR PADRÃO SIGNIFICA O CONTRÁRIO DO QUE SIGNIFICA NO ANÁLOGO. Em
  // `/rh/revisoes` o `false` abre a tela FILTRADA (só pendentes), porque a revisão nasce
  // pendente e a tela abre no trabalho. Aqui o `false` abre a VISÃO COMPLETA, porque o
  // pedido de dados nasce ATENDIDO: abrir filtrado mostraria tela vazia em praticamente
  // todo acesso, e uma fila que quase sempre aparece vazia deixa de ser consultada — com
  // ela morre a supervisão inteira. O toggle ISOLA as falhas; ele não é o estado inicial.
  const [soNaoAtendidos, setSoNaoAtendidos] = useState(false)

  return (
    <RHLayout>
      <div className="space-y-6">
        <GlassCard variant="dark" blur="lg" className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              {PAGINA_COPY.h1}
            </h1>
            <p className="text-base text-white/70">{PAGINA_COPY.subtitulo}</p>
          </div>

          {/* Banner de escopo — tratamento neutro de leitura, altura livre, SEM controle
              de colapso. Ele é o único elemento estrutural novo em relação ao análogo. */}
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-base leading-relaxed text-white/80">
              {PAGINA_COPY.banner}
            </p>
          </div>

          <h2 className="text-xl font-semibold text-white">{PAGINA_COPY.tituloSecao}</h2>

          {/* Faixa de controles COMPACTA — secundária à tabela por desenho. O
              `flex-wrap` deixa a nota e o toggle quebrarem para duas linhas em viewport
              estreito, idioma verbatim da `RevisoesRHPage`. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white/50">
              {PAGINA_COPY.notaOrdenacao}
            </p>
            <div className="flex items-center gap-2">
              <Switch
                id={ID_TOGGLE}
                checked={soNaoAtendidos}
                onCheckedChange={setSoNaoAtendidos}
              />
              <Label htmlFor={ID_TOGGLE} className="text-sm font-semibold text-white/80">
                {PAGINA_COPY.rotuloToggle}
              </Label>
            </div>
          </div>

          <FilaPedidosDadosTable soNaoAtendidos={soNaoAtendidos} />
        </GlassCard>
      </div>
    </RHLayout>
  )
}
